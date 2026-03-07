// ==========================================
// Экспорт данных: JSON и CSV
// ==========================================

import { File, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as Sharing from 'expo-sharing';
import { getDatabase } from '../db';

// ---- Types for JSON export ----

interface ExportData {
  exportedAt: string;
  version: 1;
  dayTypes: any[];
  exercises: any[];
  workoutSessions: any[];
  exerciseLogs: any[];
  cardioLogs: any[];
}

// ---- JSON Export ----

/**
 * Export all database tables as a single JSON file and open share dialog.
 */
export async function exportAsJSON(): Promise<void> {
  const db = await getDatabase();

  // Fetch all tables in parallel
  const [dayTypes, exercises, sessions, logs, cardio] = await Promise.all([
    db.getAllAsync('SELECT * FROM day_types ORDER BY id'),
    db.getAllAsync('SELECT * FROM exercises ORDER BY day_type_id, sort_order'),
    db.getAllAsync('SELECT * FROM workout_sessions ORDER BY date DESC'),
    db.getAllAsync(
      'SELECT * FROM exercise_logs ORDER BY workout_session_id, exercise_id, set_number'
    ),
    db.getAllAsync('SELECT * FROM cardio_logs ORDER BY workout_session_id'),
  ]);

  const data: ExportData = {
    exportedAt: new Date().toISOString(),
    version: 1,
    dayTypes,
    exercises,
    workoutSessions: sessions,
    exerciseLogs: logs,
    cardioLogs: cardio,
  };

  const json = JSON.stringify(data, null, 2);
  const fileName = `fittracker_backup_${formatDateForFile(new Date())}.json`;

  const file = new File(Paths.cache, fileName);
  file.write(json);

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Экспорт FitTracker (JSON)',
    UTI: 'public.json',
  });
}

// ---- CSV Export ----

/**
 * Export data as CSV files (one per day type) and share them.
 * Format mirrors the original Excel spreadsheet:
 * - First column: exercise name
 * - Subsequent columns: grouped by workout date, each has sub-columns for set results
 */
export async function exportAsCSV(): Promise<void> {
  const db = await getDatabase();

  const dayTypes = await db.getAllAsync<{
    id: number;
    name: string;
    name_ru: string;
  }>('SELECT * FROM day_types ORDER BY id');

  const files: File[] = [];

  for (const dayType of dayTypes) {
    const csv = await buildCSVForDayType(db, dayType.id, dayType.name_ru);
    const fileName = `fittracker_${dayType.name.toLowerCase()}_${formatDateForFile(new Date())}.csv`;

    // BOM for Excel to recognize UTF-8
    const bom = '\uFEFF';
    const file = new File(Paths.cache, fileName);
    file.write(bom + csv);

    files.push(file);
  }

  // Share files one by one (expo-sharing doesn't support multiple files)
  for (const file of files) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Экспорт FitTracker (CSV)',
      UTI: 'public.comma-separated-values-text',
    });
  }
}

// ---- CSV builder for one day type ----

/**
 * Builds a flat CSV table for a single day type.
 *
 * Rows: one row per exercise
 * Columns:
 *   Упражнение | Рабочий вес |
 *   <Date1>: Р1 Р2 Р3 (working set reps) |
 *   <Date2>: Р1 Р2 Р3 |
 *   ...
 *
 * This gives a compact view similar to the original spreadsheet.
 */
async function buildCSVForDayType(
  db: SQLiteDatabase,
  dayTypeId: number,
  dayTypeNameRu: string
): Promise<string> {
  // 1. Get all exercises for this day type (including inactive for history)
  const exercises = await db.getAllAsync<{
    id: string;
    name: string;
    sort_order: number;
    working_weight: number | null;
    has_added_weight: number;
    is_active: number;
  }>(
    'SELECT id, name, sort_order, working_weight, has_added_weight, is_active FROM exercises WHERE day_type_id = ? ORDER BY sort_order',
    [dayTypeId]
  );

  // 2. Get all completed sessions for this day type, ordered by date
  const sessions = await db.getAllAsync<{
    id: string;
    date: string;
    direction: string;
    weight_before: number | null;
    weight_after: number | null;
    total_kg: number;
  }>(
    `SELECT id, date, direction, weight_before, weight_after, total_kg
     FROM workout_sessions
     WHERE day_type_id = ? AND time_end IS NOT NULL
     ORDER BY date ASC`,
    [dayTypeId]
  );

  if (sessions.length === 0) {
    // No data — just exercise names
    const rows = [
      `${dayTypeNameRu};Нет данных`,
      ...exercises.map((e: any) => e.name),
    ];
    return rows.join('\n');
  }

  // 3. For each session, get all exercise logs grouped by exercise
  const sessionLogs = new Map<
    string,
    Map<string, { weight: number; reps: number; setType: string; isSkipped: number }[]>
  >();

  for (const session of sessions) {
    const logs = await db.getAllAsync<{
      exercise_id: string;
      set_number: number;
      set_type: string;
      actual_reps: number;
      weight: number;
      is_skipped: number;
    }>(
      `SELECT exercise_id, set_number, set_type, actual_reps, weight, is_skipped
       FROM exercise_logs
       WHERE workout_session_id = ?
       ORDER BY exercise_id, set_number`,
      [session.id]
    );

    const exerciseMap = new Map<
      string,
      { weight: number; reps: number; setType: string; isSkipped: number }[]
    >();

    for (const log of logs) {
      if (!exerciseMap.has(log.exercise_id)) {
        exerciseMap.set(log.exercise_id, []);
      }
      exerciseMap.get(log.exercise_id)!.push({
        weight: log.weight,
        reps: log.actual_reps,
        setType: log.set_type,
        isSkipped: log.is_skipped,
      });
    }

    sessionLogs.set(session.id, exerciseMap);
  }

  // 4. Build CSV

  // Header row 1: day type name + empty + date columns
  const headerRow1: string[] = [dayTypeNameRu, 'Вес'];
  for (const session of sessions) {
    const dateStr = formatDateShort(session.date);
    const dir = session.direction === 'normal' ? '→' : '←';
    headerRow1.push(`${dateStr} ${dir}`);
    // Add empty columns for additional set data
    headerRow1.push('');
    headerRow1.push('');
  }

  // Header row 2: exercise / weight / per-session: P1 P2 P3
  const headerRow2: string[] = ['Упражнение', 'Раб. вес'];
  for (const _session of sessions) {
    headerRow2.push('Р1');
    headerRow2.push('Р2');
    headerRow2.push('Р3');
  }

  // Data rows: one per exercise
  const dataRows: string[][] = [];
  for (const exercise of exercises) {
    const row: string[] = [
      exercise.name,
      exercise.has_added_weight && exercise.working_weight !== null
        ? formatDecimal(exercise.working_weight)
        : '',
    ];

    for (const session of sessions) {
      const exerciseLogs = sessionLogs.get(session.id)?.get(exercise.id);

      if (!exerciseLogs || exerciseLogs.length === 0) {
        // Exercise not in this session
        row.push('');
        row.push('');
        row.push('');
      } else if (exerciseLogs[0].isSkipped === 1) {
        // Skipped
        row.push('0');
        row.push('');
        row.push('');
      } else {
        // Get working sets only
        const workingSets = exerciseLogs.filter((l) => l.setType === 'working');
        row.push(workingSets[0]?.reps?.toString() ?? '');
        row.push(workingSets[1]?.reps?.toString() ?? '');
        row.push(workingSets[2]?.reps?.toString() ?? '');
      }
    }

    dataRows.push(row);
  }

  // Summary rows: body weight, tonnage
  const weightRow: string[] = ['Вес тела', ''];
  const tonnageRow: string[] = ['Тоннаж', ''];
  for (const session of sessions) {
    const avgWeight =
      session.weight_before !== null && session.weight_after !== null
        ? (session.weight_before + session.weight_after) / 2
        : session.weight_before ?? session.weight_after ?? null;
    weightRow.push(avgWeight !== null ? formatDecimal(avgWeight) : '');
    weightRow.push('');
    weightRow.push('');

    tonnageRow.push(session.total_kg.toString());
    tonnageRow.push('');
    tonnageRow.push('');
  }

  // Cardio row
  const cardioRow: string[] = [dayTypeId === 1 ? 'Скакалка' : 'Бег 3 км', ''];
  for (const session of sessions) {
    const cardio = await db.getFirstAsync<{
      type: string;
      duration_seconds: number | null;
      count: number | null;
    }>(
      'SELECT type, duration_seconds, count FROM cardio_logs WHERE workout_session_id = ?',
      [session.id]
    );

    if (!cardio) {
      cardioRow.push('');
    } else if (cardio.type === 'jump_rope') {
      cardioRow.push(cardio.count?.toString() ?? '');
    } else {
      cardioRow.push(
        cardio.duration_seconds ? formatSecondsToMMSS(cardio.duration_seconds) : ''
      );
    }
    cardioRow.push('');
    cardioRow.push('');
  }

  // Combine all rows
  const allRows = [
    headerRow1,
    headerRow2,
    ...dataRows,
    [], // empty separator row
    weightRow,
    tonnageRow,
    cardioRow,
  ];

  // Convert to CSV with semicolon separator (better for Excel with Russian locale)
  return allRows.map((row) => row.join(';')).join('\n');
}

// ---- Helpers ----

function formatDateForFile(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateShort(isoDate: string): string {
  const d = new Date(isoDate);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}.${month}.${year}`;
}

function formatDecimal(value: number): string {
  // Russian comma as decimal separator
  return value.toString().replace('.', ',');
}

function formatSecondsToMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
