// ==========================================
// Типы данных для FitTracker
// ==========================================

// --- Тип тренировочного дня ---

export type DayTypeId = 1 | 2 | 3;

export type Direction = 'normal' | 'reverse';

export interface DayType {
  id: DayTypeId;
  name: string;
  nameRu: string;
  currentDirection: Direction;
}

// --- Упражнение ---

export interface Exercise {
  id: string;
  dayTypeId: DayTypeId;
  name: string;
  sortOrder: number;
  hasAddedWeight: boolean;
  workingWeight: number | null;
  weightIncrement: number;        // шаг изменения веса (по умолчанию 2.5)
  warmup1Percent: number | null;  // % от рабочего веса в разминке 1 (по умолчанию 60)
  warmup2Percent: number | null;  // % от рабочего веса в разминке 2 (по умолчанию 80)
  warmup1Reps: number;            // повторений в разминке 1 (по умолчанию 12)
  warmup2Reps: number;            // повторений в разминке 2 (по умолчанию 10)
  maxRepsPerSet: number;          // максимум повторений в рабочем подходе (по умолчанию 8)
  minRepsPerSet: number;          // минимум повторений в рабочем подходе (по умолчанию 4)
  numWorkingSets: number;         // количество рабочих подходов (по умолчанию 3)
  isTimed: boolean;               // true для скакалки
  timerDurationSeconds: number | null;  // длительность таймера (60 для скакалки)
  timerPrepSeconds: number | null;      // время подготовки (15 для скакалки)
  isActive: boolean;              // false = упражнение удалено (мягкое удаление)
}

// --- Тренировочная сессия ---

export interface WorkoutSession {
  id: string;
  dayTypeId: DayTypeId;
  date: string;                  // ISO datetime
  direction: Direction;
  weightBefore: number | null;
  weightAfter: number | null;
  timeStart: string;             // ISO datetime
  timeEnd: string | null;        // ISO datetime
  totalKg: number;               // общий тоннаж (вес × повторения)
  notes: string | null;
}

// --- Лог подхода ---

export type SetType = 'warmup' | 'working';

export interface ExerciseLog {
  id: string;
  workoutSessionId: string;
  exerciseId: string;
  setNumber: number;             // 1-5 (1-2 разминка, 3-5 рабочие) или 1-3 для bodyweight
  setType: SetType;
  targetReps: number;
  actualReps: number;
  weight: number;
  isSkipped: boolean;
  completedAt: string | null;    // ISO datetime
}

// --- Кардио ---

export type CardioType = 'jump_rope' | 'treadmill_3km';

export interface CardioLog {
  id: string;
  workoutSessionId: string;
  type: CardioType;
  durationSeconds: number | null;   // для бега
  count: number | null;             // для скакалки — количество прыжков
}

// --- Вспомогательные типы для UI ---

export type ExerciseStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

export interface ExerciseWithStatus extends Exercise {
  status: ExerciseStatus;
  isPriority: boolean;           // true если было пропущено в прошлый раз
  sets: ExerciseLog[];
}
