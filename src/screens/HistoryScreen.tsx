// ==========================================
// Экран «История» — список тренировок
// ==========================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius, getDayTypeColor } from '../theme';
import { useAppStore } from '../stores/appStore';
import { workoutRepo } from '../db';
import type { WorkoutSession, DayTypeId } from '../types';
import type { RootStackParamList } from '../navigation/types';

type HistoryNavProp = NativeStackNavigationProp<RootStackParamList>;

// ---- Filter chips ----

type FilterOption = 'all' | 1 | 2 | 3;

const FILTER_OPTIONS: { key: FilterOption; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 1, label: 'Присед' },
  { key: 2, label: 'Тяга' },
  { key: 3, label: 'Жим' },
];

// ---- Formatting helpers ----

/** Format date as "5 мар" or "5 мар 2024" if different year */
function formatShortDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/** Format weekday as "Пн", "Вт", etc. */
function formatWeekday(isoString: string): string {
  const date = new Date(isoString);
  const weekday = date.toLocaleDateString('ru-RU', { weekday: 'short' });
  // Capitalize first letter
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

/** Format duration from two ISO strings */
function formatDuration(start: string, end: string | null): string {
  if (!end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const totalMin = Math.round(ms / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0) return `${hours}ч ${mins}мин`;
  return `${mins} мин`;
}

/** Format kg: no thousands separator, Russian comma for decimals */
function formatKg(kg: number): string {
  if (kg === 0) return '—';
  if (Number.isInteger(kg)) return `${kg} кг`;
  return `${kg.toString().replace('.', ',')} кг`;
}

/** Format body weight with Russian comma */
function formatWeight(w: number | null): string {
  if (w === null) return '—';
  if (Number.isInteger(w)) return `${w}`;
  return w.toString().replace('.', ',');
}

/** Calculate average body weight display */
function avgWeightDisplay(before: number | null, after: number | null): string {
  if (before !== null && after !== null) {
    const avg = (before + after) / 2;
    return `${formatWeight(avg)} кг`;
  }
  if (before !== null) return `${formatWeight(before)} кг`;
  if (after !== null) return `${formatWeight(after)} кг`;
  return '—';
}

// ---- Group sessions by month ----

interface MonthGroup {
  key: string;       // "2026-03" for sorting
  label: string;     // "Март 2026"
  sessions: WorkoutSession[];
}

function groupByMonth(sessions: WorkoutSession[]): MonthGroup[] {
  const map = new Map<string, MonthGroup>();

  for (const session of sessions) {
    const date = new Date(session.date);
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-based
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;

    if (!map.has(key)) {
      const label = date.toLocaleDateString('ru-RU', {
        month: 'long',
        year: 'numeric',
      });
      // Capitalize first letter
      const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
      map.set(key, { key, label: capitalizedLabel, sessions: [] });
    }

    map.get(key)!.sessions.push(session);
  }

  // Already sorted by date DESC from DB, so groups are in order
  return Array.from(map.values());
}

// ---- Workout row component ----

interface WorkoutRowProps {
  session: WorkoutSession;
  dayTypeName: string;
  onPress: () => void;
}

function WorkoutRow({ session, dayTypeName, onPress }: WorkoutRowProps) {
  const accentColor = getDayTypeColor(session.dayTypeId);

  return (
    <TouchableOpacity
      style={rowStyles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Left color strip */}
      <View style={[rowStyles.colorStrip, { backgroundColor: accentColor }]} />

      {/* Main content */}
      <View style={rowStyles.content}>
        {/* Top row: day type name + date */}
        <View style={rowStyles.topRow}>
          <Text style={[rowStyles.dayName, { color: accentColor }]}>
            {dayTypeName}
          </Text>
          <Text style={rowStyles.date}>
            {formatWeekday(session.date)}, {formatShortDate(session.date)}
          </Text>
        </View>

        {/* Bottom row: stats */}
        <View style={rowStyles.statsRow}>
          <View style={rowStyles.stat}>
            <MaterialCommunityIcons
              name="weight"
              size={14}
              color={colors.textMuted}
            />
            <Text style={rowStyles.statText}>{formatKg(session.totalKg)}</Text>
          </View>

          <View style={rowStyles.stat}>
            <MaterialCommunityIcons
              name="timer-outline"
              size={14}
              color={colors.textMuted}
            />
            <Text style={rowStyles.statText}>
              {formatDuration(session.timeStart, session.timeEnd)}
            </Text>
          </View>

          <View style={rowStyles.stat}>
            <MaterialCommunityIcons
              name="scale-bathroom"
              size={14}
              color={colors.textMuted}
            />
            <Text style={rowStyles.statText}>
              {avgWeightDisplay(session.weightBefore, session.weightAfter)}
            </Text>
          </View>

          <View style={rowStyles.directionBadge}>
            <MaterialCommunityIcons
              name={session.direction === 'normal' ? 'arrow-right' : 'arrow-left'}
              size={12}
              color={colors.textMuted}
            />
          </View>
        </View>
      </View>

      {/* Chevron */}
      <MaterialCommunityIcons
        name="chevron-right"
        size={24}
        color={colors.textMuted}
      />
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  colorStrip: {
    width: 4,
    alignSelf: 'stretch',
  },
  content: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayName: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  date: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  directionBadge: {
    marginLeft: 'auto',
  },
});

// ---- Main Screen ----

export default function HistoryScreen() {
  const navigation = useNavigation<HistoryNavProp>();
  const dayTypes = useAppStore((s) => s.dayTypes);

  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [filter, setFilter] = useState<FilterOption>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const all = await workoutRepo.getAllSessions();
      setSessions(all);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }, []);

  // Load on focus
  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadSessions().finally(() => setIsLoading(false));
    }, [loadSessions])
  );

  // Pull-to-refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadSessions();
    setIsRefreshing(false);
  };

  // Apply filter
  const filteredSessions =
    filter === 'all'
      ? sessions
      : sessions.filter((s) => s.dayTypeId === filter);

  const monthGroups = groupByMonth(filteredSessions);

  const getDayTypeName = (dayTypeId: DayTypeId): string => {
    return dayTypes.find((dt) => dt.id === dayTypeId)?.nameRu ?? 'Тренировка';
  };

  const handleSessionPress = (sessionId: string) => {
    navigation.navigate('WorkoutDetail', { sessionId });
  };

  // ---- Render ----

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>История</Text>
        <Text style={styles.subtitle}>
          {sessions.length}{' '}
          {sessions.length === 1
            ? 'тренировка'
            : sessions.length >= 2 && sessions.length <= 4
            ? 'тренировки'
            : 'тренировок'}
        </Text>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map((opt) => {
          const isActive = filter === opt.key;
          const chipColor =
            opt.key === 'all'
              ? colors.primary
              : getDayTypeColor(opt.key as number);

          return (
            <TouchableOpacity
              key={String(opt.key)}
              style={[
                styles.filterChip,
                isActive && { backgroundColor: chipColor + '30', borderColor: chipColor },
              ]}
              onPress={() => setFilter(opt.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isActive && { color: chipColor },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Session list */}
      {filteredSessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="clipboard-text-outline"
            size={48}
            color={colors.textMuted}
          />
          <Text style={styles.emptyText}>
            {filter === 'all'
              ? 'Нет записанных тренировок'
              : 'Нет тренировок этого типа'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={monthGroups}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item: group }) => (
            <View style={styles.monthGroup}>
              {/* Month header */}
              <View style={styles.monthHeader}>
                <Text style={styles.monthLabel}>{group.label}</Text>
                <Text style={styles.monthCount}>
                  {group.sessions.length}{' '}
                  {group.sessions.length === 1
                    ? 'тренировка'
                    : group.sessions.length >= 2 && group.sessions.length <= 4
                    ? 'тренировки'
                    : 'тренировок'}
                </Text>
              </View>

              {/* Sessions in this month */}
              <View style={styles.monthSessions}>
                {group.sessions.map((session) => (
                  <WorkoutRow
                    key={session.id}
                    session={session}
                    dayTypeName={getDayTypeName(session.dayTypeId)}
                    onPress={() => handleSessionPress(session.id)}
                  />
                ))}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ---- Styles ----

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },

  // Filter chips
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },

  // List
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  monthGroup: {
    marginBottom: spacing.lg,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  monthLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  monthCount: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  monthSessions: {
    gap: spacing.sm,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
});
