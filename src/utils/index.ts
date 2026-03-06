// src/utils/index.ts

export {
  distributeReps,
  calculateNextTargetTotal,
  calculateNextTargetReps,
  getDefaultTargetReps,
  determineWeightChange,
} from './reps';
export type { WeightChangeDecision } from './reps';

export {
  calculateNewWeight,
  getResetTargetTotal,
  calculateWarmupWeights,
  calculateExerciseTotalKg,
  calculateWorkoutTotalKg,
  calculateAverageBodyWeight,
} from './weight';

export {
  sortByDirection,
  buildExerciseOrder,
  getNextDirection,
  getDirectionForNextSession,
} from './exerciseOrder';
export type { Direction } from './exerciseOrder';

export {
  generateSetsForWeightedExercise,
  generateSetsForBodyweightExercise,
  generateSetsForExercise,
  getTimedExerciseConfig,
} from './sets';
export type { PlannedSet, TimedExerciseConfig } from './sets';
