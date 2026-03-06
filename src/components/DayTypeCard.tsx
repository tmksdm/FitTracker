// ==========================================
// Карточка следующего типа тренировочного дня
// ==========================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DayType, DayTypeId, Direction } from '../types';
import { colors, spacing, fontSize, borderRadius, getDayTypeColor } from '../theme';

interface DayTypeCardProps {
  dayTypes: DayType[];
  nextDayTypeId: DayTypeId;
  nextDirection: Direction;
}

function getDayTypeIcon(dayTypeId: DayTypeId): string {
  switch (dayTypeId) {
    case 1: return 'human';           // legs
    case 2: return 'weight-lifter';   // deadlift/back
    case 3: return 'dumbbell';        // bench/chest
    default: return 'dumbbell';
  }
}

export default function DayTypeCard({ dayTypes, nextDayTypeId, nextDirection }: DayTypeCardProps) {
  const dayType = dayTypes.find((dt) => dt.id === nextDayTypeId);
  if (!dayType) return null;

  const accentColor = getDayTypeColor(nextDayTypeId);
  const directionLabel = nextDirection === 'normal' ? 'Прямой' : 'Обратный';
  const directionIcon = nextDirection === 'normal' ? 'arrow-right' : 'arrow-left';

  return (
    <View style={[styles.container, { borderLeftColor: accentColor }]}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name={getDayTypeIcon(nextDayTypeId) as any}
          size={28}
          color={accentColor}
        />
        <Text style={styles.label}>Следующая тренировка</Text>
      </View>

      <Text style={[styles.dayName, { color: accentColor }]}>
        {dayType.nameRu}
      </Text>

      <View style={styles.directionRow}>
        <MaterialCommunityIcons
          name={directionIcon}
          size={18}
          color={colors.textSecondary}
        />
        <Text style={styles.directionText}>
          {directionLabel} порядок упражнений
        </Text>
      </View>

      {/* Cycle indicator */}
      <View style={styles.cycleRow}>
        {dayTypes.map((dt) => (
          <View
            key={dt.id}
            style={[
              styles.cycleDot,
              {
                backgroundColor:
                  dt.id === nextDayTypeId
                    ? getDayTypeColor(dt.id)
                    : colors.surfaceLight,
              },
            ]}
          >
            <Text
              style={[
                styles.cycleDotText,
                {
                  color:
                    dt.id === nextDayTypeId
                      ? colors.textOnPrimary
                      : colors.textMuted,
                },
              ]}
            >
              {dt.id}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dayName: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  directionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  directionText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  cycleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cycleDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleDotText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
