// ==========================================
// Horizontal exercise navigator (chips/pills)
// ==========================================

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActiveExercise } from '../stores/workoutStore';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { getStatusColor } from '../theme';

interface ExerciseListProps {
  exercises: ActiveExercise[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

export default function ExerciseList({
  exercises,
  currentIndex,
  onSelect,
}: ExerciseListProps) {
  const scrollRef = useRef<ScrollView>(null);

  // Auto-scroll to current exercise chip
  useEffect(() => {
    if (scrollRef.current && currentIndex >= 0) {
      // Approximate: each chip ~90px wide + gaps
      const offset = Math.max(0, currentIndex * 100 - 50);
      scrollRef.current.scrollTo({ x: offset, animated: true });
    }
  }, [currentIndex]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.container}
    >
      {exercises.map((activeEx, index) => {
        const isActive = index === currentIndex;
        const statusColor = getStatusColor(activeEx.status);

        return (
          <TouchableOpacity
            key={activeEx.exercise.id}
            style={[
              styles.chip,
              isActive && styles.chipActive,
              isActive && { borderColor: statusColor },
            ]}
            onPress={() => onSelect(index)}
            activeOpacity={0.7}
          >
            {/* Status dot */}
            <View
              style={[
                styles.statusDot,
                { backgroundColor: statusColor },
              ]}
            />

            {/* Exercise number and name */}
            <Text
              style={[
                styles.chipText,
                isActive && styles.chipTextActive,
              ]}
              numberOfLines={1}
            >
              {index + 1}. {activeEx.exercise.name}
            </Text>

            {/* Priority marker */}
            {activeEx.isPriority && (
              <MaterialCommunityIcons
                name="alert-circle"
                size={12}
                color={colors.warning}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 44,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
    maxWidth: 180,
  },
  chipActive: {
    backgroundColor: colors.surfaceLight,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
