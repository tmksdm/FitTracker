// ==========================================
// Row for a single set (warmup or working)
// ==========================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActiveSet } from '../stores/workoutStore';
import { colors, spacing, fontSize, borderRadius, touchTarget } from '../theme';

interface SetRowProps {
  set: ActiveSet;
  exerciseIndex: number;
  setIndex: number;
  onComplete: (exerciseIndex: number, setIndex: number, actualReps?: number) => void;
  onUpdateReps: (exerciseIndex: number, setIndex: number, reps: number) => void;
}

export default function SetRow({
  set,
  exerciseIndex,
  setIndex,
  onComplete,
  onUpdateReps,
}: SetRowProps) {
  const [showRepsModal, setShowRepsModal] = useState(false);
  const [repsText, setRepsText] = useState('');

  const isWarmup = set.setType === 'warmup';
  const isCompleted = set.isCompleted;

  const displayReps = isCompleted
    ? (set.actualReps ?? set.targetReps)
    : set.targetReps;

  // Quick complete at target
  const handleQuickComplete = () => {
    onComplete(exerciseIndex, setIndex);
  };

  // Open modal to adjust reps
  const handleRepsPress = () => {
    if (isCompleted) {
      // Allow editing completed set
      setRepsText(String(set.actualReps ?? set.targetReps));
    } else {
      setRepsText(String(set.targetReps));
    }
    setShowRepsModal(true);
  };

  // Save adjusted reps
  const handleRepsSave = () => {
    const reps = parseInt(repsText, 10);
    if (!isNaN(reps) && reps >= 0) {
      if (isCompleted) {
        onUpdateReps(exerciseIndex, setIndex, reps);
      } else {
        onComplete(exerciseIndex, setIndex, reps);
      }
    }
    setShowRepsModal(false);
    setRepsText('');
  };

  const handleRepsCancel = () => {
    setShowRepsModal(false);
    setRepsText('');
  };

  // Increment / decrement in modal
  const adjustReps = (delta: number) => {
    const current = parseInt(repsText, 10) || 0;
    const next = Math.max(0, current + delta);
    setRepsText(String(next));
  };

  // Set badge label
  const setLabel = isWarmup ? `Р${set.setNumber}` : `П${set.setNumber - (isWarmup ? 0 : 0)}`;
  const setLabelFormatted = isWarmup
    ? `Разм. ${set.setNumber}`
    : `Подход ${set.setNumber}`;

  return (
    <>
      <View
        style={[
          styles.container,
          isCompleted && styles.containerCompleted,
          isWarmup && styles.containerWarmup,
        ]}
      >
        {/* Set label */}
        <View style={styles.labelSection}>
          <View
            style={[
              styles.badge,
              isWarmup && styles.badgeWarmup,
              isCompleted && styles.badgeCompleted,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                isCompleted && styles.badgeTextCompleted,
              ]}
            >
              {isWarmup ? 'Р' : 'П'}
              {set.setNumber}
            </Text>
          </View>

          {/* Weight */}
          <Text style={styles.weight}>
            {set.weight > 0 ? `${set.weight} кг` : 'Своё тело'}
          </Text>
        </View>

        {/* Reps (tappable) */}
        <TouchableOpacity
          style={styles.repsButton}
          onPress={handleRepsPress}
          activeOpacity={0.6}
        >
          <Text
            style={[
              styles.repsText,
              isCompleted && styles.repsTextCompleted,
              isCompleted &&
                set.actualReps !== null &&
                set.actualReps < set.targetReps &&
                styles.repsTextBelow,
              isCompleted &&
                set.actualReps !== null &&
                set.actualReps > set.targetReps &&
                styles.repsTextAbove,
            ]}
          >
            {displayReps}
          </Text>
          {!isCompleted && (
            <Text style={styles.repsLabel}>повт.</Text>
          )}
          {isCompleted && set.actualReps !== null && set.actualReps !== set.targetReps && (
            <Text style={styles.targetHint}>/{set.targetReps}</Text>
          )}
        </TouchableOpacity>

        {/* Complete button */}
        {!isCompleted ? (
          <TouchableOpacity
            style={styles.doneButton}
            onPress={handleQuickComplete}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="check-bold"
              size={24}
              color={colors.textOnPrimary}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.doneIndicator}>
            <MaterialCommunityIcons
              name="check-circle"
              size={28}
              color={colors.success}
            />
          </View>
        )}
      </View>

      {/* Reps adjustment modal */}
      <Modal
        visible={showRepsModal}
        transparent
        animationType="fade"
        onRequestClose={handleRepsCancel}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={modalStyles.overlay}
        >
          <View style={modalStyles.content}>
            <Text style={modalStyles.title}>{setLabelFormatted}</Text>
            <Text style={modalStyles.subtitle}>
              {set.weight > 0 ? `${set.weight} кг` : 'Своё тело'} · Цель: {set.targetReps} повт.
            </Text>

            <View style={modalStyles.stepperRow}>
              <TouchableOpacity
                style={modalStyles.stepperBtn}
                onPress={() => adjustReps(-1)}
                activeOpacity={0.6}
              >
                <MaterialCommunityIcons
                  name="minus"
                  size={28}
                  color={colors.text}
                />
              </TouchableOpacity>

              <TextInput
                style={modalStyles.input}
                value={repsText}
                onChangeText={setRepsText}
                keyboardType="number-pad"
                selectTextOnFocus
                autoFocus
              />

              <TouchableOpacity
                style={modalStyles.stepperBtn}
                onPress={() => adjustReps(1)}
                activeOpacity={0.6}
              >
                <MaterialCommunityIcons
                  name="plus"
                  size={28}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            <View style={modalStyles.buttons}>
              <TouchableOpacity
                style={modalStyles.cancelBtn}
                onPress={handleRepsCancel}
                activeOpacity={0.7}
              >
                <Text style={modalStyles.cancelText}>Отмена</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={modalStyles.saveBtn}
                onPress={handleRepsSave}
                activeOpacity={0.7}
              >
                <Text style={modalStyles.saveText}>Готово</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  containerCompleted: {
    borderColor: colors.success,
    opacity: 0.85,
  },
  containerWarmup: {
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
  },
  labelSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    minWidth: 36,
    alignItems: 'center',
  },
  badgeWarmup: {
    backgroundColor: colors.info + '30',
  },
  badgeCompleted: {
    backgroundColor: colors.success + '30',
  },
  badgeText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  badgeTextCompleted: {
    color: colors.success,
  },
  weight: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  repsButton: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 70,
    justifyContent: 'center',
  },
  repsText: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  repsTextCompleted: {
    color: colors.success,
  },
  repsTextBelow: {
    color: colors.warning,
  },
  repsTextAbove: {
    color: colors.info,
  },
  repsLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginLeft: 2,
  },
  targetHint: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginLeft: 2,
  },
  doneButton: {
    width: touchTarget.comfortable,
    height: touchTarget.comfortable,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneIndicator: {
    width: touchTarget.comfortable,
    height: touchTarget.comfortable,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  content: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  stepperBtn: {
    width: touchTarget.large,
    height: touchTarget.large,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    color: colors.text,
    fontSize: fontSize.huge,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 80,
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: touchTarget.comfortable,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    height: touchTarget.comfortable,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
