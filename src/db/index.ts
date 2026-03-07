// ==========================================
// Реэкспорт всех модулей базы данных
// ==========================================

export { getDatabase, generateId } from './database';
export * as dayTypeRepo from './repositories/dayTypeRepository';
export * as exerciseRepo from './repositories/exerciseRepository';
export * as workoutRepo from './repositories/workoutRepository';
export * as analyticsRepo from './repositories/analyticsRepository';
export { seedFakeData, clearAllWorkoutData } from './seedFakeData';
