// ==========================================
// Rest Timer — expandable overlay with ring
// ==========================================

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useWorkoutStore } from '../stores/workoutStore';
import { colors, spacing, fontSize, borderRadius } from '../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

// ---- Big mode ring dimensions ----
const BIG_RING_SIZE = SCREEN_WIDTH * 0.65;
const BIG_RING_STROKE = 14;
const BIG_RING_RADIUS = (BIG_RING_SIZE - BIG_RING_STROKE) / 2;
const BIG_RING_CIRCUMFERENCE = 2 * Math.PI * BIG_RING_RADIUS;

// ---- Small mode ring dimensions ----
const SMALL_BUBBLE_SIZE = 72;
const SMALL_RING_STROKE = 6;
const SMALL_RING_RADIUS = (SMALL_BUBBLE_SIZE - SMALL_RING_STROKE) / 2;
const SMALL_RING_CIRCUMFERENCE = 2 * Math.PI * SMALL_RING_RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function RestTimer() {
  const restTimerSeconds = useWorkoutStore((s) => s.restTimerSeconds);
  const isRestTimerRunning = useWorkoutStore((s) => s.isRestTimerRunning);
  const restTimerDefault = useWorkoutStore((s) => s.restTimerDefault);
  const tickRestTimer = useWorkoutStore((s) => s.tickRestTimer);
  const stopRestTimer = useWorkoutStore((s) => s.stopRestTimer);
  const startRestTimer = useWorkoutStore((s) => s.startRestTimer);

  const [isExpanded, setIsExpanded] = useState(true);

  // Track the total duration this timer was started with
  const totalDuration = useRef(restTimerDefault);

  // Animated progress (1 → 0)
  const progressAnim = useRef(new Animated.Value(1)).current;

  // Tick every second
  useEffect(() => {
    if (!isRestTimerRunning) return;
    const interval = setInterval(() => {
      tickRestTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [isRestTimerRunning]);

  // When timer starts, capture total duration and expand
  useEffect(() => {
    if (isRestTimerRunning && restTimerSeconds > 0) {
      totalDuration.current = restTimerSeconds;
      setIsExpanded(true);
    }
  }, [isRestTimerRunning]);

  // Animate the ring progress smoothly
  useEffect(() => {
    if (!isRestTimerRunning || totalDuration.current === 0) return;
    const target = restTimerSeconds / totalDuration.current;
    Animated.timing(progressAnim, {
      toValue: target,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [restTimerSeconds, isRestTimerRunning]);

  // Reset when timer stops
  useEffect(() => {
    if (!isRestTimerRunning && restTimerSeconds === 0) {
      progressAnim.setValue(1);
    }
  }, [isRestTimerRunning, restTimerSeconds]);

  // Don't render anything if timer is not active
  if (!isRestTimerRunning && restTimerSeconds === 0) return null;

  const timeStr = `${restTimerSeconds}`;

  // Ring dash offset (animated)
  const bigDashOffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [BIG_RING_CIRCUMFERENCE, 0],
  });

  const smallDashOffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SMALL_RING_CIRCUMFERENCE, 0],
  });

  // ---- EXPANDED (big) mode ----
  if (isExpanded) {
    return (
      <TouchableOpacity
        style={styles.bigOverlay}
        activeOpacity={1}
        onPress={() => setIsExpanded(false)}
      >
        <View style={styles.bigContainer}>
          {/* Ring */}
          <Svg
            width={BIG_RING_SIZE}
            height={BIG_RING_SIZE}
            style={styles.bigRingSvg}
          >
            {/* Background ring */}
            <Circle
              cx={BIG_RING_SIZE / 2}
              cy={BIG_RING_SIZE / 2}
              r={BIG_RING_RADIUS}
              stroke={colors.border}
              strokeWidth={BIG_RING_STROKE}
              fill="none"
            />
            {/* Progress ring */}
            <AnimatedCircle
              cx={BIG_RING_SIZE / 2}
              cy={BIG_RING_SIZE / 2}
              r={BIG_RING_RADIUS}
              stroke={colors.primary}
              strokeWidth={BIG_RING_STROKE}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={BIG_RING_CIRCUMFERENCE}
              strokeDashoffset={bigDashOffset}
              rotation="-90"
              origin={`${BIG_RING_SIZE / 2}, ${BIG_RING_SIZE / 2}`}
            />
          </Svg>

          {/* Time text in the center of the ring */}
          <View style={styles.bigTimeContainer}>
            <Text style={styles.bigTimeText}>{timeStr}</Text>
            <Text style={styles.bigLabel}>Отдых</Text>
          </View>

          {/* Action buttons below the ring */}
          <View style={styles.bigActions}>
            <TouchableOpacity
              style={styles.bigActionButton}
              onPress={(e) => {
                e.stopPropagation?.();
                stopRestTimer();
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.textSecondary}
              />
              <Text style={styles.bigActionLabel}>Закрыть</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bigActionButton}
              onPress={(e) => {
                e.stopPropagation?.();
                startRestTimer();
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="restart"
                size={24}
                color={colors.textSecondary}
              />
              <Text style={styles.bigActionLabel}>Заново</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // ---- COLLAPSED (small bubble) mode ----
  return (
    <TouchableOpacity
      style={styles.smallBubble}
      onPress={() => setIsExpanded(true)}
      activeOpacity={0.8}
    >
      <Svg
        width={SMALL_BUBBLE_SIZE}
        height={SMALL_BUBBLE_SIZE}
        style={styles.smallRingSvg}
      >
        {/* Background ring */}
        <Circle
          cx={SMALL_BUBBLE_SIZE / 2}
          cy={SMALL_BUBBLE_SIZE / 2}
          r={SMALL_RING_RADIUS}
          stroke={colors.border}
          strokeWidth={SMALL_RING_STROKE}
          fill="none"
        />
        {/* Progress ring */}
        <AnimatedCircle
          cx={SMALL_BUBBLE_SIZE / 2}
          cy={SMALL_BUBBLE_SIZE / 2}
          r={SMALL_RING_RADIUS}
          stroke={colors.primary}
          strokeWidth={SMALL_RING_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={SMALL_RING_CIRCUMFERENCE}
          strokeDashoffset={smallDashOffset}
          rotation="-90"
          origin={`${SMALL_BUBBLE_SIZE / 2}, ${SMALL_BUBBLE_SIZE / 2}`}
        />
      </Svg>
      <Text style={styles.smallTimeText}>{timeStr}</Text>
    </TouchableOpacity>
  );
}

// ---- Styles ----

const styles = StyleSheet.create({
  // ---- Big overlay mode ----
  bigOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  bigContainer: {
    alignItems: 'center',
    gap: spacing.xl,
  },
  bigRingSvg: {
    // SVG positioned absolutely behind time text
  },
  bigTimeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: BIG_RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bigTimeText: {
    color: colors.text,
    fontSize: 100,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  bigLabel: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    marginTop: spacing.xs,
  },
  bigActions: {
    flexDirection: 'row',
    gap: spacing.xxl,
  },
  bigActionButton: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  bigActionLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },

  // ---- Small bubble mode ----
  smallBubble: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    width: SMALL_BUBBLE_SIZE,
    height: SMALL_BUBBLE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    backgroundColor: colors.surface,
    borderRadius: SMALL_BUBBLE_SIZE / 2,
    zIndex: 100,
  },
  smallRingSvg: {
    position: 'absolute',
  },
  smallTimeText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
