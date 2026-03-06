// ==========================================
// Инициализация базы данных
// ==========================================

import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, SEED_DAY_TYPES_SQL } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync('fittracker.db');

  // Включаем foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Создаём таблицы
  await db.execAsync(CREATE_TABLES_SQL);

  // Заполняем начальные данные
  await db.execAsync(SEED_DAY_TYPES_SQL);

  console.log('Database initialized successfully');
  return db;
}

// Утилита для генерации UUID
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
