// ==========================================
// Инициализация базы данных
// ==========================================

import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, SEED_DAY_TYPES_SQL, SEED_EXERCISES_SQL } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

async function openAndInit(): Promise<SQLite.SQLiteDatabase> {
  const database = await SQLite.openDatabaseAsync('fittracker.db');

  // Включаем foreign keys
  await database.execAsync('PRAGMA foreign_keys = ON;');

  // Создаём таблицы
  await database.execAsync(CREATE_TABLES_SQL);

  // Заполняем начальные данные
  await database.execAsync(SEED_DAY_TYPES_SQL);

  // Seed-упражнения
  await database.execAsync(SEED_EXERCISES_SQL);

  console.log('Database initialized successfully');
  return database;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    // Check if the connection is still alive
    try {
      await db.getAllAsync('SELECT 1');
      return db;
    } catch {
      // Connection was released — reopen
      console.log('Database connection lost, reopening...');
      db = null;
    }
  }

  db = await openAndInit();
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
