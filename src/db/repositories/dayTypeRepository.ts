// ==========================================
// Репозиторий: Типы тренировочных дней
// ==========================================

import { getDatabase } from '../database';
import { DayType, DayTypeId, Direction } from '../../types';

// Получить все типы дней
export async function getAllDayTypes(): Promise<DayType[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: number;
    name: string;
    name_ru: string;
    current_direction: string;
  }>('SELECT * FROM day_types ORDER BY id');

  return rows.map((row) => ({
    id: row.id as DayTypeId,
    name: row.name,
    nameRu: row.name_ru,
    currentDirection: row.current_direction as Direction,
  }));
}

// Получить один тип дня по id
export async function getDayTypeById(id: DayTypeId): Promise<DayType | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    id: number;
    name: string;
    name_ru: string;
    current_direction: string;
  }>('SELECT * FROM day_types WHERE id = ?', [id]);

  if (!row) return null;

  return {
    id: row.id as DayTypeId,
    name: row.name,
    nameRu: row.name_ru,
    currentDirection: row.current_direction as Direction,
  };
}

// Переключить направление для типа дня
export async function toggleDirection(id: DayTypeId): Promise<Direction> {
  const db = await getDatabase();
  const dayType = await getDayTypeById(id);
  if (!dayType) throw new Error(`DayType ${id} not found`);

  const newDirection: Direction =
    dayType.currentDirection === 'normal' ? 'reverse' : 'normal';

  await db.runAsync(
    'UPDATE day_types SET current_direction = ? WHERE id = ?',
    [newDirection, id]
  );

  return newDirection;
}

// Определить, какой тип дня следующий (на основе последней тренировки)
export async function getNextDayTypeId(): Promise<DayTypeId> {
  const db = await getDatabase();
  const lastSession = await db.getFirstAsync<{ day_type_id: number }>(
    'SELECT day_type_id FROM workout_sessions ORDER BY date DESC LIMIT 1'
  );

  if (!lastSession) return 1; // Первая тренировка — начинаем с ног

  const lastDayType = lastSession.day_type_id as DayTypeId;
  // Ротация: 1 → 2 → 3 → 1 → ...
  const nextMap: Record<DayTypeId, DayTypeId> = { 1: 2, 2: 3, 3: 1 };
  return nextMap[lastDayType];
}
