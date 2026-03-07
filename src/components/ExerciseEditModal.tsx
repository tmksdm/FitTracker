// ==========================================
// Модалка редактирования / добавления упражнения
// ==========================================

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Exercise, DayTypeId } from '../types';
import {
  colors,
  spacing,
  fontSize,
  borderRadius,
  touchTarget,
} from '../theme';

// Fields editable in the modal
interface ExerciseFormData {
  name: string;
  hasAddedWeight: boolean;
  workingWeight: string; // string for TextInput, parsed to number on save
  weightIncrement: string;
  warmup1Percent: string;
  warmup2Percent: string;
  warmup1Reps: string;
  warmup2Reps: string;
  maxRepsPerSet: string;
  minRepsPerSet: string;
  numWorkingSets: string;
}

interface ExerciseEditModalProps {
  visible: boolean;
  exercise: Exercise | null; // null = creating new
  dayTypeId: DayTypeId;
  onSave: (data: Partial<Exercise> & { name: string }) => void;
  onCancel: () => void;
}

function exerciseToForm(exercise: Exercise | null): ExerciseFormData {
  if (!exercise) {
    return {
      name: '',
      hasAddedWeight: true,
      workingWeight: '',
      weightIncrement: '2.5',
      warmup1Percent: '60',
      warmup2Percent: '80',
      warmup1Reps: '12',
      warmup2Reps: '10',
      maxRepsPerSet: '8',
      minRepsPerSet: '4',
      numWorkingSets: '3',
    };
  }
  return {
    name: exercise.name,
    hasAddedWeight: exercise.hasAddedWeight,
    workingWeight: exercise.workingWeight != null ? String(exercise.workingWeight) : '',
    weightIncrement: String(exercise.weightIncrement),
    warmup1Percent: exercise.warmup1Percent != null ? String(exercise.warmup1Percent) : '60',
    warmup2Percent: exercise.warmup2Percent != null ? String(exercise.warmup2Percent) : '80',
    warmup1Reps: String(exercise.warmup1Reps),
    warmup2Reps: String(exercise.warmup2Reps),
    maxRepsPerSet: String(exercise.maxRepsPerSet),
    minRepsPerSet: String(exercise.minRepsPerSet),
    numWorkingSets: String(exercise.numWorkingSets),
  };
}

function parseFloat_(s: string): number | null {
  // Allow both dot and comma as decimal separator
  const normalized = s.replace(',', '.');
  const n = parseFloat(normalized);
  return isNaN(n) ? null : n;
}

function parseInt_(s: string): number {
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}

export default function ExerciseEditModal({
  visible,
  exercise,
  dayTypeId,
  onSave,
  onCancel,
}: ExerciseEditModalProps) {
  const [form, setForm] = useState<ExerciseFormData>(exerciseToForm(exercise));

  // Reset form when exercise changes
  useEffect(() => {
    if (visible) {
      setForm(exerciseToForm(exercise));
    }
  }, [visible, exercise]);

  const isNew = exercise === null;
  const title = isNew ? 'Новое упражнение' : 'Редактирование';

  const updateField = <K extends keyof ExerciseFormData>(
    key: K,
    value: ExerciseFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const name = form.name.trim();
    if (!name) return; // don't save without name

    const data: Partial<Exercise> & { name: string } = {
      name,
      hasAddedWeight: form.hasAddedWeight,
      workingWeight: form.hasAddedWeight ? (parseFloat_(form.workingWeight) ?? null) : null,
      weightIncrement: parseFloat_(form.weightIncrement) ?? 2.5,
      warmup1Percent: form.hasAddedWeight ? (parseFloat_(form.warmup1Percent) ?? 60) : null,
      warmup2Percent: form.hasAddedWeight ? (parseFloat_(form.warmup2Percent) ?? 80) : null,
      warmup1Reps: parseInt_(form.warmup1Reps) || 12,
      warmup2Reps: parseInt_(form.warmup2Reps) || 10,
      maxRepsPerSet: form.maxRepsPerSet.trim() !== '' ? parseInt_(form.maxRepsPerSet) : 8,
      minRepsPerSet: form.minRepsPerSet.trim() !== ''
        ? (form.hasAddedWeight
            ? Math.max(4, parseInt_(form.minRepsPerSet))
            : parseInt_(form.minRepsPerSet))
        : 4,
      numWorkingSets: parseInt_(form.numWorkingSets) || 3,
    };

    onSave(data);
  };

  const canSave = form.name.trim().length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onCancel} hitSlop={12}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Название</Text>
              <TextInput
                style={styles.textInput}
                value={form.name}
                onChangeText={(v) => updateField('name', v)}
                placeholder="Например: Присед со штангой"
                placeholderTextColor={colors.textMuted}
                autoFocus={isNew}
              />
            </View>

            {/* Has added weight */}
            <View style={styles.switchRow}>
              <Text style={styles.label}>С отягощением</Text>
              <Switch
                value={form.hasAddedWeight}
                onValueChange={(v) => updateField('hasAddedWeight', v)}
                trackColor={{ false: colors.surfaceLight, true: colors.primaryDark }}
                thumbColor={form.hasAddedWeight ? colors.primary : colors.textMuted}
              />
            </View>

            {/* Weight fields — only if hasAddedWeight */}
            {form.hasAddedWeight && (
              <>
                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <Text style={styles.label}>Рабочий вес (кг)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={form.workingWeight}
                      onChangeText={(v) => updateField('workingWeight', v)}
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.halfField}>
                    <Text style={styles.label}>Шаг веса (кг)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={form.weightIncrement}
                      onChangeText={(v) => updateField('weightIncrement', v)}
                      placeholder="2.5"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                {/* Warmup percents */}
                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <Text style={styles.label}>Разминка 1 (%)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={form.warmup1Percent}
                      onChangeText={(v) => updateField('warmup1Percent', v)}
                      placeholder="60"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.halfField}>
                    <Text style={styles.label}>Разминка 2 (%)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={form.warmup2Percent}
                      onChangeText={(v) => updateField('warmup2Percent', v)}
                      placeholder="80"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                {/* Warmup reps */}
                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <Text style={styles.label}>Повт. разм. 1</Text>
                    <TextInput
                      style={styles.textInput}
                      value={form.warmup1Reps}
                      onChangeText={(v) => updateField('warmup1Reps', v)}
                      placeholder="12"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.halfField}>
                    <Text style={styles.label}>Повт. разм. 2</Text>
                    <TextInput
                      style={styles.textInput}
                      value={form.warmup2Reps}
                      onChangeText={(v) => updateField('warmup2Reps', v)}
                      placeholder="10"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              </>
            )}

            {/* Working sets config */}
            <View style={styles.row}>
              <View style={styles.thirdField}>
                <Text style={styles.label}>Раб. подходы</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.numWorkingSets}
                  onChangeText={(v) => updateField('numWorkingSets', v)}
                  placeholder="3"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.thirdField}>
                <Text style={styles.label}>Мин. повт.</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.minRepsPerSet}
                  onChangeText={(v) => updateField('minRepsPerSet', v)}
                  placeholder="4"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.thirdField}>
                <Text style={styles.label}>Макс. повт.</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.maxRepsPerSet}
                  onChangeText={(v) => updateField('maxRepsPerSet', v)}
                  placeholder="8"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveButton,
                !canSave && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!canSave}
            >
              <MaterialCommunityIcons
                name="check"
                size={20}
                color={colors.textOnPrimary}
              />
              <Text style={styles.saveButtonText}>
                {isNew ? 'Добавить' : 'Сохранить'}
              </Text>
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
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: 2,
  },
  textInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.text,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfField: {
    flex: 1,
    gap: spacing.xs,
  },
  thirdField: {
    flex: 1,
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    height: touchTarget.comfortable,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    height: touchTarget.comfortable,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
