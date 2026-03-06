// ==========================================
// Экран «Главная» — дашборд
// ==========================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../stores/appStore';
import { useWorkoutStore } from '../stores/workoutStore';
import { DayTypeCard, LastWorkoutCard, StartWorkoutModal } from '../components';
import { colors, spacing, fontSize, borderRadius, touchTarget, getDayTypeColor } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type HomeNavProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();

  // App store
  const dayTypes = useAppStore((s) => s.dayTypes);
  const nextDayTypeId = useAppStore((s) => s.nextDayTypeId);
  const nextDirection = useAppStore((s) => s.nextDirection);
  const lastSession = useAppStore((s) => s.lastSession);
  const refreshNextDayInfo = useAppStore((s) => s.refreshNextDayInfo);

  // Workout store
  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const isWorkoutActive = useWorkoutStore((s) => s.isActive);

  // Local state
  const [showModal, setShowModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshNextDayInfo();
    }, [])
  );

  // Pull-to-refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshNextDayInfo();
    setIsRefreshing(false);
  };

  // Start workout flow
  const handleStartPress = () => {
    if (isWorkoutActive) {
      // Resume existing workout
      navigation.navigate('ActiveWorkout');
      return;
    }
    setShowModal(true);
  };

  const handleStartWorkout = async (weightBefore: number | null) => {
    setShowModal(false);
    await startWorkout(nextDayTypeId, nextDirection, weightBefore);
    navigation.navigate('ActiveWorkout');
  };

  const handleCancelModal = () => {
    setShowModal(false);
  };

  const dayType = dayTypes.find((dt) => dt.id === nextDayTypeId);
  const accentColor = getDayTypeColor(nextDayTypeId);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>FitTracker</Text>
          <MaterialCommunityIcons
            name="dumbbell"
            size={24}
            color={colors.primary}
          />
        </View>

        {/* Next day type card */}
        <DayTypeCard
          dayTypes={dayTypes}
          nextDayTypeId={nextDayTypeId}
          nextDirection={nextDirection}
        />

        {/* Start / Resume button */}
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: accentColor }]}
          onPress={handleStartPress}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name={isWorkoutActive ? 'arrow-right-circle' : 'play-circle'}
            size={28}
            color={colors.textOnPrimary}
          />
          <Text style={styles.startButtonText}>
            {isWorkoutActive ? 'Продолжить тренировку' : 'Начать тренировку'}
          </Text>
        </TouchableOpacity>

        {/* Last workout card */}
        {lastSession ? (
          <LastWorkoutCard session={lastSession} dayTypes={dayTypes} />
        ) : (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons
              name="information-outline"
              size={32}
              color={colors.textMuted}
            />
            <Text style={styles.emptyText}>
              Нет записанных тренировок
            </Text>
            <Text style={styles.emptySubtext}>
              Нажмите «Начать тренировку», чтобы создать первую запись
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Start workout modal */}
      <StartWorkoutModal
        visible={showModal}
        dayTypeName={dayType?.nameRu ?? ''}
        onStart={handleStartWorkout}
        onCancel={handleCancelModal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appTitle: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  startButton: {
    height: touchTarget.large,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  startButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  emptySubtext: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});
