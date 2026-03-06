// src/utils/weight.ts

/**
 * Weight progression utilities.
 *
 * When the user achieves max reps (8+8+8=24 by default), the working
 * weight increases by a configurable increment (default 2.5 kg) and
 * reps reset to a starting point.
 *
 * When the user falls to min reps (4+4+4=12 by default), the working
 * weight decreases by the same increment and reps reset.
 */

import { type WeightChangeDecision } from './reps';

/**
 * Calculates the new working weight after a weight change decision.
 *
 * @param currentWeight - Current working weight in kg
 * @param decision - 'increase', 'decrease', or 'none'
 * @param weightIncrement - Amount to add/subtract (default 2.5 kg)
 * @param minWeight - Minimum allowed weight (default 0, i.e., bar only)
 * @returns New working weight
 */
export function calculateNewWeight(
  currentWeight: number,
  decision: WeightChangeDecision,
  weightIncrement: number = 2.5,
  minWeight: number = 0
): number {
  switch (decision) {
    case 'increase':
      return currentWeight + weightIncrement;
    case 'decrease':
      return Math.max(minWeight, currentWeight - weightIncrement);
    case 'none':
      return currentWeight;
  }
}

/**
 * Returns the starting target total reps after a weight change.
 *
 * After an increase: reps reset to a moderate value (e.g., 6*3=18)
 * to give room for adaptation to the new weight.
 *
 * After a decrease: reps reset to a moderate-high value (e.g., 6*3=18)
 * since the weight is now lighter.
 *
 * @param numSets - Number of working sets (default 3)
 * @param resetRepsPerSet - Reps per set after weight change (default 6)
 * @returns Target total reps for first session at new weight
 */
export function getResetTargetTotal(
  numSets: number = 3,
  resetRepsPerSet: number = 6
): number {
  return resetRepsPerSet * numSets;
}

/**
 * Calculates warmup weights based on working weight and offsets.
 *
 * @param workingWeight - Current working weight in kg
 * @param warmup1Offset - Kg below working weight for warmup set 1 (e.g., 20)
 * @param warmup2Offset - Kg below working weight for warmup set 2 (e.g., 10)
 * @returns Object with warmup1Weight and warmup2Weight (both >= 0)
 */
export function calculateWarmupWeights(
  workingWeight: number,
  warmup1Offset: number,
  warmup2Offset: number
): { warmup1Weight: number; warmup2Weight: number } {
  return {
    warmup1Weight: Math.max(0, workingWeight - warmup1Offset),
    warmup2Weight: Math.max(0, workingWeight - warmup2Offset),
  };
}

/**
 * Calculates total kg lifted for a single exercise from its set logs.
 * Only includes sets with weight > 0 and actual reps > 0.
 *
 * @param sets - Array of { weight, actualReps } for each set
 * @returns Total kg lifted (weight × reps summed across all sets)
 */
export function calculateExerciseTotalKg(
  sets: Array<{ weight: number; actualReps: number }>
): number {
  return sets.reduce((total, set) => {
    if (set.weight > 0 && set.actualReps > 0) {
      return total + set.weight * set.actualReps;
    }
    return total;
  }, 0);
}

/**
 * Calculates total kg lifted for an entire workout session.
 * Sums totalKg for each weighted exercise.
 *
 * @param exerciseTotals - Array of total kg per exercise
 * @returns Sum of all exercise totals
 */
export function calculateWorkoutTotalKg(exerciseTotals: number[]): number {
  return exerciseTotals.reduce((sum, kg) => sum + kg, 0);
}

/**
 * Calculates average body weight from pre and post measurements.
 *
 * @param weightBefore - Weight before workout (kg)
 * @param weightAfter - Weight after workout (kg)
 * @returns Average weight, or whichever is available, or null
 */
export function calculateAverageBodyWeight(
  weightBefore: number | null,
  weightAfter: number | null
): number | null {
  if (weightBefore !== null && weightAfter !== null) {
    return (weightBefore + weightAfter) / 2;
  }
  if (weightBefore !== null) return weightBefore;
  if (weightAfter !== null) return weightAfter;
  return null;
}
