// ==========================================
// Импорт данных из JSON-бэкапа
// ==========================================

import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { getDatabase } from '../db';

// ---- Types ----

/** Shape of our exported JSON (from exportAsJSON) */
interface BackupData {
  exportedAt: string;
  version: number;
  dayTypes: any[];
  exercises: any[];
  workoutSessions: any[];
  exerciseLogs: any[];
  cardioLogs: any[];
}

/** Preview info shown to user before confirming import */
export interface ImportPreview {
  exportedAt: string;
  exerciseCount: number;
  sessionCount: number;
  logCount: number;
  cardioCount: number;
  dateRange: string; // e.g. "12.11.2024 — 08.03.2026"
  raw: BackupData;
}

// ---- Pick & Parse ----

/**
 * Opens file picker, reads JSON, validates structure,
 * returns a preview object (or null if user cancelled).
 */
export async function pickAndParseBackup(): Promise<ImportPreview | null> {
  // 1. Open file picker
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled || result.assets.length === 0) {
    return null; // user cancelled
  }

  const asset = result.assets[0];

  // 2. Read file content
  //    expo-document-picker copies the file to cache, we read from there.
  //    Use the new expo-file-system API.
  const file = new File(asset.uri);
  const content = await file.text();

  // 3. Parse JSON
  let data: BackupData;
  try {
    data = JSON.parse(content);
  } catch {
    throw new Error('Файл повреждён или не является JSON.');
  }

  // 4. Validate structure
  if (!data.version || !data.workoutSessions || !data.exerciseLogs) {
    throw new Error(
      'Файл не похож на бэкап FitTracker. Отсутствуют обязательные поля.'
    );
  }

  if (!Array.isArray(data.workoutSessions) || !Array.isArray(data.exerciseLogs)) {
    throw new Error('Некорректный формат данных в файле бэкапа.');
  }

  // 5. Build preview
  let dateRange = 'нет данных';
  if (data.workoutSessions.length > 0) {
    // Sessions should be sorted by date DESC in our export,
    // but let's not assume — find min/max manually
    const dates = data.workoutSessions
      .map((s: any) => s.date || s.time_start)
      .filter(Boolean)
      .map((d: string) => new Date(d).getTime())
      .filter((t: number) => !isNaN(t));

    if (dates.length > 0) {
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      dateRange = `${formatDateRu(minDate)} — ${formatDateRu(maxDate)}`;
    }
  }

  return {
    exportedAt: data.exportedAt ?? 'неизвестно',
    exerciseCount: data.exercises?.length ?? 0,
    sessionCount: data.workoutSessions.length,
    logCount: data.exerciseLogs.length,
    cardioCount: data.cardioLogs?.length ?? 0,
    dateRange,
    raw: data,
  };
}

// ---- Restore ----

/**
 * Replaces ALL app data (exercises, sessions, logs, cardio) with the backup.
 * Day types are NOT replaced (they are always the same 3 rows).
 */
export async function restoreFromBackup(data: BackupData): Promise<void> {
  const db = await getDatabase();

  await db.execAsync('PRAGMA foreign_keys = OFF');
  await db.execAsync('BEGIN TRANSACTION');

  try {
    // 1. Clear existing data (order matters due to foreign keys)
    await db.execAsync('DELETE FROM cardio_logs');
    await db.execAsync('DELETE FROM exercise_logs');
    await db.execAsync('DELETE FROM workout_sessions');
    await db.execAsync('DELETE FROM exercises');

    // 2. Insert exercises
    for (const e of data.exercises) {
      await db.runAsync(
        `INSERT INTO exercises
          (id, day_type_id, name, sort_order, has_added_weight,
           working_weight, weight_increment,
           warmup_1_percent, warmup_2_percent,
           warmup_1_reps, warmup_2_reps,
           max_reps_per_set, min_reps_per_set,
           num_working_sets, is_timed,
           timer_duration_seconds, timer_prep_seconds, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          e.id,
          e.day_type_id,
          e.name,
          e.sort_order,
          e.has_added_weight,
          e.working_weight,
          e.weight_increment,
          e.warmup_1_percent,
          e.warmup_2_percent,
          e.warmup_1_reps,
          e.warmup_2_reps,
          e.max_reps_per_set,
          e.min_reps_per_set,
          e.num_working_sets,
          e.is_timed,
          e.timer_duration_seconds,
          e.timer_prep_seconds,
          e.is_active,
        ]
      );
    }

    // 3. Insert workout sessions
    for (const s of data.workoutSessions) {
      await db.runAsync(
        `INSERT INTO workout_sessions
          (id, day_type_id, date, direction, weight_before, weight_after,
           time_start, time_end, total_kg, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          s.id,
          s.day_type_id,
          s.date,
          s.direction,
          s.weight_before,
          s.weight_after,
          s.time_start,
          s.time_end,
          s.total_kg,
          s.notes,
        ]
      );
    }

    // 4. Insert exercise logs (batch for speed)
    const LOG_BATCH = 50;
    for (let i = 0; i < data.exerciseLogs.length; i += LOG_BATCH) {
      const batch = data.exerciseLogs.slice(i, i + LOG_BATCH);
      const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const params: any[] = [];
      for (const l of batch) {
        params.push(
          l.id,
          l.workout_session_id,
          l.exercise_id,
          l.set_number,
          l.set_type,
          l.target_reps,
          l.actual_reps,
          l.weight,
          l.is_skipped,
          l.completed_at
        );
      }
      await db.runAsync(
        `INSERT INTO exercise_logs
          (id, workout_session_id, exercise_id, set_number, set_type,
           target_reps, actual_reps, weight, is_skipped, completed_at)
         VALUES ${placeholders}`,
        params
      );
    }

    // 5. Insert cardio logs
    if (data.cardioLogs && data.cardioLogs.length > 0) {
      for (let i = 0; i < data.cardioLogs.length; i += LOG_BATCH) {
        const batch = data.cardioLogs.slice(i, i + LOG_BATCH);
        const placeholders = batch.map(() => '(?, ?, ?, ?, ?)').join(', ');
        const params: any[] = [];
        for (const c of batch) {
          params.push(
            c.id,
            c.workout_session_id,
            c.type,
            c.duration_seconds,
            c.count
          );
        }
        await db.runAsync(
          `INSERT INTO cardio_logs
            (id, workout_session_id, type, duration_seconds, count)
           VALUES ${placeholders}`,
          params
        );
      }
    }

    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON');
  }
}

// ---- Helpers ----

function formatDateRu(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}
