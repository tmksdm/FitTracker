// ==========================================
// Active Workout Screen — the core training UI
// ==========================================

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import { WorkoutHeader, ExerciseList, ExerciseCard, RestTimer, FinishWorkoutModal } from '../components';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type WorkoutNavProp = NativeStackNavigationProp<RootStackParamList>;

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ActiveWorkoutScreen() {
  const navigation = useNavigation<WorkoutNavProp>();

  // ---- All store subscriptions ----
  const session = useWorkoutStore((s) => s.session);
  const isActive = useWorkoutStore((s) => s.isActive);
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
  const recordEndTime = useWorkoutStore((s) => s.recordEndTime);

  const cardioType = useWorkoutStore((s) => s.cardioType);
  const jumpRopeCount = useWorkoutStore((s) => s.jumpRopeCount);
  const treadmillSeconds = useWorkoutStore((s) => s.treadmillSeconds);
  const isCardioCompleted = useWorkoutStore((s) => s.isCardioCompleted);
  const saveJumpRope = useWorkoutStore((s) => s.saveJumpRope);
  const saveTreadmill = useWorkoutStore((s) => s.saveTreadmill);
  const clearCardio = useWorkoutStore((s) => s.clearCardio);

  const dayTypes = useAppStore((s) => s.dayTypes);
  const refreshNextDayInfo = useAppStore((s) => s.refreshNextDayInfo);

  // ---- All useState / useRef ----
  const [showFinishModal, setShowFinishModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // ---- All useEffect ----
  useEffect(() => {
    if (!session && !isActive) {
      navigation.goBack();
    }
  }, [session, isActive]);

  // ---- All useCallback ----
  const handleCompleteSet = useCallback(
    (exerciseIndex: number, setIndex: number, actualReps?: number) => {
      completeSet(exerciseIndex, setIndex, actualReps);
      startRestTimer();
    },
    [completeSet, startRestTimer]
  );

  const handleUpdateSetReps = useCallback(
    (exerciseIndex: number, setIndex: number, reps: number) => {
      updateSetReps(exerciseIndex, setIndex, reps);
    },
    [updateSetReps]
  );

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
              const nextIndex = exercises.findIndex(
                (e, i) =>
                  i > exerciseIndex &&
                  e.status !== 'completed' &&
                  e.status !== 'skipped'
              );
              if (nextIndex !== -1) {
                setCurrentExercise(nextIndex);
                flatListRef.current?.scrollToIndex({
                  index: nextIndex,
                  animated: true,
                  viewPosition: 0.5,
                });
              }
            },
          },
        ]
      );
    },
    [skipExercise, exercises, setCurrentExercise]
  );

  const handleUnskipExercise = useCallback(
    (exerciseIndex: number) => {
      unskipExercise(exerciseIndex);
    },
    [unskipExercise]
  );

  const handleSelectExercise = useCallback(
    (index: number) => {
      setCurrentExercise(index);
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
    },
    [setCurrentExercise]
  );

  const handleFinishPress = useCallback(() => {
    recordEndTime();
    setShowFinishModal(true);
  }, [recordEndTime]);

  const handleFinishConfirm = useCallback(
    async (weightAfter: number | null) => {
      setShowFinishModal(false);
      const finishedSession = await finishWorkout(weightAfter);
      await refreshNextDayInfo();
      if (finishedSession) {
        navigation.replace('WorkoutSummary', { sessionId: finishedSession.id });
      } else {
        navigation.goBack();
      }
    },
    [finishWorkout, refreshNextDayInfo, navigation]
  );

  const handleFinishCancel = useCallback(() => {
    setShowFinishModal(false);
  }, []);

  const handleCancelWorkout = useCallback(() => {
    Alert.alert(
      'Отменить тренировку?',
      'Все записанные подходы будут удалены. Это действие нельзя отменить.',
      [
        { text: 'Нет, продолжить', style: 'cancel' },
        {
          text: 'Да, отменить',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Точно отменить?',
              'Последний шанс — тренировка будет удалена безвозвратно.',
              [
                { text: 'Нет', style: 'cancel' },
                {
                  text: 'Удалить',
                  style: 'destructive',
                  onPress: async () => {
                    await cancelWorkout();
                    await refreshNextDayInfo();
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, [cancelWorkout, refreshNextDayInfo]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentExercise(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 60,
  }).current;

  const renderExerciseCard = useCallback(
    ({ item, index }: { item: (typeof exercises)[number]; index: number }) => {
      if (!session) return null;
      return (
        <View style={{ width: SCREEN_WIDTH - spacing.lg * 2 }}>
          <ExerciseCard
            activeExercise={item}
            exerciseIndex={index}
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
      session,
      handleCompleteSet,
      handleUpdateSetReps,
      handleSkipExercise,
      handleUnskipExercise,
    ]
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

  // ===== ALL HOOKS ARE ABOVE THIS LINE =====
  // Now safe to do early return

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.safeArea} />
      </SafeAreaView>
    );
  }

  const dayType = dayTypes.find((dt) => dt.id === session.dayTypeId);

  const exercisesDone = exercises.filter(
    (e) => e.status === 'completed'
  ).length;
  const exercisesTotal = exercises.length;
  const exercisesSkipped = exercises.filter(
    (e) => e.status === 'skipped'
  ).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <WorkoutHeader
        session={session}
        dayType={dayType}
        exercisesDone={exercisesDone}
        exercisesTotal={exercisesTotal}
        onFinish={handleFinishPress}
        onCancel={handleCancelWorkout}
      />

      <View style={styles.exerciseListContainer}>
        <ExerciseList
          exercises={exercises}
          currentIndex={currentExerciseIndex}
          onSelect={handleSelectExercise}
        />
      </View>

      <FlatList
        ref={flatListRef}
        data={exercises}
        renderItem={renderExerciseCard}
        keyExtractor={keyExtractor}
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
        getItemLayout={getItemLayout}
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

      <RestTimer />

      <FinishWorkoutModal
        visible={showFinishModal}
        exercisesDone={exercisesDone}
        exercisesTotal={exercisesTotal}
        exercisesSkipped={exercisesSkipped}
        dayTypeId={session.dayTypeId}
        cardioType={cardioType}
        jumpRopeCount={jumpRopeCount}
        treadmillSeconds={treadmillSeconds}
        isCardioCompleted={isCardioCompleted}
        onSaveJumpRope={saveJumpRope}
        onSaveTreadmill={saveTreadmill}
        onClearCardio={clearCardio}
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
