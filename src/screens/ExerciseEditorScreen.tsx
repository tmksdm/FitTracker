// ==========================================
// Экран «Редактор упражнений»
// Pick-and-place reordering + arrow buttons
// ==========================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ListRenderItemInfo,
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

// ── Drop slot between items ───────────────────────────────
function DropSlot({
  onDrop,
  accentColor,
}: {
  onDrop: () => void;
  accentColor: string;
}) {
  return (
    <TouchableOpacity
      style={styles.dropSlot}
      onPress={onDrop}
      activeOpacity={0.7}
    >
      <View style={styles.dropSlotLineContainer}>
        <View style={[styles.dropSlotLine, { backgroundColor: accentColor }]} />
        <View style={[styles.dropSlotCircle, { backgroundColor: accentColor }]}>
          <MaterialCommunityIcons name="arrow-right" size={14} color={colors.text} />
        </View>
        <View style={[styles.dropSlotLine, { backgroundColor: accentColor }]} />
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────
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

  // Pick-and-place state: index of the picked exercise (null = nothing picked)
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);

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

  // --- Reorder helpers ---

  const applyReorder = async (newList: Exercise[]) => {
    const updates = newList.map((ex, i) => ({ id: ex.id, sortOrder: i + 1 }));
    const updatedList = newList.map((ex, i) => ({ ...ex, sortOrder: i + 1 }));
    setExercises(updatedList);
    await exerciseRepo.updateSortOrders(updates);
  };

  // --- Pick-and-place actions ---

  const handlePickToggle = (index: number) => {
    // Tap same item again → cancel
    if (pickedIndex === index) {
      setPickedIndex(null);
    } else {
      setPickedIndex(index);
    }
  };

  const handleDropAt = async (targetSlotIndex: number) => {
    if (pickedIndex === null) return;

    const newList = [...exercises];
    const [moved] = newList.splice(pickedIndex, 1);

    // After removing, the target index shifts if it was after the picked item
    const insertAt = targetSlotIndex > pickedIndex ? targetSlotIndex - 1 : targetSlotIndex;
    newList.splice(insertAt, 0, moved);

    setPickedIndex(null);
    await applyReorder(newList);
  };

  // --- CRUD actions ---

  const handleEdit = (exercise: Exercise) => {
    if (pickedIndex !== null) return; // Ignore taps while placing
    setEditingExercise(exercise);
    setModalVisible(true);
  };

  const handleAdd = () => {
    setPickedIndex(null);
    setEditingExercise(null);
    setModalVisible(true);
  };

  const handleDelete = (exercise: Exercise) => {
    setPickedIndex(null);
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
      await exerciseRepo.updateExercise(editingExercise.id, data);
    } else {
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

  // --- Build list data with drop slots ---

  // When an item is picked, we insert drop-slot markers between items.
  // Each element is either { type: 'exercise', ... } or { type: 'slot', ... }.

  type ListItem =
    | { type: 'exercise'; exercise: Exercise; index: number }
    | { type: 'slot'; targetIndex: number };

  const buildListData = (): ListItem[] => {
    if (pickedIndex === null) {
      // Normal mode — plain exercise list
      return exercises.map((ex, i) => ({ type: 'exercise' as const, exercise: ex, index: i }));
    }

    // Pick-and-place mode — interleave drop slots
    const items: ListItem[] = [];

    // Slot before the first item (only if picked item is not first)
    if (pickedIndex !== 0) {
      items.push({ type: 'slot', targetIndex: 0 });
    }

    for (let i = 0; i < exercises.length; i++) {
      items.push({ type: 'exercise', exercise: exercises[i], index: i });

      // Slot after this item — but not directly before or after the picked item
      // (dropping there would be a no-op)
      const isPickedOrAdjacentBelow = i === pickedIndex || i === pickedIndex - 1;
      const isLastItem = i === exercises.length - 1;

      if (!isPickedOrAdjacentBelow && !isLastItem) {
        items.push({ type: 'slot', targetIndex: i + 1 });
      }
      // Slot at the very end (only if picked item is not last)
      if (isLastItem && pickedIndex !== exercises.length - 1) {
        items.push({ type: 'slot', targetIndex: exercises.length });
      }
    }

    return items;
  };

  // --- Render ---

  const renderItem = ({ item }: ListRenderItemInfo<ListItem>) => {
    if (item.type === 'slot') {
      return <DropSlot onDrop={() => handleDropAt(item.targetIndex)} accentColor={accentColor} />;
    }

    const { exercise, index } = item;
    const isPicked = pickedIndex === index;
    const isPickMode = pickedIndex !== null;
    const isFirst = index === 0;
    const isLast = index === exercises.length - 1;

    return (
      <View
        style={[
          styles.exerciseRow,
          isPicked && styles.exerciseRowPicked,
          isPicked && { borderColor: accentColor },
          isPickMode && !isPicked && styles.exerciseRowDimmed,
        ]}
      >
        {/* Pick handle + order number */}
        <TouchableOpacity
          style={styles.dragHandle}
          onPress={() => handlePickToggle(index)}
          activeOpacity={0.6}
          hitSlop={4}
        >
          <MaterialCommunityIcons
            name={isPicked ? 'close-circle' : 'drag'}
            size={22}
            color={isPicked ? accentColor : colors.textMuted}
          />
          <Text style={[styles.orderNumber, isPicked && { color: accentColor }]}>
            {index + 1}
          </Text>
        </TouchableOpacity>

        {/* Exercise info — tap to edit */}
        <TouchableOpacity
          style={styles.exerciseInfo}
          onPress={() => handleEdit(exercise)}
          activeOpacity={0.7}
          disabled={isPickMode}
        >
          <View style={styles.exerciseNameRow}>
            <MaterialCommunityIcons
              name={exercise.hasAddedWeight ? 'weight-kilogram' : 'arm-flex'}
              size={18}
              color={isPicked ? accentColor : isPickMode ? colors.textMuted : accentColor}
            />
            <Text
              style={[
                styles.exerciseName,
                isPickMode && !isPicked && styles.textDimmed,
              ]}
              numberOfLines={1}
            >
              {exercise.name}
            </Text>
          </View>

          <View style={styles.exerciseDetails}>
            {exercise.hasAddedWeight ? (
              <Text
                style={[
                  styles.detailText,
                  isPickMode && !isPicked && styles.textDimmed,
                ]}
              >
                {formatWeight(exercise.workingWeight)} · шаг{' '}
                {formatWeight(exercise.weightIncrement)}
              </Text>
            ) : (
              <Text
                style={[
                  styles.detailText,
                  isPickMode && !isPicked && styles.textDimmed,
                ]}
              >
                Без отягощения
              </Text>
            )}
            <Text
              style={[
                styles.detailTextSmall,
                isPickMode && !isPicked && styles.textDimmed,
              ]}
            >
              {exercise.numWorkingSets} подх. · {exercise.minRepsPerSet}–
              {exercise.maxRepsPerSet} повт.
            </Text>
          </View>
        </TouchableOpacity>

        {/* Delete button — hidden in pick mode */}
        {!isPickMode && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(exercise)}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={20}
              color={colors.error}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const listData = buildListData();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (pickedIndex !== null) {
              setPickedIndex(null);
              return;
            }
            navigation.goBack();
          }}
          style={styles.backButton}
          hitSlop={12}
        >
          <MaterialCommunityIcons
            name={pickedIndex !== null ? 'close' : 'arrow-left'}
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          {pickedIndex !== null ? (
            <>
              <Text style={styles.headerTitle}>Перемещение</Text>
              <Text style={[styles.headerSubtitle, { color: accentColor }]}>
                Выберите новое место
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.headerTitle}>Упражнения</Text>
              <Text style={[styles.headerSubtitle, { color: accentColor }]}>
                {dayType?.nameRu ?? ''}
              </Text>
            </>
          )}
        </View>

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
          {pickedIndex !== null
            ? 'Нажмите на полоску между упражнениями — туда переместится выбранное.'
            : 'Нажмите на точки слева для перемещения или на название для редактирования.'}
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
          data={listData}
          renderItem={renderItem}
          keyExtractor={(item) =>
            item.type === 'exercise' ? item.exercise.id : `slot-${item.targetIndex}`
          }
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          extraData={pickedIndex}
        />
      )}

      {/* Add button — hidden in pick mode */}
      {pickedIndex === null && (
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
      )}

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

// ── Styles ────────────────────────────────────────────────
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

  // ── Exercise row ──
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    paddingLeft: spacing.sm,
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  exerciseRowPicked: {
    backgroundColor: colors.surfaceLight,
    // borderColor set dynamically via style prop
  },
  exerciseRowDimmed: {
    opacity: 0.5,
  },

  // ── Drag handle ──
  dragHandle: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },

  // ── Order controls (arrows) ──
  orderNumber: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },

  // ── Exercise info ──
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
  textDimmed: {
    color: colors.textMuted,
  },

  // ── Delete button ──
  deleteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Drop slot ──
  dropSlot: {
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  dropSlotLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropSlotLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },
  dropSlotCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xs,
  },

  // ── Misc ──
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
