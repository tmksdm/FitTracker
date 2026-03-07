// ==========================================
// Active Workout Screen — the core training UI
// ==========================================

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  ViewToken,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWorkoutStore } from '../stores/workoutStore';
import { useAppStore } from '../stores/appStore';
import { WorkoutHeader, ExerciseList, ExerciseCard, RestTimer, FinishWorkoutModal, CardioCard } from '../components';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type WorkoutNavProp = NativeStackNavigationProp<RootStackParamList>;

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ActiveWorkoutScreen() {
  const navigation = useNavigation<WorkoutNavProp>();

  // Workout store
  const session = useWorkoutStore((s) => s.session);
  const exercises = useWorkoutStore((s) => s.exercises);
  const currentExerciseIndex = useWorkoutStore((s) => s.currentExerciseIndex);
  const setCurrentExercise = useWorkoutStore((s) => s.setCurrentExercise);
  const completeSet = useWorkoutStore((s) => s.completeSet);
  const updateSetReps = useWorkoutStore((s) => s.updateSetReps);
  const skipExercise = useWorkoutStore((s) => s.skipExercise);
  const unskipExercise = useWorkoutStore((s) => s.unskipExercise);
  const finishWorkout = useWorkoutStore((s) => s.finishWorkout);
  const cancelWorkout = useWorkoutStore((s) => s.cancelWorkout);
  const startRestTimer = useWorkoutStore((s) => s.startRestTimer);
  const cardioType = useWorkoutStore((s) => s.cardioType);
  const jumpRopeCount = useWorkoutStore((s) => s.jumpRopeCount);
  const treadmillSeconds = useWorkoutStore((s) => s.treadmillSeconds);
  const isCardioCompleted = useWorkoutStore((s) => s.isCardioCompleted);
  const saveJumpRope = useWorkoutStore((s) => s.saveJumpRope);
  const saveTreadmill = useWorkoutStore((s) => s.saveTreadmill);
  const clearCardio = useWorkoutStore((s) => s.clearCardio);  

  // App store
  const dayTypes = useAppStore((s) => s.dayTypes);
  const refreshNextDayInfo = useAppStore((s) => s.refreshNextDayInfo);

  // Local state
  const [showFinishModal, setShowFinishModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Guard: if no session, go back
  if (!session) {
    return null;
  }

  const dayType = dayTypes.find((dt) => dt.id === session.dayTypeId);

  // Counts
  const exercisesDone = exercises.filter(
    (e) => e.status === 'completed'
  ).length;
  const exercisesTotal = exercises.length;
  // Total including cardio for header display
  const totalWithCardio = exercisesTotal + 1;
  const doneWithCardio = exercisesDone + (isCardioCompleted ? 1 : 0);
  const exercisesSkipped = exercises.filter(
    (e) => e.status === 'skipped'
  ).length;

  // Handle set completion (starts rest timer automatically)
  const handleCompleteSet = useCallback(
    (exerciseIndex: number, setIndex: number, actualReps?: number) => {
      completeSet(exerciseIndex, setIndex, actualReps);
      startRestTimer();
    },
    [completeSet, startRestTimer]
  );

  // Handle reps update on already completed set
  const handleUpdateSetReps = useCallback(
    (exerciseIndex: number, setIndex: number, reps: number) => {
      updateSetReps(exerciseIndex, setIndex, reps);
    },
    [updateSetReps]
  );

  // Handle skip exercise
  const handleSkipExercise = useCallback(
    (exerciseIndex: number) => {
      Alert.alert(
        'Пропустить упражнение?',
        'Можно вернуть в работу в любой момент.',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Пропустить',
            style: 'destructive',
            onPress: () => {
              skipExercise(exerciseIndex);
              // Auto-advance to next non-done exercise
              const nextIndex = exercises.findIndex(
                (e, i) =>
                  i > exerciseIndex &&
                  e.status !== 'completed' &&
                  e.status !== 'skipped'
              );
              if (nextIndex !== -1) {
                handleSelectExercise(nextIndex);
              }
            },
          },
        ]
      );
    },
    [skipExercise, exercises]
  );

  // Handle unskip exercise
  const handleUnskipExercise = useCallback(
    (exerciseIndex: number) => {
      unskipExercise(exerciseIndex);
    },
    [unskipExercise]
  );

  // Navigate to exercise by index
  const handleSelectExercise = useCallback(
    (index: number) => {
      // Only update exercise index for actual exercises
      if (index < exercises.length) {
        setCurrentExercise(index);
      }
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
    },
    [setCurrentExercise, exercises.length]
  );

  // Finish workout flow
  const handleFinishPress = () => {
    setShowFinishModal(true);
  };

  const handleFinishConfirm = async (weightAfter: number | null) => {
    setShowFinishModal(false);
    const finishedSession = await finishWorkout(weightAfter);
    await refreshNextDayInfo();
    if (finishedSession) {
      navigation.replace('WorkoutSummary', { sessionId: finishedSession.id });
    } else {
      navigation.goBack();
    }
  };

  const handleFinishCancel = () => {
    setShowFinishModal(false);
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        const idx = viewableItems[0].index;
        // Don't update exercise index when viewing cardio
        if (idx < (useWorkoutStore.getState().exercises.length)) {
          setCurrentExercise(idx);
        }
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 60,
  }).current;

  // Render a single exercise card
  const renderListItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'cardio') {
        return (
          <View style={{ width: SCREEN_WIDTH - spacing.lg * 2 }}>
            <CardioCard
              dayTypeId={session.dayTypeId}
              jumpRopeCount={jumpRopeCount}
              treadmillSeconds={treadmillSeconds}
              isCompleted={isCardioCompleted}
              onSaveJumpRope={saveJumpRope}
              onSaveTreadmill={saveTreadmill}
              onClear={clearCardio}
            />
          </View>
        );
      }

      return (
        <View style={{ width: SCREEN_WIDTH - spacing.lg * 2 }}>
          <ExerciseCard
            activeExercise={item.data}
            exerciseIndex={item.index}
            dayTypeId={session.dayTypeId}
            onCompleteSet={handleCompleteSet}
            onUpdateSetReps={handleUpdateSetReps}
            onSkip={handleSkipExercise}
            onUnskip={handleUnskipExercise}
          />
        </View>
      );
    },
    [
      session.dayTypeId,
      handleCompleteSet,
      handleUpdateSetReps,
      handleSkipExercise,
      handleUnskipExercise,
      jumpRopeCount,
      treadmillSeconds,
      isCardioCompleted,
      saveJumpRope,
      saveTreadmill,
      clearCardio,
    ]
  );

  const listKeyExtractor = useCallback(
    (item: ListItem) =>
      item.type === 'cardio' ? 'cardio' : item.data.exercise.id,
    []
  );

  const listGetItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SCREEN_WIDTH - spacing.lg * 2,
      offset: (SCREEN_WIDTH - spacing.lg * 2 + spacing.md) * index,
      index,
    }),
    []
  );

  const keyExtractor = useCallback(
    (item: (typeof exercises)[number]) => item.exercise.id,
    []
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SCREEN_WIDTH - spacing.lg * 2,
      offset: (SCREEN_WIDTH - spacing.lg * 2 + spacing.md) * index,
      index,
    }),
    []
  );

  // Build combined list: exercises + cardio
  type ListItem =
    | { type: 'exercise'; data: (typeof exercises)[number]; index: number }
    | { type: 'cardio' };

  const listData: ListItem[] = [
    ...exercises.map((e, i) => ({ type: 'exercise' as const, data: e, index: i })),
    { type: 'cardio' as const },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <WorkoutHeader
        session={session}
        dayType={dayType}
        exercisesDone={exercisesDone}
        exercisesTotal={totalWithCardio}
        onFinish={handleFinishPress}
      />

      {/* Exercise chip navigator */}
      <View style={styles.exerciseListContainer}>
        <ExerciseList
          exercises={exercises}
          currentIndex={currentExerciseIndex}
          isCardioCompleted={isCardioCompleted}
          totalItemCount={exercises.length + 1}
          onSelect={handleSelectExercise}
        />
      </View>

      {/* Main scrollable exercise content */}
      <FlatList
        ref={flatListRef}
        data={listData}
        renderItem={renderListItem}
        keyExtractor={listKeyExtractor}
        horizontal
        pagingEnabled
        snapToInterval={SCREEN_WIDTH - spacing.lg * 2 + spacing.md}
        snapToAlignment="center"
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.flatListContent}
        ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={listGetItemLayout}
        initialScrollIndex={currentExerciseIndex}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
            });
          }, 100);
        }}
      />

      {/* Floating rest timer */}
      <RestTimer />

      {/* Finish workout modal */}
      <FinishWorkoutModal
        visible={showFinishModal}
        exercisesDone={exercisesDone}
        exercisesTotal={exercisesTotal}
        exercisesSkipped={exercisesSkipped}
        onFinish={handleFinishConfirm}
        onCancel={handleFinishCancel}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  exerciseListContainer: {
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  flatListContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
