// ==========================================
// Генератор фейковых тренировочных данных
// ==========================================

import { getDatabase, generateId } from './database';
import { DayTypeId, Direction } from '../types';
import { roundToStep } from '../utils/weight';

// --- Configuration ---

/** How many months back from today to generate data */
const MONTHS_BACK = 4;

/** Average days between workouts (randomized ±1) */
const AVG_DAYS_BETWEEN = 2.5;

/** Starting body weight, will drift slightly over time */
const BASE_BODY_WEIGHT = 83;

// --- Seed exercise definitions (must match seed IDs from schema.ts) ---

interface FakeExercise {
  id: string;
  dayTypeId: DayTypeId;
  hasAddedWeight: boolean;
  startWeight: number;   // starting working weight
  weightIncrement: number;
  warmup1Pct: number;
  warmup2Pct: number;
  maxReps: number;
  minReps: number;
}

const FAKE_EXERCISES: FakeExercise[] = [
  // Day 1: Squat
  { id: 'seed-squat-01', dayTypeId: 1, hasAddedWeight: true,  startWeight: 72.5, weightIncrement: 2.5, warmup1Pct: 60, warmup2Pct: 80, maxReps: 8, minReps: 4 },
  { id: 'seed-squat-02', dayTypeId: 1, hasAddedWeight: true,  startWeight: 42.5, weightIncrement: 2.5, warmup1Pct: 60, warmup2Pct: 80, maxReps: 8, minReps: 4 },
  { id: 'seed-squat-03', dayTypeId: 1, hasAddedWeight: true,  startWeight: 25,   weightIncrement: 2.5, warmup1Pct: 60, warmup2Pct: 80, maxReps: 8, minReps: 4 },
  { id: 'seed-squat-04', dayTypeId: 1, hasAddedWeight: false, startWeight: 0,    weightIncrement: 0,   warmup1Pct: 0,  warmup2Pct: 0,  maxReps: 8, minReps: 4 },
  { id: 'seed-squat-05', dayTypeId: 1, hasAddedWeight: true,  startWeight: 35,   weightIncrement: 2.5, warmup1Pct: 60, warmup2Pct: 80, maxReps: 8, minReps: 4 },
  { id: 'seed-squat-06', dayTypeId: 1, hasAddedWeight: false, startWeight: 0,    weightIncrement: 0,   warmup1Pct: 0,  warmup2Pct: 0,  maxReps: 8, minReps: 4 },
  { id: 'seed-squat-07', dayTypeId: 1, hasAddedWeight: false, startWeight: 0,    weightIncrement: 0,   warmup1Pct: 0,  warmup2Pct: 0,  maxReps: 8, minReps: 4 },

  // Day 2: Pull
  { id: 'seed-pull-01', dayTypeId: 2, hasAddedWeight: true,  startWeight: 90,   weightIncrement: 2.5, warmup1Pct: 60, warmup2Pct: 80, maxReps: 8, minReps: 4 },
  { id: 'seed-pull-02', dayTypeId: 2, hasAddedWeight: true,  startWeight: 35,   weightIncrement: 2.5, warmup1Pct: 60, warmup2Pct: 80, maxReps: 8, minReps: 4 },
  { id: 'seed-pull-03', dayTypeId: 2, hasAddedWeight: true,  startWeight: 52.5, weightIncrement: 2.5, warmup1Pct: 60, warmup2Pct: 80, maxReps: 8, minReps: 4 },
  { id: 'seed-pull-04', dayTypeId: 2, hasAddedWeight: true,  startWeight: 30,   weightIncrement: 2.5, warmup1Pct: 60, warmup2Pct: 80, maxReps: 8, minReps: 4 },
  { id: 'seed-pull-05', dayTypeId: 2, hasAddedWeight: true,  startWeight: 20,   weightIncrement: 2.5, warmup1Pct: 60, warmup2Pct: 80, maxReps: 8, minReps: 4 },
  { id: 'seed-pull-06', dayTypeId: 2, hasAddedWeight: false, startWeight: 0,    weightIncrement: 0,   warmup1Pct: 0,  warmup2Pct: 0,  maxReps: 8, minReps: 0 },
  { id: 'seed-pull-07', dayTypeId: 2, hasAddedWeight: false, startWeight: 0,    weightIncrement: 0,   warmup1Pct: 0,  warmup2Pct: 0,  maxReps: 8, minReps: 0 },

  // Day 3: Bench
  { id: 'seed-bench-01', dayTypeId: 3, hasAddedWeight: true,  startWeight: 62.5, weightIncrement: 2.5, warmup1Pct: 60, warmup2Pct: 80, maxReps: 8, minReps: 4 },
  { id: 'seed-bench-02', dayTypeId: 3, hasAddedWeight: true,  startWeight: 50,   weightIncrement: 2.5, warmup1Pct: 60, warmup2Pct: 80, maxReps: 8, minReps: 4 },
  { id: 'seed-bench-03', dayTypeId: 3, hasAddedWeight: true,  startWeight: 10,   weightIncrement: 2,   warmup1Pct: 60, warmup2Pct: 80, maxReps: 8, minReps: 4 },
  { id: 'seed-bench-04', dayTypeId: 3, hasAddedWeight: true,  startWeight: 25,   weightIncrement: 2.5, warmup1Pct: 60, warmup2Pct: 80, maxReps: 8, minReps: 4 },
  { id: 'seed-bench-05', dayTypeId: 3, hasAddedWeight: true,  startWeight: 18,   weightIncrement: 2,   warmup1Pct: 60, warmup2Pct: 80, maxReps: 8, minReps: 4 },
  { id: 'seed-bench-06', dayTypeId: 3, hasAddedWeight: false, startWeight: 0,    weightIncrement: 0,   warmup1Pct: 0,  warmup2Pct: 0,  maxReps: 8, minReps: 4 },
  { id: 'seed-bench-07', dayTypeId: 3, hasAddedWeight: false, startWeight: 0,    weightIncrement: 0,   warmup1Pct: 0,  warmup2Pct: 0,  maxReps: 8, minReps: 0 },
];

// --- Helpers ---

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

/**
 * Generates fake workout history and inserts it directly into the database.
 * Call clearAllWorkoutData() first if you want a clean slate.
 */
export async function seedFakeData(): Promise<number> {
  const db = await getDatabase();

  // Calculate start date
  const now = new Date();
  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() - MONTHS_BACK);
  startDate.setDate(1); // Start from 1st of that month

  // Generate workout dates
  const workoutDates: Date[] = [];
  let cursor = new Date(startDate);
  while (cursor < now) {
    workoutDates.push(new Date(cursor));
    // Next workout in 1-4 days (avg ~2.5)
    const gap = rand(1, 4);
    cursor.setDate(cursor.getDate() + gap);
  }

  // Per-exercise state tracking for progression
  const exerciseState = new Map<
    string,
    { currentWeight: number; lastReps: number[] }
  >();

  // Initialize exercise states
  for (const ex of FAKE_EXERCISES) {
    const startReps = ex.hasAddedWeight
      ? [rand(5, 7), rand(5, 7), rand(5, 7)]
      : [rand(6, 10), rand(6, 10), rand(6, 10)];
    exerciseState.set(ex.id, {
      currentWeight: ex.startWeight,
      lastReps: startReps,
    });
  }

  // Cycle: 1 → 2 → 3 → 1 → ...
  let dayTypeIndex = 0;
  const dayTypeCycle: DayTypeId[] = [1, 2, 3];

  // Direction alternates every workout
  let directionIsNormal = true;

  // Body weight drifts slowly
  let bodyWeight = BASE_BODY_WEIGHT;

  let sessionCount = 0;

  // Batch SQL for performance
  const sessionValues: string[] = [];
  const sessionParams: any[] = [];
  const logValues: string[] = [];
  const logParams: any[] = [];
  const cardioValues: string[] = [];
  const cardioParams: any[] = [];

  for (const date of workoutDates) {
    const dayTypeId = dayTypeCycle[dayTypeIndex % 3];
    dayTypeIndex++;

    const direction: Direction = directionIsNormal ? 'normal' : 'reverse';
    directionIsNormal = !directionIsNormal;

    // Workout time: random start between 7:00 and 18:00
    const startHour = rand(7, 18);
    const startMin = rand(0, 59);
    const timeStart = new Date(date);
    timeStart.setHours(startHour, startMin, 0, 0);

    // Duration: 50-90 minutes
    const durationMin = rand(50, 90);
    const timeEnd = new Date(timeStart.getTime() + durationMin * 60 * 1000);

    // Body weight drifts ±0.3 per session
    bodyWeight += randFloat(-0.3, 0.3);
    bodyWeight = Math.round(bodyWeight * 100) / 100;
    const weightBefore = Math.round((bodyWeight + randFloat(-0.2, 0.5)) * 4) / 4;
    const weightAfter = Math.round((weightBefore - randFloat(0.2, 0.8)) * 4) / 4;

    const sessionId = generateId();

    // Get exercises for this day type
    const dayExercises = FAKE_EXERCISES.filter(
      (e) => e.dayTypeId === dayTypeId
    );

    let sessionTotalKg = 0;

    // ~10% chance to skip one exercise
    const skipIndex = Math.random() < 0.1 ? rand(0, dayExercises.length - 1) : -1;

    for (let ei = 0; ei < dayExercises.length; ei++) {
      const ex = dayExercises[ei];
      const state = exerciseState.get(ex.id)!;
      const isSkipped = ei === skipIndex;

      if (isSkipped) {
        // Insert skipped working sets (3 sets with 0 reps)
        for (let s = 1; s <= 3; s++) {
          const setNum = ex.hasAddedWeight ? s + 2 : s;
          const logId = generateId();
          const completedAt = new Date(
            timeStart.getTime() + rand(5, durationMin - 5) * 60 * 1000
          ).toISOString();

          logValues.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
          logParams.push(
            logId,
            sessionId,
            ex.id,
            setNum,
            'working',
            0,
            0,
            ex.hasAddedWeight ? state.currentWeight : 0,
            1, // is_skipped
            completedAt
          );
        }
        continue;
      }

      // Simulate progression: +1 total rep from last time (sometimes fail)
      const lastTotal = state.lastReps.reduce((a, b) => a + b, 0);
      const failChance = Math.random();
      let newTotal: number;

      if (failChance < 0.08) {
        // 8% chance: bad day, lose some reps
        newTotal = Math.max(
          ex.minReps * 3,
          lastTotal - rand(2, 5)
        );
      } else {
        newTotal = lastTotal + 1;
      }

      // Check weight change
      const maxTotal = ex.maxReps * 3;
      let currentWeight = state.currentWeight;

      if (ex.hasAddedWeight && newTotal > maxTotal) {
        // Weight increase!
        currentWeight += ex.weightIncrement;
        newTotal = maxTotal; // Reset to max reps at new weight
        state.currentWeight = currentWeight;
      } else if (
        ex.hasAddedWeight &&
        newTotal < ex.minReps * 3 &&
        currentWeight > ex.weightIncrement
      ) {
        // Weight decrease
        currentWeight -= ex.weightIncrement;
        newTotal = maxTotal;
        state.currentWeight = currentWeight;
      }

      // Distribute reps across 3 sets
      const base = Math.floor(newTotal / 3);
      const remainder = newTotal % 3;
      const reps = [
        base + (remainder > 0 ? 1 : 0),
        base + (remainder > 1 ? 1 : 0),
        base,
      ];

      state.lastReps = reps;

      // Warmup sets (for weighted exercises)
      if (ex.hasAddedWeight && currentWeight > 0) {
        const w1 = roundToStep(currentWeight * (ex.warmup1Pct / 100));
        const w2 = roundToStep(currentWeight * (ex.warmup2Pct / 100));

        // Warmup 1
        const logId1 = generateId();
        const t1 = new Date(
          timeStart.getTime() + rand(2, 10) * 60 * 1000
        ).toISOString();
        logValues.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        logParams.push(logId1, sessionId, ex.id, 1, 'warmup', 12, 12, w1, 0, t1);
        sessionTotalKg += w1 * 12;

        // Warmup 2
        const logId2 = generateId();
        const t2 = new Date(
          timeStart.getTime() + rand(11, 18) * 60 * 1000
        ).toISOString();
        logValues.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        logParams.push(logId2, sessionId, ex.id, 2, 'warmup', 10, 10, w2, 0, t2);
        sessionTotalKg += w2 * 10;
      }

      // Working sets
      for (let s = 0; s < 3; s++) {
        const setNum = ex.hasAddedWeight ? s + 3 : s + 1;
        const logId = generateId();
        const minuteOffset = rand(15, durationMin - 5);
        const completedAt = new Date(
          timeStart.getTime() + minuteOffset * 60 * 1000
        ).toISOString();

        const weight = ex.hasAddedWeight ? currentWeight : 0;

        logValues.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        logParams.push(
          logId,
          sessionId,
          ex.id,
          setNum,
          'working',
          reps[s],
          reps[s],
          weight,
          0,
          completedAt
        );

        if (weight > 0) {
          sessionTotalKg += weight * reps[s];
        }
      }
    }

    // Cardio
    if (dayTypeId === 1) {
      // Jump rope: 1 min, random jumps 80-140
      const cardioId = generateId();
      cardioValues.push('(?, ?, ?, ?, ?)');
      cardioParams.push(cardioId, sessionId, 'jump_rope', null, rand(80, 140));
    } else {
      // Treadmill 3km: 12-18 minutes
      const cardioId = generateId();
      const runSeconds = rand(12 * 60, 18 * 60);
      cardioValues.push('(?, ?, ?, ?, ?)');
      cardioParams.push(cardioId, sessionId, 'treadmill_3km', runSeconds, null);
    }

    // Session
    sessionValues.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    sessionParams.push(
      sessionId,
      dayTypeId,
      timeStart.toISOString(),
      direction,
      weightBefore,
      weightAfter,
      timeStart.toISOString(),
      timeEnd.toISOString(),
      sessionTotalKg,
      null
    );

    sessionCount++;
  }

  // Execute all inserts in a transaction
  await db.execAsync('BEGIN TRANSACTION');
  try {
    // Insert sessions in batches of 50
    for (let i = 0; i < sessionValues.length; i += 50) {
      const batchValues = sessionValues.slice(i, i + 50);
      const batchParams = sessionParams.slice(i * 10, (i + 50) * 10);
      await db.runAsync(
        `INSERT INTO workout_sessions
          (id, day_type_id, date, direction, weight_before, weight_after,
           time_start, time_end, total_kg, notes)
         VALUES ${batchValues.join(', ')}`,
        batchParams
      );
    }

    // Insert exercise logs in batches of 50
    for (let i = 0; i < logValues.length; i += 50) {
      const batchValues = logValues.slice(i, i + 50);
      const batchParams = logParams.slice(i * 10, (i + 50) * 10);
      await db.runAsync(
        `INSERT INTO exercise_logs
          (id, workout_session_id, exercise_id, set_number, set_type,
           target_reps, actual_reps, weight, is_skipped, completed_at)
         VALUES ${batchValues.join(', ')}`,
        batchParams
      );
    }

    // Insert cardio logs
    if (cardioValues.length > 0) {
      for (let i = 0; i < cardioValues.length; i += 50) {
        const batchValues = cardioValues.slice(i, i + 50);
        const batchParams = cardioParams.slice(i * 5, (i + 50) * 5);
        await db.runAsync(
          `INSERT INTO cardio_logs
            (id, workout_session_id, type, duration_seconds, count)
           VALUES ${batchValues.join(', ')}`,
          batchParams
        );
      }
    }

    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }

  console.log(`Seeded ${sessionCount} fake workout sessions`);
  return sessionCount;
}

/**
 * Clears all workout sessions, exercise logs, and cardio logs.
 * Exercises and day types are preserved.
 */
export async function clearAllWorkoutData(): Promise<void> {
  const db = await getDatabase();

  await db.execAsync('BEGIN TRANSACTION');
  try {
    await db.execAsync('DELETE FROM cardio_logs');
    await db.execAsync('DELETE FROM exercise_logs');
    await db.execAsync('DELETE FROM workout_sessions');
    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }

  console.log('All workout data cleared');
}
