// ==========================================
// Модалка старта тренировки (ввод веса тела)
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

interface StartWorkoutModalProps {
  visible: boolean;
  dayTypeName: string;
  onStart: (weightBefore: number | null) => void;
  onCancel: () => void;
}

export default function StartWorkoutModal({
  visible,
  dayTypeName,
  onStart,
  onCancel,
}: StartWorkoutModalProps) {
  const [weightText, setWeightText] = useState('');

  const handleStart = () => {
    const weight = weightText.trim() ? parseFloat(weightText.replace(',', '.')) : null;
    const validWeight = weight !== null && !isNaN(weight) && weight > 0 ? weight : null;
    onStart(validWeight);
    setWeightText('');
  };

  const handleCancel = () => {
    setWeightText('');
    onCancel();
  };

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
          <Text style={styles.title}>Начать тренировку</Text>
          <Text style={styles.subtitle}>{dayTypeName}</Text>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Вес тела (кг)</Text>
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
                placeholder="Например, 85.5"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                autoFocus
                selectTextOnFocus
              />
              <Text style={styles.inputUnit}>кг</Text>
            </View>
            <Text style={styles.inputHint}>
              Можно пропустить — нажмите «Старт» без ввода
            </Text>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStart}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="play"
                size={22}
                color={colors.textOnPrimary}
              />
              <Text style={styles.startButtonText}>Старт</Text>
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
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  inputSection: {
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
  inputHint: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
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
  startButton: {
    flex: 2,
    height: touchTarget.comfortable,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  startButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
