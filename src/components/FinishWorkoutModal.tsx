// ==========================================
// Modal for finishing workout (post body weight entry)
// ==========================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius, touchTarget } from '../theme';

interface FinishWorkoutModalProps {
  visible: boolean;
  exercisesDone: number;
  exercisesTotal: number;
  exercisesSkipped: number;
  onFinish: (weightAfter: number | null) => void;
  onCancel: () => void;
}

export default function FinishWorkoutModal({
  visible,
  exercisesDone,
  exercisesTotal,
  exercisesSkipped,
  onFinish,
  onCancel,
}: FinishWorkoutModalProps) {
  const [weightText, setWeightText] = useState('');

  const handleFinish = () => {
    const weight = weightText.trim()
      ? parseFloat(weightText.replace(',', '.'))
      : null;
    const validWeight =
      weight !== null && !isNaN(weight) && weight > 0 ? weight : null;
    onFinish(validWeight);
    setWeightText('');
  };

  const handleCancel = () => {
    setWeightText('');
    onCancel();
  };

  const notStarted = exercisesTotal - exercisesDone - exercisesSkipped;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.content}>
          <MaterialCommunityIcons
            name="flag-checkered"
            size={36}
            color={colors.primary}
          />

          <Text style={styles.title}>Завершить тренировку?</Text>

          {/* Summary */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                {exercisesDone}
              </Text>
              <Text style={styles.summaryLabel}>Выполнено</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.error }]}>
                {exercisesSkipped}
              </Text>
              <Text style={styles.summaryLabel}>Пропущено</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.textMuted }]}>
                {notStarted}
              </Text>
              <Text style={styles.summaryLabel}>Не начато</Text>
            </View>
          </View>

          {notStarted > 0 && (
            <View style={styles.warningBox}>
              <MaterialCommunityIcons
                name="alert-outline"
                size={18}
                color={colors.warning}
              />
              <Text style={styles.warningText}>
                {notStarted} упражнений не начато — они будут отмечены как пропущенные
              </Text>
            </View>
          )}

          {/* Weight input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Вес тела после тренировки (кг)</Text>
            <View style={styles.inputRow}>
              <MaterialCommunityIcons
                name="scale-bathroom"
                size={24}
                color={colors.textMuted}
              />
              <TextInput
                style={styles.input}
                value={weightText}
                onChangeText={setWeightText}
                placeholder="Например, 84.5"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                selectTextOnFocus
              />
              <Text style={styles.inputUnit}>кг</Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Назад</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.finishButton}
              onPress={handleFinish}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="check"
                size={22}
                color={colors.textOnPrimary}
              />
              <Text style={styles.finishButtonText}>Завершить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning + '20',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    width: '100%',
  },
  warningText: {
    color: colors.warning,
    fontSize: fontSize.sm,
    flex: 1,
  },
  inputSection: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '600',
    paddingVertical: spacing.md,
  },
  inputUnit: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    height: touchTarget.comfortable,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  finishButton: {
    flex: 2,
    height: touchTarget.comfortable,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  finishButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
