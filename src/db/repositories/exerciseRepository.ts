// ==========================================
// Репозиторий: Упражнения
// ==========================================

import { getDatabase, generateId } from '../database';
import { Exercise, DayTypeId } from '../../types';

// Маппинг строки БД → объект Exercise
function mapRow(row: any): Exercise {
  return {
    id: row.id,
    dayTypeId: row.day_type_id as DayTypeId,
    name: row.name,
    sortOrder: row.sort_order,
    hasAddedWeight: row.has_added_weight === 1,
    workingWeight: row.working_weight,
    weightIncrement: row.weight_increment,
    warmup1Offset: row.warmup_1_offset,
    warmup2Offset: row.warmup_2_offset,
    warmup1Reps: row.warmup_1_reps,
    warmup2Reps: row.warmup_2_reps,
    maxRepsPerSet: row.max_reps_per_set,
    minRepsPerSet: row.min_reps_per_set,
    numWorkingSets: row.num_working_sets,
    isTimed: row.is_timed === 1,
    timerDurationSeconds: row.timer_duration_seconds,
    timerPrepSeconds: row.timer_prep_seconds,
    isActive: row.is_active === 1,
  };
}

// Получить все активные упражнения для типа дня
export async function getExercisesByDayType(
  dayTypeId: DayTypeId
): Promise<Exercise[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    'SELECT * FROM exercises WHERE day_type_id = ? AND is_active = 1 ORDER BY sort_order',
    [dayTypeId]
  );
  return rows.map(mapRow);
}

// Получить упражнение по id
export async function getExerciseById(id: string): Promise<Exercise | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    'SELECT * FROM exercises WHERE id = ?',
    [id]
  );
  if (!row) return null;
  return mapRow(row);
}

// Создать новое упражнение
export async function createExercise(
  data: Omit<Exercise, 'id'>
): Promise<Exercise> {
  const db = await getDatabase();
  const id = generateId();

  await db.runAsync(
    `INSERT INTO exercises (
      id, day_type_id, name, sort_order, has_added_weight,
      working_weight, weight_increment, warmup_1_offset, warmup_2_offset,
      warmup_1_reps, warmup_2_reps, max_reps_per_set, min_reps_per_set,
      num_working_sets, is_timed, timer_duration_seconds, timer_prep_seconds,
      is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.dayTypeId,
      data.name,
      data.sortOrder,
      data.hasAddedWeight ? 1 : 0,
      data.workingWeight,
      data.weightIncrement,
      data.warmup1Offset,
      data.warmup2Offset,
      data.warmup1Reps,
      data.warmup2Reps,
      data.maxRepsPerSet,
      data.minRepsPerSet,
      data.numWorkingSets,
      data.isTimed ? 1 : 0,
      data.timerDurationSeconds,
      data.timerPrepSeconds,
      data.isActive ? 1 : 0,
    ]
  );

  return { id, ...data };
}

// Обновить упражнение
export async function updateExercise(
  id: string,
  data: Partial<Exercise>
): Promise<void> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  const fieldMap: Record<string, string> = {
    name: 'name',
    sortOrder: 'sort_order',
    hasAddedWeight: 'has_added_weight',
    workingWeight: 'working_weight',
    weightIncrement: 'weight_increment',
    warmup1Offset: 'warmup_1_offset',
    warmup2Offset: 'warmup_2_offset',
    warmup1Reps: 'warmup_1_reps',
    warmup2Reps: 'warmup_2_reps',
    maxRepsPerSet: 'max_reps_per_set',
    minRepsPerSet: 'min_reps_per_set',
    numWorkingSets: 'num_working_sets',
    isTimed: 'is_timed',
    timerDurationSeconds: 'timer_duration_seconds',
    timerPrepSeconds: 'timer_prep_seconds',
    isActive: 'is_active',
  };

  for (const [key, column] of Object.entries(fieldMap)) {
    if (key in data) {
      fields.push(`${column} = ?`);
      let value = (data as any)[key];
      // Конвертируем boolean → 0/1 для SQLite
      if (typeof value === 'boolean') value = value ? 1 : 0;
      values.push(value);
    }
  }

  if (fields.length === 0) return;

  values.push(id);
  await db.runAsync(
    `UPDATE exercises SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

// Мягкое удаление (деактивация)
export async function deactivateExercise(id: string): Promise<void> {
  await updateExercise(id, { isActive: false });
}
