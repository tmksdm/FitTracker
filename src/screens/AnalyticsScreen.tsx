// ==========================================
// Экран «Аналитика» — графики и статистика
// ==========================================

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import {
  colors,
  spacing,
  fontSize,
  borderRadius,
  getDayTypeColor,
} from '../theme';
import { useAppStore } from '../stores/appStore';
import { analyticsRepo } from '../db';
import type {
  MonthlyTonnage,
  YearlyTonnage,
  BodyWeightDataPoint,
  MonthlyBodyWeight,
  MonthlyDuration,
  MonthlyRunTime,
  ExerciseProgressPoint,
  ExercisePickerItem,
} from '../db/repositories/analyticsRepository';
import type { DayTypeId } from '../types';

// ---- Layout constants ----
const SCREEN_WIDTH = Dimensions.get('window').width;
// Cards sit inside tabContentInner with padding = spacing.lg each side
const CONTENT_PADDING = spacing.lg;
const CARD_WIDTH = SCREEN_WIDTH - CONTENT_PADDING * 2;

// react-native-chart-kit quirks:
//  - `style.paddingRight` = LEFT margin for Y-axis labels (misnamed)
//  - The library adds its own right-side padding internally
// Strategy: set chart width = CARD_WIDTH (same as statsCard),
// use paddingRight for Y-axis, and clip any overflow.
const CHART_Y_AXIS_WIDTH = 48;
const CHART_WIDTH = CARD_WIDTH;
const CHART_HEIGHT = 200;

// ---- Tab definitions ----

type TabKey = 'tonnage' | 'bodyweight' | 'duration' | 'running' | 'exercise';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'tonnage', label: 'Тоннаж', icon: 'weight' },
  { key: 'bodyweight', label: 'Вес тела', icon: 'scale-bathroom' },
  { key: 'duration', label: 'Время', icon: 'timer-outline' },
  { key: 'running', label: 'Бег', icon: 'run' },
  { key: 'exercise', label: 'Упражнение', icon: 'dumbbell' },
];

// ---- Day type filter ----

type DayTypeFilter = 'all' | DayTypeId;

const DAY_TYPE_FILTERS: { key: DayTypeFilter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 1, label: 'Присед' },
  { key: 2, label: 'Тяга' },
  { key: 3, label: 'Жим' },
];

// ---- Chart config ----

const chartConfig = {
  backgroundColor: colors.card,
  backgroundGradientFrom: colors.card,
  backgroundGradientTo: colors.card,
  decimalCount: 0,
  color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
  labelColor: () => colors.textSecondary,
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: colors.primary,
  },
  propsForBackgroundLines: {
    stroke: colors.border,
    strokeDasharray: '',
  },
  style: {
    borderRadius: borderRadius.lg,
  },
};

// ---- Formatting helpers ----

function formatKg(kg: number): string {
  if (kg === 0) return '0';
  if (Number.isInteger(kg)) return `${kg}`;
  return kg.toString().replace('.', ',');
}

function formatWeight(w: number): string {
  if (Number.isInteger(w)) return `${w}`;
  return w.toFixed(2).replace('.', ',');
}

function formatDurationMin(min: number): string {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}ч ${m}мин`;
}

function formatRunTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function formatShortDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

/** Shorten month label for chart axis: "Ноя 2025" → "Ноя 25" */
function shortenMonthLabel(label: string): string {
  return label.replace(/\s(\d{4})$/, (_, year) => ` ${year.slice(2)}`);
}

// ---- Helpers for chart data ----

/** Pick evenly spaced labels so that the chart doesn't become unreadable */
function pickLabels(allLabels: string[], maxCount: number = 6): string[] {
  if (allLabels.length <= maxCount) return allLabels;
  const result: string[] = [];
  const step = (allLabels.length - 1) / (maxCount - 1);
  for (let i = 0; i < maxCount; i++) {
    result.push(allLabels[Math.round(i * step)]);
  }
  return result;
}

function buildChartData(
  labels: string[],
  data: number[],
  maxLabels: number = 6,
  lineColor?: string
) {
  const sparsedLabels = pickLabels(labels, maxLabels);
  const displayLabels = labels.map((l) =>
    sparsedLabels.includes(l) ? l : ''
  );
  return {
    labels: displayLabels,
    datasets: [
      {
        data: data.length > 0 ? data : [0],
        color: lineColor
          ? (_opacity = 1) => {
              const hex = lineColor.replace('#', '');
              const r = parseInt(hex.substring(0, 2), 16);
              const g = parseInt(hex.substring(2, 4), 16);
              const b = parseInt(hex.substring(4, 6), 16);
              return `rgba(${r}, ${g}, ${b}, ${_opacity})`;
            }
          : undefined,
        strokeWidth: 2,
      },
    ],
  };
}

/**
 * Build chart data showing ALL labels (for fixed-slot charts like 12 months / 12 years).
 */
function buildFixedSlotChartData(
  labels: string[],
  data: number[],
  lineColor?: string
) {
  return {
    labels,
    datasets: [
      {
        data: data.length > 0 ? data : [0],
        color: lineColor
          ? (_opacity = 1) => {
              const hex = lineColor.replace('#', '');
              const r = parseInt(hex.substring(0, 2), 16);
              const g = parseInt(hex.substring(2, 4), 16);
              const b = parseInt(hex.substring(4, 6), 16);
              return `rgba(${r}, ${g}, ${b}, ${_opacity})`;
            }
          : undefined,
        strokeWidth: 2,
      },
    ],
  };
}

/** Build a color function from hex */
function colorFromHex(hex: string) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return (opacity = 1) => `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// ---- Helpers for 12-month / 12-year slot filling ----

function buildLast12Months(
  data: MonthlyTonnage[]
): { labels: string[]; values: number[] } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const labels: string[] = [];
  const values: number[] = [];

  const dataMap = new Map<string, number>();
  for (const d of data) {
    dataMap.set(`${d.year}-${d.month}`, d.avgTotalKg);
  }

  for (let i = 11; i >= 0; i--) {
    let m = currentMonth - i;
    let y = currentYear;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    labels.push(m.toString().padStart(2, '0'));
    values.push(dataMap.get(`${y}-${m}`) ?? 0);
  }

  return { labels, values };
}

function buildLast12Years(
  data: YearlyTonnage[]
): { labels: string[]; values: number[] } {
  const now = new Date();
  const currentYear = now.getFullYear();

  const labels: string[] = [];
  const values: number[] = [];

  const dataMap = new Map<number, number>();
  for (const d of data) {
    dataMap.set(d.year, d.avgTotalKg);
  }

  for (let i = 11; i >= 0; i--) {
    const y = currentYear - i;
    labels.push(y.toString().slice(2));
    values.push(dataMap.get(y) ?? 0);
  }

  return { labels, values };
}

// ---- Empty state component ----

function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons
        name="chart-line-variant"
        size={48}
        color={colors.textMuted}
      />
      <Text style={styles.emptyStateText}>{message}</Text>
    </View>
  );
}

// ---- Stat row component ----

function StatRow({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueBlock}>
        <Text style={styles.statValue}>{value}</Text>
        {subValue && <Text style={styles.statSubValue}>{subValue}</Text>}
      </View>
    </View>
  );
}

// ---- Shared chart style ----
const chartStyle = {
  borderRadius: borderRadius.lg,
  paddingRight: CHART_Y_AXIS_WIDTH,
};

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function AnalyticsScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('tonnage');
  const [isLoading, setIsLoading] = useState(true);
  const hasLoaded = useRef(false);

  // Tonnage state
  const [dayTypeFilter, setDayTypeFilter] = useState<DayTypeFilter>('all');
  const [monthlyTonnage, setMonthlyTonnage] = useState<MonthlyTonnage[]>([]);
  const [yearlyTonnage, setYearlyTonnage] = useState<YearlyTonnage[]>([]);

  // Body weight state
  const [bodyWeightTrend, setBodyWeightTrend] = useState<BodyWeightDataPoint[]>([]);
  const [monthlyBodyWeight, setMonthlyBodyWeight] = useState<MonthlyBodyWeight[]>([]);

  // Duration state
  const [monthlyDuration, setMonthlyDuration] = useState<MonthlyDuration[]>([]);

  // Running state
  const [monthlyRunTime, setMonthlyRunTime] = useState<MonthlyRunTime[]>([]);

  // Exercise progress state
  const [exercises, setExercises] = useState<ExercisePickerItem[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgressPoint[]>([]);

  // ---- Data loading ----

  const loadTonnageData = useCallback(async (filter: DayTypeFilter) => {
    const dtId = filter === 'all' ? undefined : filter;
    const [monthly, yearly] = await Promise.all([
      analyticsRepo.getMonthlyTonnage(dtId),
      analyticsRepo.getYearlyTonnage(dtId),
    ]);
    setMonthlyTonnage(monthly);
    setYearlyTonnage(yearly);
  }, []);

  const loadBodyWeightData = useCallback(async () => {
    const [trend, monthly] = await Promise.all([
      analyticsRepo.getBodyWeightTrend(),
      analyticsRepo.getMonthlyBodyWeight(),
    ]);
    setBodyWeightTrend(trend);
    setMonthlyBodyWeight(monthly);
  }, []);

  const loadDurationData = useCallback(async () => {
    const monthly = await analyticsRepo.getMonthlyDuration();
    setMonthlyDuration(monthly);
  }, []);

  const loadRunningData = useCallback(async () => {
    const monthly = await analyticsRepo.getMonthlyRunTime();
    setMonthlyRunTime(monthly);
  }, []);

  const loadExerciseData = useCallback(async () => {
    const allExercises = await analyticsRepo.getAllExercisesForPicker();
    setExercises(allExercises);
    if (allExercises.length > 0 && !selectedExerciseId) {
      setSelectedExerciseId(allExercises[0].id);
      const progress = await analyticsRepo.getExerciseProgress(allExercises[0].id);
      setExerciseProgress(progress);
    }
  }, [selectedExerciseId]);

  const loadExerciseProgress = useCallback(async (exerciseId: string) => {
    setSelectedExerciseId(exerciseId);
    const progress = await analyticsRepo.getExerciseProgress(exerciseId);
    setExerciseProgress(progress);
  }, []);

  const loadAllData = useCallback(async () => {
    try {
      await Promise.all([
        loadTonnageData(dayTypeFilter),
        loadBodyWeightData(),
        loadDurationData(),
        loadRunningData(),
        loadExerciseData(),
      ]);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    }
  }, [dayTypeFilter, loadTonnageData, loadBodyWeightData, loadDurationData, loadRunningData, loadExerciseData]);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoaded.current) {
        setIsLoading(true);
        loadAllData().finally(() => {
          setIsLoading(false);
          hasLoaded.current = true;
        });
      } else {
        loadAllData();
      }
    }, [loadAllData])
  );

  const handleDayTypeFilterChange = useCallback(
    async (filter: DayTypeFilter) => {
      setDayTypeFilter(filter);
      await loadTonnageData(filter);
    },
    [loadTonnageData]
  );

  // ---- Render sections ----

  function renderTonnageTab() {
    const filterColor =
      dayTypeFilter === 'all'
        ? colors.primary
        : getDayTypeColor(dayTypeFilter as number);

    const filterColorFn = colorFromHex(filterColor);

    const monthly12 = buildLast12Months(monthlyTonnage);
    const hasMonthlyData = monthly12.values.some((v) => v > 0);

    const yearly12 = buildLast12Years(yearlyTonnage);
    const hasYearlyData = yearly12.values.some((v) => v > 0);

    return (
      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={styles.tabContentInner}
      >
        {/* Day type filter */}
        <View style={styles.filterRow}>
          {DAY_TYPE_FILTERS.map((opt) => {
            const isActive = dayTypeFilter === opt.key;
            const chipColor =
              opt.key === 'all'
                ? colors.primary
                : getDayTypeColor(opt.key as number);

            return (
              <TouchableOpacity
                key={String(opt.key)}
                style={[
                  styles.filterChip,
                  isActive && {
                    backgroundColor: chipColor + '30',
                    borderColor: chipColor,
                  },
                ]}
                onPress={() => handleDayTypeFilterChange(opt.key)}
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

        {/* Monthly averages chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Среднее за месяц</Text>
          {!hasMonthlyData ? (
            <EmptyState message="Нет данных" />
          ) : (
            <View style={styles.chartContainer}>
              <LineChart
                data={buildFixedSlotChartData(
                  monthly12.labels,
                  monthly12.values,
                  filterColor
                )}
                width={CHART_WIDTH}
                height={CHART_HEIGHT}
                chartConfig={{
                  ...chartConfig,
                  color: filterColorFn,
                  propsForDots: {
                    r: '4',
                    strokeWidth: '2',
                    stroke: filterColor,
                  },
                  propsForLabels: {
                    fontSize: 10,
                  },
                }}
                bezier
                style={chartStyle}
                withInnerLines={true}
                withOuterLines={false}
                withVerticalLines={false}
                fromZero={false}
                yAxisSuffix=""
                segments={4}
                formatYLabel={(v) => Math.round(Number(v)).toString()}
              />
            </View>
          )}

          {/* Monthly table */}
          {monthlyTonnage.length > 0 && (
            <View style={styles.statsCard}>
              {monthlyTonnage
                .slice()
                .reverse()
                .map((m) => (
                  <StatRow
                    key={`${m.year}-${m.month}`}
                    label={m.label}
                    value={`${formatKg(m.avgTotalKg)} кг`}
                    subValue={`${m.workoutCount} тренир.`}
                  />
                ))}
            </View>
          )}
        </View>

        {/* Yearly averages chart + table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Среднее за год</Text>
          {!hasYearlyData ? (
            <EmptyState message="Нет данных" />
          ) : (
            <View style={styles.chartContainer}>
              <LineChart
                data={buildFixedSlotChartData(
                  yearly12.labels,
                  yearly12.values,
                  filterColor
                )}
                width={CHART_WIDTH}
                height={CHART_HEIGHT}
                chartConfig={{
                  ...chartConfig,
                  color: filterColorFn,
                  propsForDots: {
                    r: '4',
                    strokeWidth: '2',
                    stroke: filterColor,
                  },
                  propsForLabels: {
                    fontSize: 10,
                  },
                }}
                bezier
                style={chartStyle}
                withInnerLines={true}
                withOuterLines={false}
                withVerticalLines={false}
                fromZero={false}
                yAxisSuffix=""
                segments={4}
                formatYLabel={(v) => Math.round(Number(v)).toString()}
              />
            </View>
          )}

          {yearlyTonnage.length > 0 && (
            <View style={styles.statsCard}>
              {yearlyTonnage
                .slice()
                .reverse()
                .map((y) => (
                  <StatRow
                    key={y.year}
                    label={`${y.year}`}
                    value={`${formatKg(y.avgTotalKg)} кг`}
                    subValue={`${y.workoutCount} тренир.`}
                  />
                ))}
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  function renderBodyWeightTab() {
    return (
      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={styles.tabContentInner}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Динамика веса</Text>
          {bodyWeightTrend.length < 2 ? (
            <EmptyState message="Нужно минимум 2 измерения для графика" />
          ) : (
            <View style={styles.chartContainer}>
              <LineChart
                data={buildChartData(
                  bodyWeightTrend.map((p) => formatShortDate(p.date)),
                  bodyWeightTrend.map((p) => p.avgWeight),
                  6,
                  colors.secondary
                )}
                width={CHART_WIDTH}
                height={CHART_HEIGHT}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) =>
                    `rgba(255, 152, 0, ${opacity})`,
                  propsForDots: {
                    r: bodyWeightTrend.length > 30 ? '2' : '4',
                    strokeWidth: '1',
                    stroke: colors.secondary,
                  },
                }}
                bezier
                style={chartStyle}
                withInnerLines={true}
                withOuterLines={false}
                withVerticalLines={false}
                fromZero={false}
                yAxisSuffix=""
                segments={4}
              />
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Среднее за месяц</Text>
          {monthlyBodyWeight.length === 0 ? (
            <EmptyState message="Нет данных о весе тела" />
          ) : (
            <View style={styles.statsCard}>
              {monthlyBodyWeight
                .slice()
                .reverse()
                .map((m) => (
                  <StatRow
                    key={`${m.year}-${m.month}`}
                    label={m.label}
                    value={`${formatWeight(m.avgWeight)} кг`}
                    subValue={`${m.measurementCount} измер.`}
                  />
                ))}
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  function renderDurationTab() {
    return (
      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={styles.tabContentInner}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Средняя длительность тренировки
          </Text>
          {monthlyDuration.length < 2 ? (
            monthlyDuration.length === 1 ? (
              <View style={styles.singleStatCard}>
                <Text style={styles.singleStatLabel}>
                  {monthlyDuration[0].label}
                </Text>
                <Text style={styles.singleStatValue}>
                  {formatDurationMin(monthlyDuration[0].avgDurationMin)}
                </Text>
                <Text style={styles.singleStatSub}>
                  {monthlyDuration[0].workoutCount} тренир.
                </Text>
              </View>
            ) : (
              <EmptyState message="Нет данных о длительности" />
            )
          ) : (
            <View style={styles.chartContainer}>
              <LineChart
                data={buildChartData(
                  monthlyDuration.map((m) => shortenMonthLabel(m.label)),
                  monthlyDuration.map((m) => m.avgDurationMin),
                  6,
                  colors.info
                )}
                width={CHART_WIDTH}
                height={CHART_HEIGHT}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) =>
                    `rgba(33, 150, 243, ${opacity})`,
                  propsForDots: {
                    r: '4',
                    strokeWidth: '2',
                    stroke: colors.info,
                  },
                }}
                bezier
                style={chartStyle}
                withInnerLines={true}
                withOuterLines={false}
                withVerticalLines={false}
                fromZero={false}
                yAxisSuffix=" м"
                segments={4}
                formatYLabel={(v) => Math.round(Number(v)).toString()}
              />
            </View>
          )}

          {monthlyDuration.length > 0 && (
            <View style={styles.statsCard}>
              {monthlyDuration
                .slice()
                .reverse()
                .map((m) => (
                  <StatRow
                    key={`${m.year}-${m.month}`}
                    label={m.label}
                    value={formatDurationMin(m.avgDurationMin)}
                    subValue={`${m.workoutCount} тренир.`}
                  />
                ))}
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  function renderRunningTab() {
    return (
      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={styles.tabContentInner}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Бег 3 км — среднее время</Text>
          {monthlyRunTime.length === 0 ? (
            <EmptyState message="Нет данных о беге" />
          ) : monthlyRunTime.length === 1 ? (
            <View style={styles.singleStatCard}>
              <Text style={styles.singleStatLabel}>
                {monthlyRunTime[0].label}
              </Text>
              <Text style={styles.singleStatValue}>
                {formatRunTime(monthlyRunTime[0].avgDurationSec)}
              </Text>
              <Text style={styles.singleStatSub}>
                {monthlyRunTime[0].runCount} забегов
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.chartContainer}>
                <LineChart
                  data={buildChartData(
                    monthlyRunTime.map((m) => shortenMonthLabel(m.label)),
                    monthlyRunTime.map((m) => Math.round(m.avgDurationSec / 60)),
                    6,
                    '#66BB6A'
                  )}
                  width={CHART_WIDTH}
                  height={CHART_HEIGHT}
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) =>
                      `rgba(102, 187, 106, ${opacity})`,
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: '#66BB6A',
                    },
                  }}
                  bezier
                  style={chartStyle}
                  withInnerLines={true}
                  withOuterLines={false}
                  withVerticalLines={false}
                  fromZero={false}
                  yAxisSuffix=" мин"
                  segments={4}
                  formatYLabel={(v) => Math.round(Number(v)).toString()}
                />
              </View>
              <View style={styles.statsCard}>
                {monthlyRunTime
                  .slice()
                  .reverse()
                  .map((m) => (
                    <StatRow
                      key={`${m.year}-${m.month}`}
                      label={m.label}
                      value={formatRunTime(m.avgDurationSec)}
                      subValue={`${m.runCount} забегов`}
                    />
                  ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    );
  }

  function renderExerciseTab() {
    const dayTypes = useAppStore.getState().dayTypes;

    const groupedExercises = new Map<DayTypeId, ExercisePickerItem[]>();
    for (const ex of exercises) {
      if (!groupedExercises.has(ex.dayTypeId)) {
        groupedExercises.set(ex.dayTypeId, []);
      }
      groupedExercises.get(ex.dayTypeId)!.push(ex);
    }

    const selectedExercise = exercises.find(
      (e) => e.id === selectedExerciseId
    );

    const selectedColor = selectedExercise
      ? getDayTypeColor(selectedExercise.dayTypeId)
      : colors.primary;

    const selectedColorFn = colorFromHex(selectedColor);

    return (
      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={styles.tabContentInner}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Выберите упражнение</Text>

          {Array.from(groupedExercises.entries()).map(
            ([dayTypeId, exList]) => {
              const dt = dayTypes.find((d) => d.id === dayTypeId);
              const groupColor = getDayTypeColor(dayTypeId);

              return (
                <View key={dayTypeId} style={styles.exerciseGroup}>
                  <Text style={[styles.exerciseGroupTitle, { color: groupColor }]}>
                    {dt?.nameRu ?? ''}
                  </Text>
                  <View style={styles.exerciseChipsWrap}>
                    {exList.map((ex) => {
                      const isSelected = selectedExerciseId === ex.id;
                      return (
                        <TouchableOpacity
                          key={ex.id}
                          style={[
                            styles.exerciseChip,
                            isSelected && {
                              backgroundColor: groupColor + '30',
                              borderColor: groupColor,
                            },
                          ]}
                          onPress={() => loadExerciseProgress(ex.id)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.exerciseChipText,
                              isSelected && { color: groupColor },
                            ]}
                            numberOfLines={1}
                          >
                            {ex.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            }
          )}
        </View>

        {selectedExercise && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{selectedExercise.name}</Text>

            {exerciseProgress.length === 0 ? (
              <EmptyState message="Нет данных для этого упражнения" />
            ) : (
              <>
                {selectedExercise.hasAddedWeight &&
                  exerciseProgress.some((p) => p.workingWeight !== null) && (
                    <>
                      <Text style={styles.subsectionTitle}>Рабочий вес</Text>
                      {exerciseProgress.filter((p) => p.workingWeight !== null).length >= 2 ? (
                        <View style={styles.chartContainer}>
                          <LineChart
                            data={buildChartData(
                              exerciseProgress
                                .filter((p) => p.workingWeight !== null)
                                .map((p) => formatShortDate(p.date)),
                              exerciseProgress
                                .filter((p) => p.workingWeight !== null)
                                .map((p) => p.workingWeight!),
                              6,
                              selectedColor
                            )}
                            width={CHART_WIDTH}
                            height={CHART_HEIGHT}
                            chartConfig={{
                              ...chartConfig,
                              color: selectedColorFn,
                              propsForDots: {
                                r: '4',
                                strokeWidth: '2',
                                stroke: selectedColor,
                              },
                            }}
                            bezier
                            style={chartStyle}
                            withInnerLines={true}
                            withOuterLines={false}
                            withVerticalLines={false}
                            fromZero={false}
                            yAxisSuffix=" кг"
                            segments={4}
                          />
                        </View>
                      ) : (
                        <View style={styles.singleStatCard}>
                          <Text style={styles.singleStatValue}>
                            {formatKg(exerciseProgress[exerciseProgress.length - 1].workingWeight!)} кг
                          </Text>
                        </View>
                      )}
                    </>
                  )}

                <Text style={styles.subsectionTitle}>Повторения (сумма рабочих)</Text>
                {exerciseProgress.length >= 2 ? (
                  <View style={styles.chartContainer}>
                    <LineChart
                      data={buildChartData(
                        exerciseProgress.map((p) => formatShortDate(p.date)),
                        exerciseProgress.map((p) => p.totalWorkingReps),
                        6,
                        selectedColor
                      )}
                      width={CHART_WIDTH}
                      height={CHART_HEIGHT}
                      chartConfig={{
                        ...chartConfig,
                        color: selectedColorFn,
                        propsForDots: {
                          r: '4',
                          strokeWidth: '2',
                          stroke: selectedColor,
                        },
                      }}
                      bezier
                      style={chartStyle}
                      withInnerLines={true}
                      withOuterLines={false}
                      withVerticalLines={false}
                      fromZero={false}
                      yAxisSuffix=""
                      segments={4}
                      formatYLabel={(v) => Math.round(Number(v)).toString()}
                    />
                  </View>
                ) : (
                  <View style={styles.singleStatCard}>
                    <Text style={styles.singleStatValue}>
                      {exerciseProgress[0].workingReps.join('+')} ={' '}
                      {exerciseProgress[0].totalWorkingReps}
                    </Text>
                  </View>
                )}

                <Text style={styles.subsectionTitle}>История</Text>
                <View style={styles.statsCard}>
                  {exerciseProgress
                    .slice()
                    .reverse()
                    .map((p) => (
                      <StatRow
                        key={p.sessionId}
                        label={formatShortDate(p.date)}
                        value={
                          selectedExercise.hasAddedWeight && p.workingWeight
                            ? `${formatKg(p.workingWeight)} кг`
                            : `${p.workingReps.join('+')} = ${p.totalWorkingReps}`
                        }
                        subValue={
                          selectedExercise.hasAddedWeight
                            ? `${p.workingReps.join('+')} = ${p.totalWorkingReps}`
                            : p.totalKg > 0
                            ? `${formatKg(p.totalKg)} кг`
                            : undefined
                        }
                      />
                    ))}
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>
    );
  }

  function renderTabContent() {
    switch (activeTab) {
      case 'tonnage':
        return renderTonnageTab();
      case 'bodyweight':
        return renderBodyWeightTab();
      case 'duration':
        return renderDurationTab();
      case 'running':
        return renderRunningTab();
      case 'exercise':
        return renderExerciseTab();
    }
  }

  // ---- Main render ----

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
        <Text style={styles.title}>Статистика</Text>
      </View>

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBar}
        style={styles.tabBarScroll}
      >
        {TABS.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(item.key)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={item.icon as any}
                size={14}
                color={isActive ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.tabText,
                  isActive && styles.tabTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Tab content */}
      {renderTabContent()}
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
    paddingHorizontal: CONTENT_PADDING,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },

  tabBarScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  tabBar: {
    paddingHorizontal: CONTENT_PADDING,
    paddingVertical: spacing.sm,
    gap: spacing.xs + 2,
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primary,
  },

  tabContent: {
    flex: 1,
  },
  tabContentInner: {
    padding: CONTENT_PADDING,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.lg,
  },

  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  subsectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: spacing.sm,
  },

  filterRow: {
    flexDirection: 'row',
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

  // Chart container — same width as statsCard, clips chart overflow
  chartContainer: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    overflow: 'hidden',
    width: CARD_WIDTH,
  },

  statsCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: 0,
    width: CARD_WIDTH,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    flex: 1,
  },
  statValueBlock: {
    alignItems: 'flex-end',
  },
  statValue: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  statSubValue: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },

  singleStatCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  singleStatLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  singleStatValue: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  singleStatSub: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },

  emptyState: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyStateText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    textAlign: 'center',
  },

  exerciseGroup: {
    gap: spacing.sm,
  },
  exerciseGroupTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  exerciseChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  exerciseChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    maxWidth: '100%',
  },
  exerciseChipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
});
