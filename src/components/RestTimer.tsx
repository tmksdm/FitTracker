// ==========================================
// Floating rest timer overlay
// ==========================================

import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useWorkoutStore } from '../stores/workoutStore';
import { colors, spacing, fontSize, borderRadius } from '../theme';

export default function RestTimer() {
  const restTimerSeconds = useWorkoutStore((s) => s.restTimerSeconds);
  const isRestTimerRunning = useWorkoutStore((s) => s.isRestTimerRunning);
  const tickRestTimer = useWorkoutStore((s) => s.tickRestTimer);
  const stopRestTimer = useWorkoutStore((s) => s.stopRestTimer);
  const startRestTimer = useWorkoutStore((s) => s.startRestTimer);
  const restTimerDefault = useWorkoutStore((s) => s.restTimerDefault);

  // Tick every second
  useEffect(() => {
    if (!isRestTimerRunning) return;

    const interval = setInterval(() => {
      tickRestTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [isRestTimerRunning]);

  // Pulsing animation when timer is about to end
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRestTimerRunning && restTimerSeconds <= 5 && restTimerSeconds > 0) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [restTimerSeconds]);

  if (!isRestTimerRunning && restTimerSeconds === 0) return null;

  const minutes = Math.floor(restTimerSeconds / 60);
  const seconds = restTimerSeconds % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const isLow = restTimerSeconds <= 5;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale: pulseAnim }] },
        isLow && styles.containerLow,
      ]}
    >
      <View style={styles.content}>
        <MaterialCommunityIcons
          name="timer-outline"
          size={20}
          color={isLow ? colors.warning : colors.text}
        />
        <Text style={[styles.time, isLow && styles.timeLow]}>
          {timeStr}
        </Text>

        <TouchableOpacity
          onPress={stopRestTimer}
          style={styles.dismissButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons
            name="close"
            size={18}
            color={colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={startRestTimer}
        style={styles.restartButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialCommunityIcons
          name="restart"
          size={16}
          color={colors.textMuted}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  containerLow: {
    borderColor: colors.warning,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  time: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 50,
  },
  timeLow: {
    color: colors.warning,
  },
  dismissButton: {
    marginLeft: spacing.xs,
  },
  restartButton: {
    marginLeft: spacing.xs,
  },
});
