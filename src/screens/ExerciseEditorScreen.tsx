// ==========================================
// Экран «Редактор упражнений»
// ==========================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Exercise, DayTypeId } from '../types';
import { exerciseRepo } from '../db';
import { useAppStore } from '../stores/appStore';
import { ExerciseEditModal } from '../components';
import {
  colors,
  spacing,
  fontSize,
  borderRadius,
  touchTarget,
  getDayTypeColor,
} from '../theme';
import type { RootStackParamList } from '../navigation/types';

type EditorRouteProp = RouteProp<RootStackParamList, 'ExerciseEditor'>;
type EditorNavProp = NativeStackNavigationProp<RootStackParamList>;

// Format weight with Russian comma
function formatWeight(w: number | null): string {
  if (w == null) return '—';
  return String(w).replace('.', ',') + ' кг';
}

export default function ExerciseEditorScreen() {
  const route = useRoute<EditorRouteProp>();
  const navigation = useNavigation<EditorNavProp>();
  const dayTypeId = route.params.dayTypeId as DayTypeId;

  const dayTypes = useAppStore((s) => s.dayTypes);
  const dayType = dayTypes.find((dt) => dt.id === dayTypeId);
  const accentColor = getDayTypeColor(dayTypeId);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  // Load exercises
  const loadExercises = useCallback(async () => {
    try {
      const data = await exerciseRepo.getExercisesByDayType(dayTypeId);
      setExercises(data);
    } catch (error) {
      console.error('Failed to load exercises:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dayTypeId]);

  useFocusEffect(
    useCallback(() => {
      loadExercises();
    }, [loadExercises])
  );

  // --- Actions ---

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newList = [...exercises];
    const temp = newList[index];
    newList[index] = newList[index - 1];
    newList[index - 1] = temp;

    // Update sort orders
    const updates = newList.map((ex, i) => ({
      id: ex.id,
      sortOrder: i + 1,
    }));

    // Optimistic update
    const updatedList = newList.map((ex, i) => ({ ...ex, sortOrder: i + 1 }));
    setExercises(updatedList);

    await exerciseRepo.updateSortOrders(updates);
  };

  const handleMoveDown = async (index: number) => {
    if (index === exercises.length - 1) return;
    const newList = [...exercises];
    const temp = newList[index];
    newList[index] = newList[index + 1];
    newList[index + 1] = temp;

    const updates = newList.map((ex, i) => ({
      id: ex.id,
      sortOrder: i + 1,
    }));

    const updatedList = newList.map((ex, i) => ({ ...ex, sortOrder: i + 1 }));
    setExercises(updatedList);

    await exerciseRepo.updateSortOrders(updates);
  };

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setModalVisible(true);
  };

  const handleAdd = () => {
    setEditingExercise(null);
    setModalVisible(true);
  };

  const handleDelete = (exercise: Exercise) => {
    Alert.alert(
      'Удалить упражнение?',
      `«${exercise.name}» будет скрыто из списка. Историю можно будет посмотреть.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            await exerciseRepo.deactivateExercise(exercise.id);
            await loadExercises();
          },
        },
      ]
    );
  };

  const handleSave = async (data: Partial<Exercise> & { name: string }) => {
    if (editingExercise) {
      // Update existing
      await exerciseRepo.updateExercise(editingExercise.id, data);
    } else {
      // Create new — put at the end
      const maxOrder = await exerciseRepo.getMaxSortOrder(dayTypeId);
      await exerciseRepo.createExercise({
        dayTypeId,
        name: data.name,
        sortOrder: maxOrder + 1,
        hasAddedWeight: data.hasAddedWeight ?? true,
        workingWeight: data.workingWeight ?? null,
        weightIncrement: data.weightIncrement ?? 2.5,
        warmup1Percent: data.warmup1Percent ?? 60,
        warmup2Percent: data.warmup2Percent ?? 80,
        warmup1Reps: data.warmup1Reps ?? 12,
        warmup2Reps: data.warmup2Reps ?? 10,
        maxRepsPerSet: data.maxRepsPerSet ?? 8,
        minRepsPerSet: data.minRepsPerSet ?? 4,
        numWorkingSets: data.numWorkingSets ?? 3,
        isTimed: false,
        timerDurationSeconds: null,
        timerPrepSeconds: null,
        isActive: true,
      });
    }

    setModalVisible(false);
    setEditingExercise(null);
    await loadExercises();
  };

  const handleCancelModal = () => {
    setModalVisible(false);
    setEditingExercise(null);
  };

  // --- Render ---

  const renderExerciseItem = ({
    item,
    index,
  }: {
    item: Exercise;
    index: number;
  }) => {
    const isFirst = index === 0;
    const isLast = index === exercises.length - 1;

    return (
      <View style={styles.exerciseRow}>
        {/* Order controls */}
        <View style={styles.orderControls}>
          <TouchableOpacity
            onPress={() => handleMoveUp(index)}
            disabled={isFirst}
            style={[styles.arrowButton, isFirst && styles.arrowButtonDisabled]}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="chevron-up"
              size={22}
              color={isFirst ? colors.textMuted : colors.textSecondary}
            />
          </TouchableOpacity>

          <Text style={styles.orderNumber}>{index + 1}</Text>

          <TouchableOpacity
            onPress={() => handleMoveDown(index)}
            disabled={isLast}
            style={[styles.arrowButton, isLast && styles.arrowButtonDisabled]}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="chevron-down"
              size={22}
              color={isLast ? colors.textMuted : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Exercise info — tap to edit */}
        <TouchableOpacity
          style={styles.exerciseInfo}
          onPress={() => handleEdit(item)}
          activeOpacity={0.7}
        >
          <View style={styles.exerciseNameRow}>
            <MaterialCommunityIcons
              name={item.hasAddedWeight ? 'weight-kilogram' : 'arm-flex'}
              size={18}
              color={accentColor}
            />
            <Text style={styles.exerciseName} numberOfLines={1}>
              {item.name}
            </Text>
          </View>

          <View style={styles.exerciseDetails}>
            {item.hasAddedWeight ? (
              <Text style={styles.detailText}>
                {formatWeight(item.workingWeight)} · шаг {formatWeight(item.weightIncrement)}
              </Text>
            ) : (
              <Text style={styles.detailText}>Без отягощения</Text>
            )}
            <Text style={styles.detailTextSmall}>
              {item.numWorkingSets} подх. · {item.minRepsPerSet}–{item.maxRepsPerSet} повт.
            </Text>
          </View>
        </TouchableOpacity>

        {/* Delete button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}
          hitSlop={8}
        >
          <MaterialCommunityIcons
            name="trash-can-outline"
            size={20}
            color={colors.error}
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={12}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Упражнения</Text>
          <Text style={[styles.headerSubtitle, { color: accentColor }]}>
            {dayType?.nameRu ?? ''}
          </Text>
        </View>

        {/* Spacer to keep title centered */}
        <View style={styles.headerSpacer} />
      </View>

      {/* Hint */}
      <View style={styles.hintRow}>
        <MaterialCommunityIcons
          name="information-outline"
          size={16}
          color={colors.textMuted}
        />
        <Text style={styles.hintText}>
          Нажмите на упражнение для редактирования. Стрелками меняйте порядок.
        </Text>
      </View>

      {/* Exercise list */}
      {isLoading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Загрузка...</Text>
        </View>
      ) : exercises.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="dumbbell"
            size={48}
            color={colors.textMuted}
          />
          <Text style={styles.emptyText}>Нет упражнений</Text>
          <Text style={styles.emptySubtext}>
            Добавьте первое упражнение кнопкой ниже
          </Text>
        </View>
      ) : (
        <FlatList
          data={exercises}
          renderItem={renderExerciseItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Add button */}
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: accentColor }]}
        onPress={handleAdd}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons
          name="plus"
          size={24}
          color={colors.textOnPrimary}
        />
        <Text style={styles.addButtonText}>Добавить упражнение</Text>
      </TouchableOpacity>

      {/* Edit/Add modal */}
      <ExerciseEditModal
        visible={modalVisible}
        exercise={editingExercise}
        dayTypeId={dayTypeId}
        onSave={handleSave}
        onCancel={handleCancelModal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  hintText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  orderControls: {
    alignItems: 'center',
    width: 36,
  },
  arrowButton: {
    padding: 2,
  },
  arrowButtonDisabled: {
    opacity: 0.3,
  },
  orderNumber: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  exerciseInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  exerciseName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
    flex: 1,
  },
  exerciseDetails: {
    gap: 2,
  },
  detailText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  detailTextSmall: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  deleteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  emptySubtext: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: touchTarget.comfortable,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  addButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
