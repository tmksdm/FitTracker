// ==========================================
// Репозиторий: Снапшот активной тренировки
// (crash resilience — persist/restore)
// ==========================================

import { getDatabase } from '../database';
import type { WorkoutSession, CardioType } from '../../types';
import type { ActiveExercise } from '../../stores/workoutStore';

// The shape we persist to the DB as JSON
export interface WorkoutSnapshot {
  session: WorkoutSession;
  exercises: ActiveExercise[];
  currentExerciseIndex: number;
  cardioType: CardioType | null;
  jumpRopeCount: number | null;
  treadmillSeconds: number | null;
  isCardioCompleted: boolean;
  restTimerDefault: number;
}

/**
 * Save (upsert) the active workout state.
 * Uses id=1 as a singleton row — there can only be one active workout.
 */
export async function saveWorkoutState(
  sessionId: string,
  snapshot: WorkoutSnapshot
): Promise<void> {
  const db = await getDatabase();
  const json = JSON.stringify(snapshot);
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO active_workout_state (id, session_id, snapshot, updated_at)
     VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       session_id = excluded.session_id,
       snapshot = excluded.snapshot,
       updated_at = excluded.updated_at`,
    [sessionId, json, now]
  );
}

/**
 * Load the saved workout state, if any.
 * Returns null if there's no saved state.
 */
export async function loadWorkoutState(): Promise<WorkoutSnapshot | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    session_id: string;
    snapshot: string;
    updated_at: string;
  }>('SELECT session_id, snapshot, updated_at FROM active_workout_state WHERE id = 1');

  if (!row) return null;

  try {
    const snapshot = JSON.parse(row.snapshot) as WorkoutSnapshot;
    return snapshot;
  } catch (error) {
    console.error('Failed to parse workout snapshot:', error);
    // Corrupted data — clean up
    await clearWorkoutState();
    return null;
  }
}

/**
 * Delete the saved workout state (called after finish or cancel).
 */
export async function clearWorkoutState(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM active_workout_state WHERE id = 1');
}

/**
 * Check if there's a saved workout state without parsing it.
 * Faster than loadWorkoutState() for just checking existence.
 */
export async function hasWorkoutState(): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM active_workout_state WHERE id = 1'
  );
  return (row?.cnt ?? 0) > 0;
}
