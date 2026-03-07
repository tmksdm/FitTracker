// ==========================================
// Репозиторий: Аналитические запросы
// ==========================================

import { getDatabase } from '../database';
import { DayTypeId } from '../../types';

// --- Types ---

export interface TonnageDataPoint {
  sessionId: string;
  date: string;
  dayTypeId: DayTypeId;
  totalKg: number;
}

export interface MonthlyTonnage {
  year: number;
  month: number;
  label: string; // "Янв 2025"
  avgTotalKg: number;
  workoutCount: number;
}

export interface YearlyTonnage {
  year: number;
  avgTotalKg: number;
  workoutCount: number;
}

export interface BodyWeightDataPoint {
  date: string;
  avgWeight: number;
}

export interface MonthlyBodyWeight {
  year: number;
  month: number;
  label: string;
  avgWeight: number;
  measurementCount: number;
}

export interface MonthlyDuration {
  year: number;
  month: number;
  label: string;
  avgDurationMin: number;
  workoutCount: number;
}

export interface MonthlyRunTime {
  year: number;
  month: number;
  label: string;
  avgDurationSec: number;
  runCount: number;
}

export interface ExerciseProgressPoint {
  date: string;
  sessionId: string;
  workingWeight: number | null;
  workingReps: number[]; // actual reps per working set
  totalWorkingReps: number;
  totalKg: number;
}

export interface PeriodComparison {
  period1Label: string;
  period2Label: string;
  period1Value: number;
  period2Value: number;
  changePercent: number;
}

// --- Formatting helper ---

const MONTH_NAMES_SHORT = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
];

function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES_SHORT[month - 1]} ${year}`;
}

// --- Tonnage queries ---

/**
 * Get tonnage per workout, optionally filtered by day type.
 */
export async function getTonnagePerWorkout(
  dayTypeId?: DayTypeId,
  limit?: number
): Promise<TonnageDataPoint[]> {
  const db = await getDatabase();
  let query = `
    SELECT id, date, day_type_id, total_kg
    FROM workout_sessions
    WHERE time_end IS NOT NULL
  `;
  const params: any[] = [];

  if (dayTypeId !== undefined) {
    query += ' AND day_type_id = ?';
    params.push(dayTypeId);
  }

  query += ' ORDER BY date ASC';

  if (limit !== undefined) {
    query += ' LIMIT ?';
    params.push(limit);
  }

  const rows = await db.getAllAsync(query, params);
  return (rows as any[]).map((row) => ({
    sessionId: row.id,
    date: row.date,
    dayTypeId: row.day_type_id as DayTypeId,
    totalKg: row.total_kg,
  }));
}

/**
 * Get average tonnage per month, optionally filtered by day type.
 */
export async function getMonthlyTonnage(
  dayTypeId?: DayTypeId
): Promise<MonthlyTonnage[]> {
  const db = await getDatabase();
  let query = `
    SELECT
      CAST(strftime('%Y', date) AS INTEGER) as year,
      CAST(strftime('%m', date) AS INTEGER) as month,
      AVG(total_kg) as avg_total_kg,
      COUNT(*) as workout_count
    FROM workout_sessions
    WHERE time_end IS NOT NULL
  `;
  const params: any[] = [];

  if (dayTypeId !== undefined) {
    query += ' AND day_type_id = ?';
    params.push(dayTypeId);
  }

  query += ' GROUP BY year, month ORDER BY year ASC, month ASC';

  const rows = await db.getAllAsync(query, params);
  return (rows as any[]).map((row) => ({
    year: row.year,
    month: row.month,
    label: monthLabel(row.year, row.month),
    avgTotalKg: Math.round(row.avg_total_kg),
    workoutCount: row.workout_count,
  }));
}

/**
 * Get average tonnage per year (average of monthly averages), optionally filtered.
 */
export async function getYearlyTonnage(
  dayTypeId?: DayTypeId
): Promise<YearlyTonnage[]> {
  const db = await getDatabase();
  // Average of monthly averages
  let innerQuery = `
    SELECT
      CAST(strftime('%Y', date) AS INTEGER) as year,
      CAST(strftime('%m', date) AS INTEGER) as month,
      AVG(total_kg) as monthly_avg,
      COUNT(*) as cnt
    FROM workout_sessions
    WHERE time_end IS NOT NULL
  `;
  const params: any[] = [];

  if (dayTypeId !== undefined) {
    innerQuery += ' AND day_type_id = ?';
    params.push(dayTypeId);
  }

  innerQuery += ' GROUP BY year, month';

  const query = `
    SELECT
      year,
      AVG(monthly_avg) as avg_total_kg,
      SUM(cnt) as workout_count
    FROM (${innerQuery})
    GROUP BY year
    ORDER BY year ASC
  `;

  const rows = await db.getAllAsync(query, params);
  return (rows as any[]).map((row) => ({
    year: row.year,
    avgTotalKg: Math.round(row.avg_total_kg),
    workoutCount: row.workout_count,
  }));
}

// --- Body weight queries ---

/**
 * Get body weight data point per workout (average of before/after).
 */
export async function getBodyWeightTrend(): Promise<BodyWeightDataPoint[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT date, weight_before, weight_after
     FROM workout_sessions
     WHERE time_end IS NOT NULL
       AND (weight_before IS NOT NULL OR weight_after IS NOT NULL)
     ORDER BY date ASC`
  );

  return (rows as any[]).map((row) => {
    let avg: number;
    if (row.weight_before !== null && row.weight_after !== null) {
      avg = (row.weight_before + row.weight_after) / 2;
    } else if (row.weight_before !== null) {
      avg = row.weight_before;
    } else {
      avg = row.weight_after;
    }
    return {
      date: row.date,
      avgWeight: Math.round(avg * 100) / 100, // 2 decimal places
    };
  });
}

/**
 * Get average body weight per month.
 */
export async function getMonthlyBodyWeight(): Promise<MonthlyBodyWeight[]> {
  const db = await getDatabase();
  // We need to compute average of (avg of before/after) per session, then average per month.
  // Simplification: average all non-null before/after values in the month.
  const rows = await db.getAllAsync(
    `SELECT
       CAST(strftime('%Y', date) AS INTEGER) as year,
       CAST(strftime('%m', date) AS INTEGER) as month,
       AVG(
         CASE
           WHEN weight_before IS NOT NULL AND weight_after IS NOT NULL
             THEN (weight_before + weight_after) / 2.0
           WHEN weight_before IS NOT NULL THEN weight_before
           ELSE weight_after
         END
       ) as avg_weight,
       COUNT(*) as measurement_count
     FROM workout_sessions
     WHERE time_end IS NOT NULL
       AND (weight_before IS NOT NULL OR weight_after IS NOT NULL)
     GROUP BY year, month
     ORDER BY year ASC, month ASC`
  );

  return (rows as any[]).map((row) => ({
    year: row.year,
    month: row.month,
    label: monthLabel(row.year, row.month),
    avgWeight: Math.round(row.avg_weight * 100) / 100,
    measurementCount: row.measurement_count,
  }));
}

// --- Duration queries ---

/**
 * Get average workout duration per month (in minutes).
 */
export async function getMonthlyDuration(): Promise<MonthlyDuration[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT
       CAST(strftime('%Y', date) AS INTEGER) as year,
       CAST(strftime('%m', date) AS INTEGER) as month,
       AVG(
         (julianday(time_end) - julianday(time_start)) * 24 * 60
       ) as avg_duration_min,
       COUNT(*) as workout_count
     FROM workout_sessions
     WHERE time_end IS NOT NULL
     GROUP BY year, month
     ORDER BY year ASC, month ASC`
  );

  return (rows as any[]).map((row) => ({
    year: row.year,
    month: row.month,
    label: monthLabel(row.year, row.month),
    avgDurationMin: Math.round(row.avg_duration_min),
    workoutCount: row.workout_count,
  }));
}

// --- Cardio (treadmill 3km run) queries ---

/**
 * Get average 3km run time per month.
 */
export async function getMonthlyRunTime(): Promise<MonthlyRunTime[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT
       CAST(strftime('%Y', ws.date) AS INTEGER) as year,
       CAST(strftime('%m', ws.date) AS INTEGER) as month,
       AVG(cl.duration_seconds) as avg_duration_sec,
       COUNT(*) as run_count
     FROM cardio_logs cl
     JOIN workout_sessions ws ON cl.workout_session_id = ws.id
     WHERE cl.type = 'treadmill_3km'
       AND cl.duration_seconds IS NOT NULL
       AND cl.duration_seconds > 0
     GROUP BY year, month
     ORDER BY year ASC, month ASC`
  );

  return (rows as any[]).map((row) => ({
    year: row.year,
    month: row.month,
    label: monthLabel(row.year, row.month),
    avgDurationSec: Math.round(row.avg_duration_sec),
    runCount: row.run_count,
  }));
}

// --- Per-exercise progress ---

/**
 * Get progress history for a specific exercise across all sessions.
 */
export async function getExerciseProgress(
  exerciseId: string
): Promise<ExerciseProgressPoint[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync(
    `SELECT
       el.workout_session_id,
       ws.date,
       el.set_type,
       el.set_number,
       el.actual_reps,
       el.weight,
       el.is_skipped
     FROM exercise_logs el
     JOIN workout_sessions ws ON el.workout_session_id = ws.id
     WHERE el.exercise_id = ?
       AND ws.time_end IS NOT NULL
     ORDER BY ws.date ASC, el.set_number ASC`,
    [exerciseId]
  );

  // Group by session
  const sessionMap = new Map<
    string,
    {
      date: string;
      workingWeight: number | null;
      workingReps: number[];
      totalKg: number;
      isSkipped: boolean;
    }
  >();

  for (const row of rows as any[]) {
    const sessionId = row.workout_session_id;

    if (!sessionMap.has(sessionId)) {
      sessionMap.set(sessionId, {
        date: row.date,
        workingWeight: null,
        workingReps: [],
        totalKg: 0,
        isSkipped: false,
      });
    }

    const entry = sessionMap.get(sessionId)!;

    if (row.is_skipped === 1) {
      entry.isSkipped = true;
      continue;
    }

    if (row.set_type === 'working') {
      entry.workingReps.push(row.actual_reps);
      if (row.weight > 0) {
        entry.workingWeight = row.weight;
      }
    }

    if (row.weight > 0 && row.actual_reps > 0) {
      entry.totalKg += row.weight * row.actual_reps;
    }
  }

  const result: ExerciseProgressPoint[] = [];
  for (const [sessionId, entry] of sessionMap) {
    // Skip sessions where exercise was skipped
    if (entry.isSkipped) continue;

    result.push({
      date: entry.date,
      sessionId,
      workingWeight: entry.workingWeight,
      workingReps: entry.workingReps,
      totalWorkingReps: entry.workingReps.reduce((s, r) => s + r, 0),
      totalKg: entry.totalKg,
    });
  }

  return result;
}

// --- Exercise list for picker ---

export interface ExercisePickerItem {
  id: string;
  name: string;
  dayTypeId: DayTypeId;
  hasAddedWeight: boolean;
}

/**
 * Get all exercises (active and with history) for the exercise picker.
 */
export async function getAllExercisesForPicker(): Promise<ExercisePickerItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT DISTINCT e.id, e.name, e.day_type_id, e.has_added_weight, e.sort_order
     FROM exercises e
     WHERE e.is_active = 1
     ORDER BY e.day_type_id, e.sort_order`
  );

  return (rows as any[]).map((row) => ({
    id: row.id,
    name: row.name,
    dayTypeId: row.day_type_id as DayTypeId,
    hasAddedWeight: row.has_added_weight === 1,
  }));
}

// --- Period comparison helper ---

/**
 * Compare tonnage between two months.
 */
export async function compareTonnageMonths(
  year1: number,
  month1: number,
  year2: number,
  month2: number,
  dayTypeId?: DayTypeId
): Promise<PeriodComparison> {
  const all = await getMonthlyTonnage(dayTypeId);

  const p1 = all.find((m) => m.year === year1 && m.month === month1);
  const p2 = all.find((m) => m.year === year2 && m.month === month2);

  const v1 = p1?.avgTotalKg ?? 0;
  const v2 = p2?.avgTotalKg ?? 0;

  const changePercent = v1 > 0 ? ((v2 - v1) / v1) * 100 : 0;

  return {
    period1Label: monthLabel(year1, month1),
    period2Label: monthLabel(year2, month2),
    period1Value: v1,
    period2Value: v2,
    changePercent: Math.round(changePercent * 10) / 10,
  };
}
