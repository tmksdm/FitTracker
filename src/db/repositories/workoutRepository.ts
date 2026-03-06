// ==========================================
// Репозиторий: Тренировочные сессии
// ==========================================

import { getDatabase, generateId } from '../database';
import {
  WorkoutSession,
  ExerciseLog,
  CardioLog,
  DayTypeId,
  Direction,
  SetType,
  CardioType,
} from '../../types';

// --- Тренировочные сессии ---

function mapSessionRow(row: any): WorkoutSession {
  return {
    id: row.id,
    dayTypeId: row.day_type_id as DayTypeId,
    date: row.date,
    direction: row.direction as Direction,
    weightBefore: row.weight_before,
    weightAfter: row.weight_after,
    timeStart: row.time_start,
    timeEnd: row.time_end,
    totalKg: row.total_kg,
    notes: row.notes,
  };
}

export async function createWorkoutSession(data: {
  dayTypeId: DayTypeId;
  direction: Direction;
  weightBefore: number | null;
}): Promise<WorkoutSession> {
  const db = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO workout_sessions
      (id, day_type_id, date, direction, weight_before, time_start, total_kg)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [id, data.dayTypeId, now, data.direction, data.weightBefore, now]
  );

  return {
    id,
    dayTypeId: data.dayTypeId,
    date: now,
    direction: data.direction,
    weightBefore: data.weightBefore,
    weightAfter: null,
    timeStart: now,
    timeEnd: null,
    totalKg: 0,
    notes: null,
  };
}

export async function finishWorkoutSession(
  id: string,
  weightAfter: number | null
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  // Считаем общий тоннаж
  const result = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(weight * actual_reps), 0) as total
     FROM exercise_logs
     WHERE workout_session_id = ? AND is_skipped = 0 AND weight > 0`,
    [id]
  );

  const totalKg = result?.total ?? 0;

  await db.runAsync(
    `UPDATE workout_sessions
     SET time_end = ?, weight_after = ?, total_kg = ?
     WHERE id = ?`,
    [now, weightAfter, totalKg, id]
  );
}

export async function getWorkoutSessionById(
  id: string
): Promise<WorkoutSession | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    'SELECT * FROM workout_sessions WHERE id = ?',
    [id]
  );
  if (!row) return null;
  return mapSessionRow(row);
}

export async function getLastSessionByDayType(
  dayTypeId: DayTypeId
): Promise<WorkoutSession | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    `SELECT * FROM workout_sessions
     WHERE day_type_id = ?
     ORDER BY date DESC LIMIT 1`,
    [dayTypeId]
  );
  if (!row) return null;
  return mapSessionRow(row);
}

export async function getAllSessions(
  limit?: number
): Promise<WorkoutSession[]> {
  const db = await getDatabase();
  const query = limit
    ? 'SELECT * FROM workout_sessions ORDER BY date DESC LIMIT ?'
    : 'SELECT * FROM workout_sessions ORDER BY date DESC';
  const params = limit ? [limit] : [];
  const rows = await db.getAllAsync(query, params);
  return rows.map(mapSessionRow);
}

// --- Логи подходов ---

function mapLogRow(row: any): ExerciseLog {
  return {
    id: row.id,
    workoutSessionId: row.workout_session_id,
    exerciseId: row.exercise_id,
    setNumber: row.set_number,
    setType: row.set_type as SetType,
    targetReps: row.target_reps,
    actualReps: row.actual_reps,
    weight: row.weight,
    isSkipped: row.is_skipped === 1,
    completedAt: row.completed_at,
  };
}

export async function createExerciseLog(data: {
  workoutSessionId: string;
  exerciseId: string;
  setNumber: number;
  setType: SetType;
  targetReps: number;
  actualReps: number;
  weight: number;
  isSkipped: boolean;
}): Promise<ExerciseLog> {
  const db = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO exercise_logs
      (id, workout_session_id, exercise_id, set_number, set_type,
       target_reps, actual_reps, weight, is_skipped, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.workoutSessionId,
      data.exerciseId,
      data.setNumber,
      data.setType,
      data.targetReps,
      data.actualReps,
      data.weight,
      data.isSkipped ? 1 : 0,
      now,
    ]
  );

  return {
    id,
    ...data,
    completedAt: now,
  };
}

export async function updateExerciseLog(
  id: string,
  actualReps: number
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE exercise_logs SET actual_reps = ? WHERE id = ?',
    [actualReps, id]
  );
}

export async function getLogsBySession(
  sessionId: string
): Promise<ExerciseLog[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM exercise_logs
     WHERE workout_session_id = ?
     ORDER BY exercise_id, set_number`,
    [sessionId]
  );
  return rows.map(mapLogRow);
}

// Получить логи для конкретного упражнения в конкретной сессии
export async function getLogsBySessionAndExercise(
  sessionId: string,
  exerciseId: string
): Promise<ExerciseLog[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM exercise_logs
     WHERE workout_session_id = ? AND exercise_id = ?
     ORDER BY set_number`,
    [sessionId, exerciseId]
  );
  return rows.map(mapLogRow);
}

// Получить последние рабочие подходы для упражнения (для расчёта прогрессии)
export async function getLastWorkingLogsForExercise(
  exerciseId: string
): Promise<ExerciseLog[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT el.* FROM exercise_logs el
     JOIN workout_sessions ws ON el.workout_session_id = ws.id
     WHERE el.exercise_id = ?
       AND el.set_type = 'working'
       AND el.is_skipped = 0
     ORDER BY ws.date DESC
     LIMIT 3`,
    [exerciseId]
  );
  return rows.map(mapLogRow);
}

// Проверить, было ли упражнение пропущено в последней сессии этого типа дня
export async function wasExerciseSkippedLastSession(
  exerciseId: string,
  dayTypeId: DayTypeId
): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ is_skipped: number }>(
    `SELECT el.is_skipped FROM exercise_logs el
     JOIN workout_sessions ws ON el.workout_session_id = ws.id
     WHERE el.exercise_id = ?
       AND ws.day_type_id = ?
     ORDER BY ws.date DESC
     LIMIT 1`,
    [exerciseId, dayTypeId]
  );
  return row?.is_skipped === 1;
}

// --- Кардио ---

function mapCardioRow(row: any): CardioLog {
  return {
    id: row.id,
    workoutSessionId: row.workout_session_id,
    type: row.type as CardioType,
    durationSeconds: row.duration_seconds,
    count: row.count,
  };
}

export async function createCardioLog(data: {
  workoutSessionId: string;
  type: CardioType;
  durationSeconds: number | null;
  count: number | null;
}): Promise<CardioLog> {
  const db = await getDatabase();
  const id = generateId();

  await db.runAsync(
    `INSERT INTO cardio_logs (id, workout_session_id, type, duration_seconds, count)
     VALUES (?, ?, ?, ?, ?)`,
    [id, data.workoutSessionId, data.type, data.durationSeconds, data.count]
  );

  return { id, ...data };
}

export async function getCardioBySession(
  sessionId: string
): Promise<CardioLog[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    'SELECT * FROM cardio_logs WHERE workout_session_id = ?',
    [sessionId]
  );
  return rows.map(mapCardioRow);
}

// --- Сводка упражнений для экрана итогов ---

export interface ExerciseSummary {
  exerciseId: string;
  exerciseName: string;
  hasAddedWeight: boolean;
  workingWeight: number | null;
  sets: ExerciseLog[];
  isSkipped: boolean;
  totalKg: number;
}

export async function getSessionExerciseSummary(
  sessionId: string
): Promise<ExerciseSummary[]> {
  const db = await getDatabase();

  // Get all logs for this session, joined with exercise name
  const rows = await db.getAllAsync(
    `SELECT el.*, e.name as exercise_name, e.has_added_weight, e.working_weight
     FROM exercise_logs el
     JOIN exercises e ON el.exercise_id = e.id
     WHERE el.workout_session_id = ?
     ORDER BY e.sort_order, el.set_number`,
    [sessionId]
  );

  // Group by exerciseId
  const grouped = new Map<string, ExerciseSummary>();

  for (const row of rows as any[]) {
    const log = mapLogRow(row);
    const exerciseId = log.exerciseId;

    if (!grouped.has(exerciseId)) {
      grouped.set(exerciseId, {
        exerciseId,
        exerciseName: row.exercise_name,
        hasAddedWeight: row.has_added_weight === 1,
        workingWeight: row.working_weight,
        sets: [],
        isSkipped: false,
        totalKg: 0,
      });
    }

    const summary = grouped.get(exerciseId)!;
    summary.sets.push(log);

    if (log.isSkipped) {
      summary.isSkipped = true;
    }

    if (log.weight > 0 && log.actualReps > 0 && !log.isSkipped) {
      summary.totalKg += log.weight * log.actualReps;
    }
  }

  return Array.from(grouped.values());
}
