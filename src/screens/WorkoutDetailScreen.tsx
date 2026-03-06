// ==========================================
// Экран деталей тренировки (из истории)
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
import { colors, spacing, fontSize, borderRadius, getDayTypeColor } from '../theme';
import { useAppStore } from '../stores/appStore';
import { workoutRepo } from '../db';
import type { WorkoutSession } from '../types';
import type { ExerciseSummary } from '../db/repositories/workoutRepository';
import type { RootStackParamList } from '../navigation/types';

type DetailNavProp = NativeStackNavigationProp<RootStackParamList>;
type DetailRouteProp = RouteProp<RootStackParamList, 'WorkoutDetail'>;

// ---- Formatting helpers ----

function formatDuration(start: string, end: string | null): string {
  if (!end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const totalMin = Math.round(ms / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0) return `${hours}ч ${mins}мин`;
  return `${mins} мин`;
}

function formatKg(kg: number): string {
  if (kg === 0) return '0 кг';
  if (Number.isInteger(kg)) return `${kg} кг`;
  return `${kg.toString().replace('.', ',')} кг`;
}

function formatWeight(w: number | null): string {
  if (w === null) return '—';
  if (Number.isInteger(w)) return `${w}`;
  return w.toString().replace('.', ',');
}

function formatFullDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

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

interface StatBlockProps {
  icon: string;
  label: string;
  value: string;
  color?: string;
}

function StatBlock({ icon, label, value, color }: StatBlockProps) {
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

interface ExerciseDetailRowProps {
  summary: ExerciseSummary;
}

function ExerciseDetailRow({ summary }: ExerciseDetailRowProps) {
  if (summary.isSkipped) {
    return (
      <View style={exRowStyles.container}>
        <View style={exRowStyles.nameRow}>
          <MaterialCommunityIcons name="close-circle" size={18} color={colors.error} />
          <Text style={[exRowStyles.name, { color: colors.textMuted }]}>
            {summary.exerciseName}
          </Text>
        </View>
        <Text style={exRowStyles.skippedText}>Пропущено</Text>
      </View>
    );
  }

  const workingSets = summary.sets.filter((s) => s.setType === 'working');
  const repsDisplay = workingSets.map((s) => s.actualReps).join('+');
  const totalReps = workingSets.reduce((sum, s) => sum + s.actualReps, 0);

  return (
    <View style={exRowStyles.container}>
      <View style={exRowStyles.nameRow}>
        <MaterialCommunityIcons name="check-circle" size={18} color={colors.success} />
        <Text style={exRowStyles.name}>{summary.exerciseName}</Text>
      </View>
      <View style={exRowStyles.detailsRow}>
        {summary.hasAddedWeight && summary.workingWeight !== null && (
          <Text style={exRowStyles.weight}>{formatKg(summary.workingWeight)}</Text>
        )}
        <Text style={exRowStyles.reps}>
          {repsDisplay} = {totalReps}
        </Text>
        {summary.totalKg > 0 && (
          <Text style={exRowStyles.tonnage}>{formatKg(summary.totalKg)}</Text>
        )}
      </View>
    </View>
  );
}

const exRowStyles = StyleSheet.create({
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
    marginLeft: 26,
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

export default function WorkoutDetailScreen() {
  const navigation = useNavigation<DetailNavProp>();
  const route = useRoute<DetailRouteProp>();
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
      console.error('Failed to load workout detail:', error);
    } finally {
      setIsLoading(false);
    }
  }

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
      {/* Header with back button */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <Text style={[styles.headerTitle, { color: accentColor }]}>
            {dayType?.nameRu ?? 'Тренировка'}
          </Text>
          <Text style={styles.headerDate}>
            {formatFullDate(session.date)}
          </Text>
        </View>
        <View style={styles.backButton} />
        {/* Invisible spacer to center title */}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Key metrics */}
        <View style={styles.metricsCard}>
          <View style={styles.metricsRow}>
            <StatBlock
              icon="timer-outline"
              label="Время"
              value={formatDuration(session.timeStart, session.timeEnd)}
              color={colors.info}
            />
            <StatBlock
              icon="weight"
              label="Тоннаж"
              value={formatKg(session.totalKg)}
              color={accentColor}
            />
          </View>

          <View style={styles.metricsDivider} />

          <View style={styles.metricsRow}>
            <StatBlock
              icon="scale-bathroom"
              label="Вес тела"
              value={`${calcAvgWeight(session.weightBefore, session.weightAfter)} кг`}
              color={colors.secondary}
            />
            <StatBlock
              icon="dumbbell"
              label="Упражнений"
              value={`${completedCount}/${totalExercises}`}
              color={colors.success}
            />
          </View>
        </View>

        {/* Direction badge */}
        <View style={styles.directionCard}>
          <MaterialCommunityIcons
            name={session.direction === 'normal' ? 'arrow-right' : 'arrow-left'}
            size={18}
            color={colors.textSecondary}
          />
          <Text style={styles.directionText}>
            {session.direction === 'normal' ? 'Прямой' : 'Обратный'} порядок
          </Text>
        </View>

        {/* Body weight details */}
        {(session.weightBefore !== null || session.weightAfter !== null) && (
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>До тренировки</Text>
              <Text style={styles.detailValue}>
                {session.weightBefore !== null ? `${formatWeight(session.weightBefore)} кг` : '—'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>После тренировки</Text>
              <Text style={styles.detailValue}>
                {session.weightAfter !== null ? `${formatWeight(session.weightAfter)} кг` : '—'}
              </Text>
            </View>
            {session.weightBefore !== null && session.weightAfter !== null && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Разница</Text>
                <Text
                  style={[
                    styles.detailValue,
                    {
                      color:
                        session.weightAfter < session.weightBefore
                          ? colors.error
                          : colors.success,
                    },
                  ]}
                >
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
        <View style={styles.detailCard}>
          <View style={styles.timeRow}>
            <MaterialCommunityIcons
              name="clock-start"
              size={18}
              color={colors.textMuted}
            />
            <Text style={styles.detailLabel}>Начало</Text>
            <Text style={styles.timeValue}>{formatTime(session.timeStart)}</Text>
          </View>
          {session.timeEnd && (
            <View style={styles.timeRow}>
              <MaterialCommunityIcons
                name="clock-end"
                size={18}
                color={colors.textMuted}
              />
              <Text style={styles.detailLabel}>Конец</Text>
              <Text style={styles.timeValue}>{formatTime(session.timeEnd)}</Text>
            </View>
          )}
        </View>

        {/* Exercise results */}
        <View style={styles.exerciseSection}>
          <Text style={styles.sectionTitle}>Упражнения</Text>

          {skippedCount > 0 && (
            <View style={styles.skippedBanner}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={18}
                color={colors.warning}
              />
              <Text style={styles.skippedBannerText}>
                {skippedCount}{' '}
                {skippedCount === 1
                  ? 'упражнение пропущено'
                  : skippedCount < 5
                  ? 'упражнения пропущено'
                  : 'упражнений пропущено'}
              </Text>
            </View>
          )}

          <View style={styles.exerciseList}>
            {exerciseSummaries.map((summary) => (
              <ExerciseDetailRow key={summary.exerciseId} summary={summary} />
            ))}
          </View>
        </View>

        {/* Notes */}
        {session.notes && (
          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Заметки</Text>
            <Text style={styles.notesText}>{session.notes}</Text>
          </View>
        )}
      </ScrollView>
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

  // Header bar
  headerBar: {
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
  headerTitleBlock: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  headerDate: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },

  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
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

  // Direction
  directionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  directionText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },

  // Detail card (weight, time)
  detailCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    flex: 1,
  },
  detailValue: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },

  // Time row
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeValue: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
    marginLeft: 'auto',
  },

  // Exercises
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

  // Notes
  notesText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    lineHeight: 22,
  },
});
