// ==========================================
// Экран «Главная» — дашборд
// ==========================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../stores/appStore';
import { useWorkoutStore } from '../stores/workoutStore';
import { workoutStateRepo } from '../db';
import { DayTypeCard, LastWorkoutCard, StartWorkoutModal } from '../components';
import { colors, spacing, fontSize, borderRadius, touchTarget, getDayTypeColor } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type HomeNavProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();

  // App store
  const dayTypes = useAppStore((s) => s.dayTypes);
  const nextDayTypeId = useAppStore((s) => s.nextDayTypeId);
  const nextDirection = useAppStore((s) => s.nextDirection);
  const lastSession = useAppStore((s) => s.lastSession);
  const refreshNextDayInfo = useAppStore((s) => s.refreshNextDayInfo);
  const pendingRestore = useAppStore((s) => s.pendingRestore);
  const clearPendingRestore = useAppStore((s) => s.clearPendingRestore);

  // Workout store
  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const restoreWorkout = useWorkoutStore((s) => s.restoreWorkout);
  const isWorkoutActive = useWorkoutStore((s) => s.isActive);
  const cancelWorkout = useWorkoutStore((s) => s.cancelWorkout);

  // Local state
  const [showModal, setShowModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshNextDayInfo();
    }, [])
  );

  // Show restore dialog if there's a pending workout from a crash
  useEffect(() => {
    if (pendingRestore && !isWorkoutActive) {
      const dayType = dayTypes.find(
        (dt) => dt.id === pendingRestore.session.dayTypeId
      );
      const dayName = dayType?.nameRu ?? 'Тренировка';

      // Count completed exercises for context
      const done = pendingRestore.exercises.filter(
        (e) => e.status === 'completed'
      ).length;
      const total = pendingRestore.exercises.length;

      Alert.alert(
        'Незавершённая тренировка',
        `${dayName} — выполнено ${done} из ${total} упражнений.\n\nПродолжить с того места, где остановились?`,
        [
          {
            text: 'Удалить',
            style: 'destructive',
            onPress: async () => {
              // Delete the orphaned session and clear state
              try {
                await cancelWorkout();
              } catch {
                // cancelWorkout handles cleanup internally
              }
              clearPendingRestore();
              await refreshNextDayInfo();
            },
          },
          {
            text: 'Продолжить',
            style: 'default',
            onPress: () => {
              restoreWorkout(pendingRestore);
              clearPendingRestore();
              navigation.navigate('ActiveWorkout');
            },
          },
        ],
        { cancelable: false }
      );
    }
  }, [pendingRestore, isWorkoutActive]);

  // Pull-to-refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshNextDayInfo();
    setIsRefreshing(false);
  };

  // Start workout flow
  const handleStartPress = () => {
    if (isWorkoutActive) {
      // Resume existing workout
      navigation.navigate('ActiveWorkout');
      return;
    }
    setShowModal(true);
  };

  const handleStartWorkout = async (weightBefore: number | null) => {
    setShowModal(false);
    await startWorkout(nextDayTypeId, nextDirection, weightBefore);
    navigation.navigate('ActiveWorkout');
  };

  const handleCancelModal = () => {
    setShowModal(false);
  };

  const handleEditExercises = () => {
    navigation.navigate('ExerciseEditor', { dayTypeId: nextDayTypeId });
  };

  const dayType = dayTypes.find((dt) => dt.id === nextDayTypeId);
  const accentColor = getDayTypeColor(nextDayTypeId);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>FitTracker</Text>
          <MaterialCommunityIcons
            name="dumbbell"
            size={24}
            color={colors.primary}
          />
        </View>

        {/* Next day type card */}
        <DayTypeCard
          dayTypes={dayTypes}
          nextDayTypeId={nextDayTypeId}
          nextDirection={nextDirection}
        />

        {/* Action buttons row */}
        <View style={styles.actionRow}>
          {/* Start / Resume button */}
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: accentColor }]}
            onPress={handleStartPress}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name={isWorkoutActive ? 'arrow-right-circle' : 'play-circle'}
              size={28}
              color={colors.textOnPrimary}
            />
            <Text style={styles.startButtonText}>
              {isWorkoutActive ? 'Продолжить' : 'Начать тренировку'}
            </Text>
          </TouchableOpacity>

          {/* Edit exercises button */}
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditExercises}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="playlist-edit"
              size={24}
              color={accentColor}
            />
          </TouchableOpacity>
        </View>

        {/* Last workout card */}
        {lastSession ? (
          <LastWorkoutCard session={lastSession} dayTypes={dayTypes} />
        ) : (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons
              name="information-outline"
              size={32}
              color={colors.textMuted}
            />
            <Text style={styles.emptyText}>
              Нет записанных тренировок
            </Text>
            <Text style={styles.emptySubtext}>
              Нажмите «Начать тренировку», чтобы создать первую запись
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Start workout modal */}
      <StartWorkoutModal
        visible={showModal}
        dayTypeName={dayType?.nameRu ?? ''}
        onStart={handleStartWorkout}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appTitle: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  startButton: {
    flex: 1,
    height: touchTarget.large,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  startButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  editButton: {
    width: touchTarget.large,
    height: touchTarget.large,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
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
    textAlign: 'center',
  },
});
