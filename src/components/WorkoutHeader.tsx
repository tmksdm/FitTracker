// ==========================================
// Active workout header with elapsed time and controls
// ==========================================

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { WorkoutSession, DayType } from '../types';
import { colors, spacing, fontSize, borderRadius, getDayTypeColor } from '../theme';

interface WorkoutHeaderProps {
  session: WorkoutSession;
  dayType: DayType | undefined;
  exercisesDone: number;
  exercisesTotal: number;
  onFinish: () => void;
  onCancel: () => void;
}

function formatElapsed(startIso: string, endIso: string | null): string {
  const startMs = new Date(startIso).getTime();
  const endMs = endIso ? new Date(endIso).getTime() : Date.now();
  const diffSec = Math.max(0, Math.floor((endMs - startMs) / 1000));

  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function WorkoutHeader({
  session,
  dayType,
  exercisesDone,
  exercisesTotal,
  onFinish,
  onCancel,
}: WorkoutHeaderProps) {
  const [elapsed, setElapsed] = useState('0:00');

  // Update elapsed time every second (stops when timeEnd is set)
  useEffect(() => {
    setElapsed(formatElapsed(session.timeStart, session.timeEnd ?? null));

    // If timeEnd is set, time is frozen — no interval needed
    if (session.timeEnd) return;

    const interval = setInterval(() => {
      setElapsed(formatElapsed(session.timeStart, null));
    }, 1000);
    return () => clearInterval(interval);
  }, [session.timeStart, session.timeEnd]);

  const accentColor = dayType ? getDayTypeColor(dayType.id) : colors.primary;
  const directionLabel = session.direction === 'normal' ? 'Прямой' : 'Обратный';

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {/* Cancel button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="close"
            size={22}
            color={colors.error}
          />
        </TouchableOpacity>

        {/* Day type name and direction */}
        <View style={styles.titleSection}>
          <Text style={[styles.dayName, { color: accentColor }]} numberOfLines={1}>
            {dayType?.nameRu ?? 'Тренировка'}
          </Text>
          <Text style={styles.direction}>{directionLabel}</Text>
        </View>

        {/* Finish button */}
        <TouchableOpacity
          style={styles.finishButton}
          onPress={onFinish}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="flag-checkered"
            size={20}
            color={colors.text}
          />
          <Text style={styles.finishText}>Завершить</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomRow}>
        {/* Timer */}
        <View style={styles.stat}>
          <MaterialCommunityIcons
            name="timer-outline"
            size={16}
            color={colors.textMuted}
          />
          <Text style={styles.statValue}>{elapsed}</Text>
        </View>

        {/* Progress */}
        <View style={styles.stat}>
          <MaterialCommunityIcons
            name="checkbox-multiple-marked-outline"
            size={16}
            color={colors.textMuted}
          />
          <Text style={styles.statValue}>
            {exercisesDone}/{exercisesTotal}
          </Text>
        </View>

        {/* Body weight if available */}
        {session.weightBefore !== null && (
          <View style={styles.stat}>
            <MaterialCommunityIcons
              name="scale-bathroom"
              size={16}
              color={colors.textMuted}
            />
            <Text style={styles.statValue}>{session.weightBefore} кг</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cancelButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.error + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  titleSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  dayName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  direction: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  finishText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontVariant: ['tabular-nums'],
  },
});
