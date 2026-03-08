// ==========================================
// Глобальный стор приложения
// ==========================================

import { create } from 'zustand';
import {
  DayType,
  DayTypeId,
  Direction,
  Exercise,
  WorkoutSession,
} from '../types';
import { dayTypeRepo, exerciseRepo, workoutRepo, workoutStateRepo } from '../db';
import { getDirectionForNextSession } from '../utils';
import type { WorkoutSnapshot } from '../db/repositories/workoutStateRepository';

export interface AppState {
  // --- Data ---
  dayTypes: DayType[];
  nextDayTypeId: DayTypeId;
  nextDirection: Direction;
  lastSession: WorkoutSession | null;
  isLoading: boolean;
  isInitialized: boolean;

  // --- Crash resilience ---
  /** If non-null, there's a saved workout to restore */
  pendingRestore: WorkoutSnapshot | null;

  // --- Actions ---
  initialize: () => Promise<void>;
  refreshNextDayInfo: () => Promise<void>;
  getExercisesForDayType: (dayTypeId: DayTypeId) => Promise<Exercise[]>;
  getRecentSessions: (limit?: number) => Promise<WorkoutSession[]>;
  clearPendingRestore: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // --- Initial state ---
  dayTypes: [],
  nextDayTypeId: 1,
  nextDirection: 'normal',
  lastSession: null,
  isLoading: false,
  isInitialized: false,
  pendingRestore: null,

  // Load all initial data from DB
  initialize: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true });
    try {
      const dayTypes = await dayTypeRepo.getAllDayTypes();
      const nextDayTypeId = await dayTypeRepo.getNextDayTypeId();

      // Direction is global: based on the LAST session of ANY type
      const allSessions = await workoutRepo.getAllSessions(1);
      const lastSession = allSessions.length > 0 ? allSessions[0] : null;
      const nextDirection = getDirectionForNextSession(
        lastSession?.direction ?? null
      );

      // Check for saved workout state (crash resilience)
      let pendingRestore: WorkoutSnapshot | null = null;
      try {
        const snapshot = await workoutStateRepo.loadWorkoutState();
        if (snapshot) {
          // Verify the session still exists in DB (wasn't deleted)
          const sessionExists = await workoutRepo.getWorkoutSessionById(
            snapshot.session.id
          );
          if (sessionExists && !sessionExists.timeEnd) {
            // Session exists and is unfinished — offer restore
            pendingRestore = snapshot;
          } else {
            // Session was finished or deleted — clean up stale state
            await workoutStateRepo.clearWorkoutState();
          }
        }
      } catch (err) {
        console.error('Failed to check for saved workout state:', err);
      }

      set({
        dayTypes,
        nextDayTypeId,
        nextDirection,
        lastSession,
        isLoading: false,
        isInitialized: true,
        pendingRestore,
      });
    } catch (error) {
      console.error('Failed to initialize app store:', error);
      set({ isLoading: false });
    }
  },

  // Refresh after a workout is completed
  refreshNextDayInfo: async () => {
    try {
      const nextDayTypeId = await dayTypeRepo.getNextDayTypeId();

      // Direction is global: based on the LAST session of ANY type
      const allSessions = await workoutRepo.getAllSessions(1);
      const lastSession = allSessions.length > 0 ? allSessions[0] : null;
      const nextDirection = getDirectionForNextSession(
        lastSession?.direction ?? null
      );

      set({ nextDayTypeId, nextDirection, lastSession });
    } catch (error) {
      console.error('Failed to refresh next day info:', error);
    }
  },

  // Fetch exercises for a given day type
  getExercisesForDayType: async (dayTypeId: DayTypeId) => {
    return exerciseRepo.getExercisesByDayType(dayTypeId);
  },

  // Fetch recent workout sessions
  getRecentSessions: async (limit?: number) => {
    return workoutRepo.getAllSessions(limit);
  },

  // Clear pending restore (user declined to restore)
  clearPendingRestore: () => {
    set({ pendingRestore: null });
  },
}));
