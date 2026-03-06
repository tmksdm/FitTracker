// ==========================================
// Карточка последней тренировки
// ==========================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { WorkoutSession, DayType } from '../types';
import { colors, spacing, fontSize, borderRadius } from '../theme';

interface LastWorkoutCardProps {
  session: WorkoutSession;
  dayTypes: DayType[];
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Вчера';
  if (diffDays < 7) return `${diffDays} дн. назад`;

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const totalMin = Math.round(ms / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0) return `${hours}ч ${mins}мин`;
  return `${mins} мин`;
}

/** Format kg with Russian comma as decimal separator, no thousands grouping */
function formatKg(kg: number): string {
  if (kg === 0) return '—';
  // If it's a whole number, no decimal
  if (Number.isInteger(kg)) return `${kg} кг`;
  // Otherwise use comma as decimal separator
  return `${kg.toString().replace('.', ',')} кг`;
}

function calculateAvgWeight(before: number | null, after: number | null): string {
  if (before !== null && after !== null) {
    const avg = (before + after) / 2;
    return formatKg(avg);
  }
  if (before !== null) return formatKg(before);
  if (after !== null) return formatKg(after);
  return '—';
}

interface StatItemProps {
  icon: string;
  label: string;
  value: string;
}

function StatItem({ icon, label, value }: StatItemProps) {
  return (
    <View style={statStyles.container}>
      <MaterialCommunityIcons
        name={icon as any}
        size={18}
        color={colors.textMuted}
      />
      <View>
        <Text style={statStyles.value}>{value}</Text>
        <Text style={statStyles.label}>{label}</Text>
      </View>
    </View>
  );
}

const statStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  value: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
});

export default function LastWorkoutCard({ session, dayTypes }: LastWorkoutCardProps) {
  const dayType = dayTypes.find((dt) => dt.id === session.dayTypeId);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="history"
          size={20}
          color={colors.textSecondary}
        />
        <Text style={styles.headerText}>Последняя тренировка</Text>
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.dayName}>{dayType?.nameRu ?? 'Тренировка'}</Text>
        <Text style={styles.date}>{formatDate(session.date)}</Text>
      </View>

      <View style={styles.statsRow}>
        <StatItem
          icon="timer-outline"
          label="Время"
          value={formatDuration(session.timeStart, session.timeEnd)}
        />
        <StatItem
          icon="weight"
          label="Тоннаж"
          value={formatKg(session.totalKg)}
        />
      </View>

      <View style={styles.statsRow}>
        <StatItem
          icon="scale-bathroom"
          label="Вес тела"
          value={calculateAvgWeight(session.weightBefore, session.weightAfter)}
        />
        <StatItem
          icon="arrow-left-right"
          label="Порядок"
          value={session.direction === 'normal' ? 'Прямой' : 'Обратный'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  dayName: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  date: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
});
