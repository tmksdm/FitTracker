// ==========================================
// Экран итогов тренировки (Workout Summary)
// ==========================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius, touchTarget, getDayTypeColor } from '../theme';
import { useAppStore } from '../stores/appStore';
import { workoutRepo } from '../db';
import type { WorkoutSession, DayType } from '../types';
import type { ExerciseSummary } from '../db/repositories/workoutRepository';
import type { RootStackParamList } from '../navigation/types';

type SummaryNavProp = NativeStackNavigationProp<RootStackParamList>;
type SummaryRouteProp = RouteProp<RootStackParamList, 'WorkoutSummary'>;

// ---- Formatting helpers ----

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
  if (kg === 0) return '0 кг';
  if (Number.isInteger(kg)) return `${kg} кг`;
  return `${kg.toString().replace('.', ',')} кг`;
}

/** Format body weight with Russian comma */
function formatWeight(w: number | null): string {
  if (w === null) return '—';
  if (Number.isInteger(w)) return `${w}`;
  return w.toString().replace('.', ',');
}

/** Format date as "5 марта 2026" */
function formatFullDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Format time as "14:35" */
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Calculate average body weight */
function calcAvgWeight(before: number | null, after: number | null): string {
  if (before !== null && after !== null) {
    const avg = (before + after) / 2;
    return formatWeight(avg);
  }
  if (before !== null) return formatWeight(before);
  if (after !== null) return formatWeight(after);
  return '—';
}

// ---- Sub-components ----

interface SummaryStatProps {
  icon: string;
  label: string;
  value: string;
  color?: string;
}

function SummaryStat({ icon, label, value, color }: SummaryStatProps) {
  return (
    <View style={statStyles.container}>
      <MaterialCommunityIcons
        name={icon as any}
        size={24}
        color={color ?? colors.textMuted}
      />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  value: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
});

interface ExerciseSummaryRowProps {
  summary: ExerciseSummary;
}

function ExerciseSummaryRow({ summary }: ExerciseSummaryRowProps) {
  if (summary.isSkipped) {
    return (
      <View style={exerciseRowStyles.container}>
        <View style={exerciseRowStyles.nameRow}>
          <MaterialCommunityIcons
            name="close-circle"
            size={18}
            color={colors.error}
          />
          <Text style={[exerciseRowStyles.name, { color: colors.textMuted }]}>
            {summary.exerciseName}
          </Text>
        </View>
        <Text style={exerciseRowStyles.skippedText}>Пропущено</Text>
      </View>
    );
  }

  const workingSets = summary.sets.filter((s) => s.setType === 'working');
  const repsDisplay = workingSets.map((s) => s.actualReps).join('+');
  const totalReps = workingSets.reduce((sum, s) => sum + s.actualReps, 0);

  return (
    <View style={exerciseRowStyles.container}>
      <View style={exerciseRowStyles.nameRow}>
        <MaterialCommunityIcons
          name="check-circle"
          size={18}
          color={colors.success}
        />
        <Text style={exerciseRowStyles.name}>{summary.exerciseName}</Text>
      </View>
      <View style={exerciseRowStyles.detailsRow}>
        {summary.hasAddedWeight && summary.workingWeight !== null && (
          <Text style={exerciseRowStyles.weight}>
            {formatKg(summary.workingWeight)}
          </Text>
        )}
        <Text style={exerciseRowStyles.reps}>
          {repsDisplay} = {totalReps}
        </Text>
        {summary.totalKg > 0 && (
          <Text style={exerciseRowStyles.tonnage}>
            {formatKg(summary.totalKg)}
          </Text>
        )}
      </View>
    </View>
  );
}

const exerciseRowStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginLeft: 26, // icon width + gap alignment
  },
  weight: {
    color: colors.primaryLight,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  reps: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  tonnage: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginLeft: 'auto',
  },
  skippedText: {
    color: colors.error,
    fontSize: fontSize.sm,
    marginLeft: 26,
  },
});

// ---- Main Screen ----

export default function WorkoutSummaryScreen() {
  const navigation = useNavigation<SummaryNavProp>();
  const route = useRoute<SummaryRouteProp>();
  const { sessionId } = route.params;

  const dayTypes = useAppStore((s) => s.dayTypes);

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exerciseSummaries, setExerciseSummaries] = useState<ExerciseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [sessionId]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [sess, summaries] = await Promise.all([
        workoutRepo.getWorkoutSessionById(sessionId),
        workoutRepo.getSessionExerciseSummary(sessionId),
      ]);
      setSession(sess);
      setExerciseSummaries(summaries);
    } catch (error) {
      console.error('Failed to load workout summary:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  if (isLoading || !session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const dayType = dayTypes.find((dt) => dt.id === session.dayTypeId);
  const accentColor = getDayTypeColor(session.dayTypeId);

  const completedCount = exerciseSummaries.filter((e) => !e.isSkipped).length;
  const skippedCount = exerciseSummaries.filter((e) => e.isSkipped).length;
  const totalExercises = exerciseSummaries.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Success header */}
        <View style={styles.header}>
          <View style={[styles.checkCircle, { borderColor: accentColor }]}>
            <MaterialCommunityIcons
              name="check"
              size={40}
              color={accentColor}
            />
          </View>
          <Text style={styles.headerTitle}>Тренировка завершена!</Text>
          <Text style={styles.headerSubtitle}>
            {dayType?.nameRu ?? 'Тренировка'} • {session.direction === 'normal' ? 'Прямой' : 'Обратный'} порядок
          </Text>
          <Text style={styles.headerDate}>
            {formatFullDate(session.date)}
          </Text>
        </View>

        {/* Key metrics */}
        <View style={styles.metricsCard}>
          <View style={styles.metricsRow}>
            <SummaryStat
              icon="timer-outline"
              label="Время"
              value={formatDuration(session.timeStart, session.timeEnd)}
              color={colors.info}
            />
            <SummaryStat
              icon="weight"
              label="Тоннаж"
              value={formatKg(session.totalKg)}
              color={accentColor}
            />
          </View>

          <View style={styles.metricsDivider} />

          <View style={styles.metricsRow}>
            <SummaryStat
              icon="scale-bathroom"
              label="Вес тела"
              value={`${calcAvgWeight(session.weightBefore, session.weightAfter)} кг`}
              color={colors.secondary}
            />
            <SummaryStat
              icon="dumbbell"
              label="Упражнений"
              value={`${completedCount}/${totalExercises}`}
              color={colors.success}
            />
          </View>
        </View>

        {/* Body weight details */}
        {(session.weightBefore !== null || session.weightAfter !== null) && (
          <View style={styles.weightDetailCard}>
            <View style={styles.weightDetailRow}>
              <Text style={styles.weightDetailLabel}>До тренировки</Text>
              <Text style={styles.weightDetailValue}>
                {session.weightBefore !== null ? `${formatWeight(session.weightBefore)} кг` : '—'}
              </Text>
            </View>
            <View style={styles.weightDetailRow}>
              <Text style={styles.weightDetailLabel}>После тренировки</Text>
              <Text style={styles.weightDetailValue}>
                {session.weightAfter !== null ? `${formatWeight(session.weightAfter)} кг` : '—'}
              </Text>
            </View>
            {session.weightBefore !== null && session.weightAfter !== null && (
              <View style={styles.weightDetailRow}>
                <Text style={styles.weightDetailLabel}>Разница</Text>
                <Text style={[
                  styles.weightDetailValue,
                  { color: session.weightAfter < session.weightBefore ? colors.error : colors.success }
                ]}>
                  {(() => {
                    const diff = session.weightAfter! - session.weightBefore!;
                    const sign = diff > 0 ? '+' : '';
                    return `${sign}${formatWeight(diff)} кг`;
                  })()}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Time details */}
        <View style={styles.timeCard}>
          <View style={styles.timeRow}>
            <MaterialCommunityIcons
              name="clock-start"
              size={18}
              color={colors.textMuted}
            />
            <Text style={styles.timeLabel}>Начало</Text>
            <Text style={styles.timeValue}>{formatTime(session.timeStart)}</Text>
          </View>
          {session.timeEnd && (
            <View style={styles.timeRow}>
              <MaterialCommunityIcons
                name="clock-end"
                size={18}
                color={colors.textMuted}
              />
              <Text style={styles.timeLabel}>Конец</Text>
              <Text style={styles.timeValue}>{formatTime(session.timeEnd)}</Text>
            </View>
          )}
        </View>

        {/* Exercise results */}
        <View style={styles.exerciseSection}>
          <Text style={styles.sectionTitle}>Результаты</Text>

          {skippedCount > 0 && (
            <View style={styles.skippedBanner}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={18}
                color={colors.warning}
              />
              <Text style={styles.skippedBannerText}>
                {skippedCount} {skippedCount === 1 ? 'упражнение пропущено' :
                  skippedCount < 5 ? 'упражнения пропущено' : 'упражнений пропущено'} — {skippedCount === 1 ? 'оно будет' : 'они будут'} приоритетным{skippedCount === 1 ? '' : 'и'} в следующий раз
              </Text>
            </View>
          )}

          <View style={styles.exerciseList}>
            {exerciseSummaries.map((summary) => (
              <ExerciseSummaryRow key={summary.exerciseId} summary={summary} />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.homeButton, { backgroundColor: accentColor }]}
          onPress={handleGoHome}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="home"
            size={24}
            color={colors.textOnPrimary}
          />
          <Text style={styles.homeButtonText}>На главную</Text>
        </TouchableOpacity>
      </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // Header
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.lg,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  headerTitle: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  headerDate: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },

  // Metrics card
  metricsCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
  },
  metricsDivider: {
    height: 1,
    backgroundColor: colors.border,
  },

  // Weight detail card
  weightDetailCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  weightDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weightDetailLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  weightDetailValue: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },

  // Time card
  timeCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    flex: 1,
  },
  timeValue: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },

  // Exercise section
  exerciseSection: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  skippedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning + '20',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  skippedBannerText: {
    color: colors.warning,
    fontSize: fontSize.sm,
    flex: 1,
  },
  exerciseList: {
    gap: spacing.sm,
  },

  // Bottom bar
  bottomBar: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  homeButton: {
    height: touchTarget.large,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  homeButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
