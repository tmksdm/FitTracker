// ==========================================
// Current exercise card with all its sets
// ==========================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActiveExercise } from '../stores/workoutStore';
import SetRow from './SetRow';
import { colors, spacing, fontSize, borderRadius, touchTarget, getDayTypeColor } from '../theme';
import { DayTypeId } from '../types';

interface ExerciseCardProps {
  activeExercise: ActiveExercise;
  exerciseIndex: number;
  dayTypeId: DayTypeId;
  onCompleteSet: (exerciseIndex: number, setIndex: number, actualReps?: number) => void;
  onUpdateSetReps: (exerciseIndex: number, setIndex: number, reps: number) => void;
  onSkip: (exerciseIndex: number) => void;
  onUnskip: (exerciseIndex: number) => void;
}

export default function ExerciseCard({
  activeExercise,
  exerciseIndex,
  dayTypeId,
  onCompleteSet,
  onUpdateSetReps,
  onSkip,
  onUnskip,
}: ExerciseCardProps) {
  const { exercise, sets, status, isPriority } = activeExercise;

  const isSkipped = status === 'skipped';
  const isCompleted = status === 'completed';

  // Count completed working sets
  const workingSets = sets.filter((s) => s.setType === 'working');
  const completedWorkingSets = workingSets.filter((s) => s.isCompleted).length;
  const totalWorkingSets = workingSets.length;

  return (
    <View style={styles.container}>
      {/* Exercise header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {isPriority && (
            <View style={styles.priorityBadge}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={14}
                color={colors.warning}
              />
              <Text style={styles.priorityText}>Приоритет</Text>
            </View>
          )}
          <Text style={styles.exerciseName} numberOfLines={2}>
            {exercise.name}
          </Text>
          <Text style={styles.exerciseInfo}>
            {exercise.hasAddedWeight && exercise.workingWeight
              ? `Рабочий вес: ${exercise.workingWeight} кг`
              : exercise.hasAddedWeight
              ? 'Вес не задан'
              : 'Без отягощения'}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <View
            style={[
              styles.statusBadge,
              isCompleted && { backgroundColor: colors.success + '30' },
              isSkipped && { backgroundColor: colors.error + '30' },
              status === 'in_progress' && { backgroundColor: colors.warning + '30' },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                isCompleted && { color: colors.success },
                isSkipped && { color: colors.error },
                status === 'in_progress' && { color: colors.warning },
              ]}
            >
              {isCompleted
                ? 'Готово'
                : isSkipped
                ? 'Пропущено'
                : status === 'in_progress'
                ? `${completedWorkingSets}/${totalWorkingSets}`
                : 'Не начато'}
            </Text>
          </View>
        </View>
      </View>

      {/* Sets list (hidden when skipped) */}
      {!isSkipped && sets.length > 0 && (
        <View style={styles.setsContainer}>
          {sets.map((set, index) => (
            <SetRow
              key={set.id}
              set={set}
              exerciseIndex={exerciseIndex}
              setIndex={index}
              onComplete={onCompleteSet}
              onUpdateReps={onUpdateSetReps}
            />
          ))}
        </View>
      )}

      {/* Timed exercise info */}
      {exercise.isTimed && (
        <View style={styles.timedInfo}>
          <MaterialCommunityIcons
            name="timer-outline"
            size={20}
            color={colors.textSecondary}
          />
          <Text style={styles.timedText}>
            {exercise.timerPrepSeconds}с подготовка + {exercise.timerDurationSeconds}с упражнение
          </Text>
        </View>
      )}

      {/* Skip button (only for active exercises) */}
      {!isSkipped && !isCompleted && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => onSkip(exerciseIndex)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="skip-next"
            size={18}
            color={colors.error}
          />
          <Text style={styles.skipText}>Пропустить упражнение</Text>
        </TouchableOpacity>
      )}

      {/* Skipped state with restore button */}
      {isSkipped && (
        <View style={styles.skippedSection}>
          <View style={styles.skippedInfo}>
            <MaterialCommunityIcons
              name="close-circle-outline"
              size={32}
              color={colors.error}
            />
            <Text style={styles.skippedText}>
              Упражнение пропущено — будет приоритетным в следующий раз
            </Text>
          </View>

          <TouchableOpacity
            style={styles.unskipButton}
            onPress={() => onUnskip(exerciseIndex)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="undo"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.unskipText}>Вернуть в работу</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  headerRight: {
    justifyContent: 'flex-start',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
  },
  priorityText: {
    color: colors.warning,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exerciseName: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  exerciseInfo: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  statusBadge: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  setsContainer: {
    marginTop: spacing.sm,
  },
  timedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  timedText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  skipText: {
    color: colors.error,
    fontSize: fontSize.sm,
  },
  skippedSection: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  skippedInfo: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  skippedText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  unskipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  unskipText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
