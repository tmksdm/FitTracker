// ==========================================
// Стор активной тренировки
// ==========================================

import { create } from 'zustand';
import {
  DayTypeId,
  Direction,
  Exercise,
  ExerciseLog,
  ExerciseStatus,
  ExerciseWithStatus,
  WorkoutSession,
  CardioLog,
} from '../types';
import {
  dayTypeRepo,
  exerciseRepo,
  workoutRepo,
  generateId,
} from '../db';
import {
  buildExerciseOrder,
  generateSetsForExercise,
  calculateNextTargetReps,
  getDefaultTargetReps,
  determineWeightChange,
  calculateNewWeight,
  getResetTargetTotal,
  distributeReps,
  PlannedSet,
} from '../utils';

// ---- Types for active workout state ----

export interface ActiveSet extends PlannedSet {
  /** Unique ID (will become the ExerciseLog id when saved) */
  id: string;
  /** Actual reps performed (null = not yet done) */
  actualReps: number | null;
  /** true if set is completed */
  isCompleted: boolean;
}

export interface ActiveExercise {
  exercise: Exercise;
  sets: ActiveSet[];
  status: ExerciseStatus;
  isPriority: boolean;
  /** Saved original sets before skip, so we can restore them */
  originalSets: ActiveSet[] | null;
}

export interface WorkoutState {
  // --- Session state ---
  session: WorkoutSession | null;
  isActive: boolean;

  // --- Exercises ---
  exercises: ActiveExercise[];
  currentExerciseIndex: number;

  // --- Rest timer ---
  restTimerSeconds: number;
  restTimerDefault: number;
  isRestTimerRunning: boolean;

  // --- Stopwatch ---
  stopwatchSeconds: number;
  isStopwatchRunning: boolean;

  // --- Actions ---
  startWorkout: (
    dayTypeId: DayTypeId,
    direction: Direction,
    weightBefore: number | null
  ) => Promise<void>;

  finishWorkout: (weightAfter: number | null) => Promise<WorkoutSession | null>;
  cancelWorkout: () => void;

  // Exercise navigation
  setCurrentExercise: (index: number) => void;
  getCurrentExercise: () => ActiveExercise | null;

  // Set actions
  completeSet: (exerciseIndex: number, setIndex: number, actualReps?: number) => void;
  updateSetReps: (exerciseIndex: number, setIndex: number, reps: number) => void;
  skipExercise: (exerciseIndex: number) => void;
  unskipExercise: (exerciseIndex: number) => void;

  // Timer
  setRestTimerDefault: (seconds: number) => void;
  startRestTimer: () => void;
  stopRestTimer: () => void;
  tickRestTimer: () => void;

  // Stopwatch
  startStopwatch: () => void;
  stopStopwatch: () => void;
  resetStopwatch: () => void;
  tickStopwatch: () => void;
}

// Helper: determine exercise status from its sets
function getExerciseStatus(sets: ActiveSet[], isTimed: boolean): ExerciseStatus {
  if (isTimed) {
    return 'not_started';
  }
  if (sets.length === 0) return 'not_started';

  const allCompleted = sets.every((s) => s.isCompleted);
  const anyCompleted = sets.some((s) => s.isCompleted);

  if (allCompleted) return 'completed';
  if (anyCompleted) return 'in_progress';
  return 'not_started';
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  // --- Initial state ---
  session: null,
  isActive: false,
  exercises: [],
  currentExerciseIndex: 0,
  restTimerSeconds: 0,
  restTimerDefault: 60,
  isRestTimerRunning: false,
  stopwatchSeconds: 0,
  isStopwatchRunning: false,

  // =======================================
  // START WORKOUT
  // =======================================
  startWorkout: async (
    dayTypeId: DayTypeId,
    direction: Direction,
    weightBefore: number | null
  ) => {
    try {
      // 1. Create the session in DB
      const session = await workoutRepo.createWorkoutSession({
        dayTypeId,
        direction,
        weightBefore,
      });

      // 2. Fetch active exercises for this day type
      const allExercises =
        await exerciseRepo.getExercisesByDayType(dayTypeId);

      // 3. Determine which exercises were skipped last session
      const skippedIds = new Set<string>();
      for (const ex of allExercises) {
        const wasSkipped =
          await workoutRepo.wasExerciseSkippedLastSession(
            ex.id,
            dayTypeId
          );
        if (wasSkipped) {
          skippedIds.add(ex.id);
        }
      }

      // 4. Build ordered exercise list
      const orderedExercises = buildExerciseOrder(
        allExercises,
        skippedIds,
        direction
      );

      // 5. For each exercise, generate planned sets with target reps
      const activeExercises: ActiveExercise[] = [];
      for (const exercise of orderedExercises) {
        let targetRepsPerSet: number[] | null = null;

        if (!exercise.isTimed) {
          const lastLogs =
            await workoutRepo.getLastWorkingLogsForExercise(exercise.id);

          if (lastLogs.length > 0) {
            const previousTotal = lastLogs.reduce(
              (sum, log) => sum + log.actualReps,
              0
            );
            targetRepsPerSet = calculateNextTargetReps(
              previousTotal,
              exercise.numWorkingSets,
              exercise.maxRepsPerSet,
              exercise.minRepsPerSet
            );
          } else {
            targetRepsPerSet = getDefaultTargetReps(exercise.numWorkingSets);
          }
        }

        const plannedSets = generateSetsForExercise(
          exercise,
          targetRepsPerSet
        );

        const activeSets: ActiveSet[] = plannedSets.map((ps) => ({
          ...ps,
          id: generateId(),
          actualReps: null,
          isCompleted: false,
        }));

        activeExercises.push({
          exercise,
          sets: activeSets,
          status: 'not_started',
          isPriority: skippedIds.has(exercise.id),
          originalSets: null,
        });
      }

      // Direction is now global — no need to toggle per day type.
      // The direction is saved in the workout_sessions record,
      // and the next session's direction is computed from it.

      set({
        session,
        isActive: true,
        exercises: activeExercises,
        currentExerciseIndex: 0,
      });
    } catch (error) {
      console.error('Failed to start workout:', error);
    }
  },

  // =======================================
  // FINISH WORKOUT
  // =======================================
  finishWorkout: async (weightAfter: number | null) => {
    const state = get();
    if (!state.session) return null;

    try {
      // 1. Save all completed sets to DB
      for (const activeEx of state.exercises) {
        const isSkippedExercise =
          activeEx.status === 'skipped' ||
          (activeEx.sets.length > 0 &&
            activeEx.sets.every((s) => !s.isCompleted));

        if (isSkippedExercise && activeEx.sets.length > 0) {
          await workoutRepo.createExerciseLog({
            workoutSessionId: state.session.id,
            exerciseId: activeEx.exercise.id,
            setNumber: 1,
            setType: 'working',
            targetReps: activeEx.sets[0].targetReps,
            actualReps: 0,
            weight: activeEx.sets[0].weight,
            isSkipped: true,
          });
        } else {
          for (const activeSet of activeEx.sets) {
            if (activeSet.isCompleted) {
              await workoutRepo.createExerciseLog({
                workoutSessionId: state.session.id,
                exerciseId: activeEx.exercise.id,
                setNumber: activeSet.setNumber,
                setType: activeSet.setType,
                targetReps: activeSet.targetReps,
                actualReps: activeSet.actualReps ?? activeSet.targetReps,
                weight: activeSet.weight,
                isSkipped: false,
              });
            }
          }
        }

        // 2. Check for weight progression
        if (
          activeEx.exercise.hasAddedWeight &&
          activeEx.status === 'completed'
        ) {
          const workingSets = activeEx.sets.filter(
            (s) => s.setType === 'working' && s.isCompleted
          );
          const actualReps = workingSets.map(
            (s) => s.actualReps ?? s.targetReps
          );

          const decision = determineWeightChange(
            actualReps,
            activeEx.exercise.maxRepsPerSet,
            activeEx.exercise.minRepsPerSet
          );

          if (decision !== 'none' && activeEx.exercise.workingWeight !== null) {
            const newWeight = calculateNewWeight(
              activeEx.exercise.workingWeight,
              decision,
              activeEx.exercise.weightIncrement
            );
            await exerciseRepo.updateExercise(activeEx.exercise.id, {
              workingWeight: newWeight,
            });
          }
        }
      }

      // 3. Finish the session in DB
      await workoutRepo.finishWorkoutSession(state.session.id, weightAfter);

      // 4. Re-fetch the session
      const finishedSession = await workoutRepo.getWorkoutSessionById(
        state.session.id
      );

      // 5. Reset store state
      set({
        session: finishedSession,
        isActive: false,
        exercises: [],
        currentExerciseIndex: 0,
        isRestTimerRunning: false,
        restTimerSeconds: 0,
        isStopwatchRunning: false,
        stopwatchSeconds: 0,
      });

      return finishedSession;
    } catch (error) {
      console.error('Failed to finish workout:', error);
      return null;
    }
  },

  // =======================================
  // CANCEL WORKOUT
  // =======================================
  cancelWorkout: () => {
    set({
      session: null,
      isActive: false,
      exercises: [],
      currentExerciseIndex: 0,
      isRestTimerRunning: false,
      restTimerSeconds: 0,
      isStopwatchRunning: false,
      stopwatchSeconds: 0,
    });
  },

  // =======================================
  // EXERCISE NAVIGATION
  // =======================================
  setCurrentExercise: (index: number) => {
    set({ currentExerciseIndex: index });
  },

  getCurrentExercise: () => {
    const state = get();
    return state.exercises[state.currentExerciseIndex] ?? null;
  },

  // =======================================
  // SET ACTIONS
  // =======================================
  completeSet: (exerciseIndex: number, setIndex: number, actualReps?: number) => {
    set((state) => {
      const exercises = [...state.exercises];
      const exercise = { ...exercises[exerciseIndex] };
      const sets = [...exercise.sets];
      const targetSet = { ...sets[setIndex] };

      targetSet.actualReps = actualReps ?? targetSet.targetReps;
      targetSet.isCompleted = true;

      sets[setIndex] = targetSet;
      exercise.sets = sets;
      exercise.status = getExerciseStatus(sets, exercise.exercise.isTimed);
      exercises[exerciseIndex] = exercise;

      return { exercises };
    });
  },

  updateSetReps: (exerciseIndex: number, setIndex: number, reps: number) => {
    set((state) => {
      const exercises = [...state.exercises];
      const exercise = { ...exercises[exerciseIndex] };
      const sets = [...exercise.sets];
      const targetSet = { ...sets[setIndex] };

      targetSet.actualReps = reps;

      sets[setIndex] = targetSet;
      exercise.sets = sets;
      exercises[exerciseIndex] = exercise;

      return { exercises };
    });
  },

  skipExercise: (exerciseIndex: number) => {
    set((state) => {
      const exercises = [...state.exercises];
      const exercise = { ...exercises[exerciseIndex] };

      // Save original sets before marking as skipped
      exercise.originalSets = exercise.sets.map((s) => ({ ...s }));

      exercise.status = 'skipped';
      exercise.sets = exercise.sets.map((s) => ({
        ...s,
        actualReps: 0,
        isCompleted: true,
      }));

      exercises[exerciseIndex] = exercise;
      return { exercises };
    });
  },

  unskipExercise: (exerciseIndex: number) => {
    set((state) => {
      const exercises = [...state.exercises];
      const exercise = { ...exercises[exerciseIndex] };

      if (exercise.originalSets) {
        // Restore saved sets from before skip
        exercise.sets = exercise.originalSets;
        exercise.originalSets = null;
      } else {
        // Fallback: reset all sets to uncompleted
        exercise.sets = exercise.sets.map((s) => ({
          ...s,
          actualReps: null,
          isCompleted: false,
        }));
      }

      exercise.status = getExerciseStatus(exercise.sets, exercise.exercise.isTimed);
      exercises[exerciseIndex] = exercise;
      return { exercises };
    });
  },

  // =======================================
  // REST TIMER
  // =======================================
  setRestTimerDefault: (seconds: number) => {
    set({ restTimerDefault: seconds });
  },

  startRestTimer: () => {
    const defaultSeconds = get().restTimerDefault;
    set({
      restTimerSeconds: defaultSeconds,
      isRestTimerRunning: true,
    });
  },

  stopRestTimer: () => {
    set({
      isRestTimerRunning: false,
      restTimerSeconds: 0,
    });
  },

  tickRestTimer: () => {
    set((state) => {
      if (!state.isRestTimerRunning) return state;

      const next = state.restTimerSeconds - 1;
      if (next <= 0) {
        return {
          restTimerSeconds: 0,
          isRestTimerRunning: false,
        };
      }
      return { restTimerSeconds: next };
    });
  },

  // =======================================
  // STOPWATCH
  // =======================================
  startStopwatch: () => {
    set({ isStopwatchRunning: true });
  },

  stopStopwatch: () => {
    set({ isStopwatchRunning: false });
  },

  resetStopwatch: () => {
    set({ stopwatchSeconds: 0, isStopwatchRunning: false });
  },

  tickStopwatch: () => {
    set((state) => {
      if (!state.isStopwatchRunning) return state;
      return { stopwatchSeconds: state.stopwatchSeconds + 1 };
    });
  },
}));
