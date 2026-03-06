// ==========================================
// Типы навигации (React Navigation v7)
// ==========================================

export type RootStackParamList = {
  MainTabs: undefined;
  ActiveWorkout: undefined;
  WorkoutSummary: { sessionId: string };
  WorkoutDetail: { sessionId: string };
  ExerciseEditor: { dayTypeId: number };
};

export type MainTabParamList = {
  Home: undefined;
  History: undefined;
  Analytics: undefined;
  Settings: undefined;
};
