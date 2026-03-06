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
import { dayTypeRepo, exerciseRepo, workoutRepo } from '../db';
import { getDirectionForNextSession } from '../utils';

export interface AppState {
  // --- Data ---
  dayTypes: DayType[];
  nextDayTypeId: DayTypeId;
  nextDirection: Direction;
  lastSession: WorkoutSession | null;
  isLoading: boolean;
  isInitialized: boolean;

  // --- Actions ---
  initialize: () => Promise<void>;
  refreshNextDayInfo: () => Promise<void>;
  getExercisesForDayType: (dayTypeId: DayTypeId) => Promise<Exercise[]>;
  getRecentSessions: (limit?: number) => Promise<WorkoutSession[]>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // --- Initial state ---
  dayTypes: [],
  nextDayTypeId: 1,
  nextDirection: 'normal',
  lastSession: null,
  isLoading: false,
  isInitialized: false,

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

      set({
        dayTypes,
        nextDayTypeId,
        nextDirection,
        lastSession,
        isLoading: false,
        isInitialized: true,
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
}));
