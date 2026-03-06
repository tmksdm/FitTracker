// ==========================================
// SQL-схема базы данных SQLite
// ==========================================

export const CREATE_TABLES_SQL = `
  -- Типы тренировочных дней
  CREATE TABLE IF NOT EXISTS day_types (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    name_ru TEXT NOT NULL,
    current_direction TEXT NOT NULL DEFAULT 'normal'
      CHECK (current_direction IN ('normal', 'reverse'))
  );

  -- Упражнения
  CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    day_type_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    has_added_weight INTEGER NOT NULL DEFAULT 1,
    working_weight REAL,
    weight_increment REAL NOT NULL DEFAULT 2.5,
    warmup_1_offset REAL DEFAULT 20,
    warmup_2_offset REAL DEFAULT 10,
    warmup_1_reps INTEGER NOT NULL DEFAULT 12,
    warmup_2_reps INTEGER NOT NULL DEFAULT 10,
    max_reps_per_set INTEGER NOT NULL DEFAULT 8,
    min_reps_per_set INTEGER NOT NULL DEFAULT 4,
    num_working_sets INTEGER NOT NULL DEFAULT 3,
    is_timed INTEGER NOT NULL DEFAULT 0,
    timer_duration_seconds INTEGER,
    timer_prep_seconds INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (day_type_id) REFERENCES day_types(id)
  );

  -- Тренировочные сессии
  CREATE TABLE IF NOT EXISTS workout_sessions (
    id TEXT PRIMARY KEY,
    day_type_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('normal', 'reverse')),
    weight_before REAL,
    weight_after REAL,
    time_start TEXT NOT NULL,
    time_end TEXT,
    total_kg REAL NOT NULL DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (day_type_id) REFERENCES day_types(id)
  );

  -- Логи подходов
  CREATE TABLE IF NOT EXISTS exercise_logs (
    id TEXT PRIMARY KEY,
    workout_session_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    set_number INTEGER NOT NULL,
    set_type TEXT NOT NULL CHECK (set_type IN ('warmup', 'working')),
    target_reps INTEGER NOT NULL,
    actual_reps INTEGER NOT NULL DEFAULT 0,
    weight REAL NOT NULL DEFAULT 0,
    is_skipped INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    FOREIGN KEY (workout_session_id) REFERENCES workout_sessions(id),
    FOREIGN KEY (exercise_id) REFERENCES exercises(id)
  );

  -- Кардио логи
  CREATE TABLE IF NOT EXISTS cardio_logs (
    id TEXT PRIMARY KEY,
    workout_session_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('jump_rope', 'treadmill_3km')),
    duration_seconds INTEGER,
    count INTEGER,
    FOREIGN KEY (workout_session_id) REFERENCES workout_sessions(id)
  );

  -- Индексы для быстрых запросов
  CREATE INDEX IF NOT EXISTS idx_exercises_day_type
    ON exercises(day_type_id);
  CREATE INDEX IF NOT EXISTS idx_workout_sessions_day_type
    ON workout_sessions(day_type_id);
  CREATE INDEX IF NOT EXISTS idx_workout_sessions_date
    ON workout_sessions(date);
  CREATE INDEX IF NOT EXISTS idx_exercise_logs_session
    ON exercise_logs(workout_session_id);
  CREATE INDEX IF NOT EXISTS idx_exercise_logs_exercise
    ON exercise_logs(exercise_id);
  CREATE INDEX IF NOT EXISTS idx_cardio_logs_session
    ON cardio_logs(workout_session_id);
`;

// Начальные данные — три типа дней
export const SEED_DAY_TYPES_SQL = `
  INSERT OR IGNORE INTO day_types (id, name, name_ru, current_direction) VALUES
    (1, 'Legs',  'День ног',           'normal'),
    (2, 'Back',  'День становой тяги', 'normal'),
    (3, 'Bench', 'День жима',          'normal');
`;
