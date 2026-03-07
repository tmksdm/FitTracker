// ==========================================
// Modal for finishing workout — multi-step:
// Step 1: Cardio input (skippable)
// Step 2: Post-workout body weight + summary
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
import { CardioType, DayTypeId } from '../types';
import { colors, spacing, fontSize, borderRadius, touchTarget } from '../theme';

// ---- Helper ----
function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ---- Props ----
interface FinishWorkoutModalProps {
  visible: boolean;
  exercisesDone: number;
  exercisesTotal: number;
  exercisesSkipped: number;
  // Cardio props
  dayTypeId: DayTypeId;
  cardioType: CardioType | null;
  jumpRopeCount: number | null;
  treadmillSeconds: number | null;
  isCardioCompleted: boolean;
  onSaveJumpRope: (count: number) => void;
  onSaveTreadmill: (seconds: number) => void;
  onClearCardio: () => void;
  // Finish
  onFinish: (weightAfter: number | null) => void;
  onCancel: () => void;
}

type Step = 'cardio' | 'summary';

export default function FinishWorkoutModal({
  visible,
  exercisesDone,
  exercisesTotal,
  exercisesSkipped,
  dayTypeId,
  cardioType,
  jumpRopeCount,
  treadmillSeconds,
  isCardioCompleted,
  onSaveJumpRope,
  onSaveTreadmill,
  onClearCardio,
  onFinish,
  onCancel,
}: FinishWorkoutModalProps) {
  const [step, setStep] = useState<Step>('cardio');
  const [weightText, setWeightText] = useState('');

  // Reset state when modal opens
  React.useEffect(() => {
    if (visible) {
      setStep('cardio');
      setWeightText('');
    }
  }, [visible]);

  const handleGoToSummary = () => {
    setStep('summary');
  };

  const handleBackToCardio = () => {
    setStep('cardio');
  };

  const handleFinish = () => {
    const weight = weightText.trim()
      ? parseFloat(weightText.replace(',', '.'))
      : null;
    const validWeight =
      weight !== null && !isNaN(weight) && weight > 0 ? weight : null;
    onFinish(validWeight);
  };

  const handleCancel = () => {
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
          {step === 'cardio' ? (
            <CardioStep
              dayTypeId={dayTypeId}
              cardioType={cardioType}
              jumpRopeCount={jumpRopeCount}
              treadmillSeconds={treadmillSeconds}
              isCardioCompleted={isCardioCompleted}
              onSaveJumpRope={onSaveJumpRope}
              onSaveTreadmill={onSaveTreadmill}
              onClearCardio={onClearCardio}
              onNext={handleGoToSummary}
              onCancel={handleCancel}
            />
          ) : (
            <SummaryStep
              exercisesDone={exercisesDone}
              exercisesTotal={exercisesTotal}
              exercisesSkipped={exercisesSkipped}
              notStarted={notStarted}
              isCardioCompleted={isCardioCompleted}
              cardioType={cardioType}
              jumpRopeCount={jumpRopeCount}
              treadmillSeconds={treadmillSeconds}
              weightText={weightText}
              onWeightChange={setWeightText}
              onBack={handleBackToCardio}
              onFinish={handleFinish}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ==========================================
// STEP 1: Cardio
// ==========================================

interface CardioStepProps {
  dayTypeId: DayTypeId;
  cardioType: CardioType | null;
  jumpRopeCount: number | null;
  treadmillSeconds: number | null;
  isCardioCompleted: boolean;
  onSaveJumpRope: (count: number) => void;
  onSaveTreadmill: (seconds: number) => void;
  onClearCardio: () => void;
  onNext: () => void;
  onCancel: () => void;
}

function CardioStep({
  dayTypeId,
  cardioType,
  jumpRopeCount,
  treadmillSeconds,
  isCardioCompleted,
  onSaveJumpRope,
  onSaveTreadmill,
  onClearCardio,
  onNext,
  onCancel,
}: CardioStepProps) {
  const isSquatDay = dayTypeId === 1;

  return (
    <>
      {/* Step indicator */}
      <View style={styles.stepIndicator}>
        <View style={[styles.stepDot, styles.stepDotActive]} />
        <View style={styles.stepLine} />
        <View style={styles.stepDot} />
      </View>

      <MaterialCommunityIcons
        name={isSquatDay ? 'jump-rope' : 'run'}
        size={36}
        color={colors.info}
      />

      <Text style={styles.title}>
        {isSquatDay ? 'Скакалка' : 'Бег 3 км'}
      </Text>
      <Text style={styles.subtitle}>
        {isSquatDay
          ? '1 минута — запишите количество прыжков'
          : 'Запишите время пробежки 3 км'}
      </Text>

      {/* Cardio input */}
      {isCardioCompleted ? (
        <CardioCompletedView
          isSquatDay={isSquatDay}
          jumpRopeCount={jumpRopeCount}
          treadmillSeconds={treadmillSeconds}
          onClear={onClearCardio}
        />
      ) : isSquatDay ? (
        <JumpRopeInput onSave={onSaveJumpRope} />
      ) : (
        <TreadmillInput onSave={onSaveTreadmill} />
      )}

      {/* Buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>Назад</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={onNext}
          activeOpacity={0.7}
        >
          <Text style={styles.nextButtonText}>
            {isCardioCompleted ? 'Далее' : 'Пропустить'}
          </Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={colors.textOnPrimary}
          />
        </TouchableOpacity>
      </View>
    </>
  );
}

// ---- Cardio completed view (inline in modal) ----

function CardioCompletedView({
  isSquatDay,
  jumpRopeCount,
  treadmillSeconds,
  onClear,
}: {
  isSquatDay: boolean;
  jumpRopeCount: number | null;
  treadmillSeconds: number | null;
  onClear: () => void;
}) {
  return (
    <View style={styles.cardioCompletedContainer}>
      <View style={styles.cardioCompletedResult}>
        <MaterialCommunityIcons
          name="check-circle"
          size={28}
          color={colors.success}
        />
        <Text style={styles.cardioCompletedValue}>
          {isSquatDay
            ? `${jumpRopeCount ?? 0} прыжков`
            : formatDuration(treadmillSeconds ?? 0)}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.editButton}
        onPress={onClear}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name="pencil" size={16} color={colors.textMuted} />
        <Text style={styles.editButtonText}>Изменить</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---- Jump rope input (inline in modal) ----

function JumpRopeInput({ onSave }: { onSave: (count: number) => void }) {
  const [text, setText] = useState('');

  const handleSave = () => {
    const count = parseInt(text, 10);
    if (!isNaN(count) && count > 0) {
      onSave(count);
    }
  };

  return (
    <View style={styles.cardioInputSection}>
      <Text style={styles.cardioInputLabel}>Количество прыжков</Text>
      <View style={styles.cardioInputRow}>
        <TextInput
          style={styles.cardioNumberInput}
          value={text}
          onChangeText={setText}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          selectTextOnFocus
          maxLength={4}
        />
        <TouchableOpacity
          style={[
            styles.saveCardioButton,
            !text.trim() && styles.saveCardioButtonDisabled,
          ]}
          onPress={handleSave}
          activeOpacity={0.7}
          disabled={!text.trim()}
        >
          <MaterialCommunityIcons
            name="check"
            size={24}
            color={text.trim() ? colors.textOnPrimary : colors.textMuted}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---- Treadmill input (inline in modal) ----

function TreadmillInput({ onSave }: { onSave: (seconds: number) => void }) {
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');

  const handleSave = () => {
    const m = parseInt(minutes, 10) || 0;
    const s = parseInt(seconds, 10) || 0;
    const total = m * 60 + s;
    if (total > 0) {
      onSave(total);
    }
  };

  const hasValue =
    (parseInt(minutes, 10) || 0) > 0 || (parseInt(seconds, 10) || 0) > 0;

  return (
    <View style={styles.cardioInputSection}>
      <Text style={styles.cardioInputLabel}>Время пробежки</Text>
      <View style={styles.cardioInputRow}>
        <View style={styles.timeInputGroup}>
          <TextInput
            style={styles.timeInput}
            value={minutes}
            onChangeText={(t) => setMinutes(t.replace(/[^0-9]/g, ''))}
            placeholder="00"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            selectTextOnFocus
            maxLength={2}
          />
          <Text style={styles.timeLabel}>мин</Text>
          <Text style={styles.timeSeparator}>:</Text>
          <TextInput
            style={styles.timeInput}
            value={seconds}
            onChangeText={(t) => {
              const clean = t.replace(/[^0-9]/g, '');
              if (parseInt(clean, 10) > 59) return;
              setSeconds(clean);
            }}
            placeholder="00"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            selectTextOnFocus
            maxLength={2}
          />
          <Text style={styles.timeLabel}>сек</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.saveCardioButton,
            !hasValue && styles.saveCardioButtonDisabled,
          ]}
          onPress={handleSave}
          activeOpacity={0.7}
          disabled={!hasValue}
        >
          <MaterialCommunityIcons
            name="check"
            size={24}
            color={hasValue ? colors.textOnPrimary : colors.textMuted}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ==========================================
// STEP 2: Summary + body weight
// ==========================================

interface SummaryStepProps {
  exercisesDone: number;
  exercisesTotal: number;
  exercisesSkipped: number;
  notStarted: number;
  isCardioCompleted: boolean;
  cardioType: CardioType | null;
  jumpRopeCount: number | null;
  treadmillSeconds: number | null;
  weightText: string;
  onWeightChange: (text: string) => void;
  onBack: () => void;
  onFinish: () => void;
}

function SummaryStep({
  exercisesDone,
  exercisesTotal,
  exercisesSkipped,
  notStarted,
  isCardioCompleted,
  cardioType,
  jumpRopeCount,
  treadmillSeconds,
  weightText,
  onWeightChange,
  onBack,
  onFinish,
}: SummaryStepProps) {
  const isSquatDay = cardioType === 'jump_rope';

  return (
    <>
      {/* Step indicator */}
      <View style={styles.stepIndicator}>
        <View style={[styles.stepDot, styles.stepDotDone]} />
        <View style={[styles.stepLine, styles.stepLineDone]} />
        <View style={[styles.stepDot, styles.stepDotActive]} />
      </View>

      <MaterialCommunityIcons
        name="flag-checkered"
        size={36}
        color={colors.primary}
      />

      <Text style={styles.title}>Завершить тренировку?</Text>

      {/* Exercise summary */}
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

      {/* Cardio result (if completed) */}
      {isCardioCompleted && (
        <View style={styles.cardioResultRow}>
          <MaterialCommunityIcons
            name={isSquatDay ? 'jump-rope' : 'run'}
            size={18}
            color={colors.info}
          />
          <Text style={styles.cardioResultText}>
            {isSquatDay
              ? `Скакалка: ${jumpRopeCount ?? 0} прыжков`
              : `Бег 3 км: ${formatDuration(treadmillSeconds ?? 0)}`}
          </Text>
          <MaterialCommunityIcons
            name="check-circle"
            size={16}
            color={colors.success}
          />
        </View>
      )}

      {notStarted > 0 && (
        <View style={styles.warningBox}>
          <MaterialCommunityIcons
            name="alert-outline"
            size={18}
            color={colors.warning}
          />
          <Text style={styles.warningText}>
            {notStarted} упражнений не начато — они будут отмечены как
            пропущенные
          </Text>
        </View>
      )}

      {/* Weight input */}
      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>
          Вес тела после тренировки (кг)
        </Text>
        <View style={styles.inputRow}>
          <MaterialCommunityIcons
            name="scale-bathroom"
            size={24}
            color={colors.textMuted}
          />
          <TextInput
            style={styles.input}
            value={weightText}
            onChangeText={onWeightChange}
            placeholder="Например, 84,5"
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
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>Назад</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.finishButton}
          onPress={onFinish}
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
    </>
  );
}

// ==========================================
// STYLES
// ==========================================

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

  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surfaceLight,
    borderWidth: 2,
    borderColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepDotDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.border,
  },
  stepLineDone: {
    backgroundColor: colors.success,
  },

  // Title
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },

  // Summary row
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

  // Cardio result on summary
  cardioResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.info + '15',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    width: '100%',
  },
  cardioResultText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '500',
    flex: 1,
  },

  // Warning
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

  // Weight input (summary step)
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

  // Cardio input section (cardio step)
  cardioInputSection: {
    width: '100%',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  cardioInputLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  cardioInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardioNumberInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: spacing.md,
    minHeight: touchTarget.large,
  },
  timeInputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: spacing.md,
    minHeight: touchTarget.large,
  },
  timeLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  timeSeparator: {
    color: colors.textMuted,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  saveCardioButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    width: touchTarget.large,
    height: touchTarget.large,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveCardioButtonDisabled: {
    backgroundColor: colors.surfaceLight,
  },

  // Cardio completed (cardio step)
  cardioCompletedContainer: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    width: '100%',
  },
  cardioCompletedResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardioCompletedValue: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  editButtonText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },

  // Buttons (shared)
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
  nextButton: {
    flex: 2,
    height: touchTarget.comfortable,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  nextButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
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
