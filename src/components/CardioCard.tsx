// ==========================================
// Cardio input card (jump rope / treadmill)
// ==========================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CardioType, DayTypeId } from '../types';
import {
  colors,
  spacing,
  fontSize,
  borderRadius,
  touchTarget,
  getDayTypeColor,
} from '../theme';

interface CardioCardProps {
  dayTypeId: DayTypeId;
  /** Jump rope count or null */
  jumpRopeCount: number | null;
  /** Treadmill duration in seconds or null */
  treadmillSeconds: number | null;
  /** Whether cardio has been recorded */
  isCompleted: boolean;
  onSaveJumpRope: (count: number) => void;
  onSaveTreadmill: (seconds: number) => void;
  onClear: () => void;
}

/** Format seconds as "MM:SS" */
function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function CardioCard({
  dayTypeId,
  jumpRopeCount,
  treadmillSeconds,
  isCompleted,
  onSaveJumpRope,
  onSaveTreadmill,
  onClear,
}: CardioCardProps) {
  const isSquatDay = dayTypeId === 1;
  const cardioType: CardioType = isSquatDay ? 'jump_rope' : 'treadmill_3km';
  const accentColor = getDayTypeColor(dayTypeId);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.cardioBadge}>
            <MaterialCommunityIcons
              name={isSquatDay ? 'jump-rope' : 'run'}
              size={14}
              color={colors.info}
            />
            <Text style={styles.cardioBadgeText}>Кардио</Text>
          </View>
          <Text style={styles.cardioName}>
            {isSquatDay ? 'Скакалка' : 'Бег 3 км'}
          </Text>
          <Text style={styles.cardioDesc}>
            {isSquatDay
              ? '1 минута — запишите количество прыжков'
              : 'Запишите время пробежки'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View
            style={[
              styles.statusBadge,
              isCompleted
                ? { backgroundColor: colors.success + '30' }
                : { backgroundColor: colors.surfaceLight },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                isCompleted
                  ? { color: colors.success }
                  : { color: colors.textMuted },
              ]}
            >
              {isCompleted ? 'Записано' : 'Не начато'}
            </Text>
          </View>
        </View>
      </View>

      {/* Input area */}
      {isCompleted ? (
        <CompletedView
          isSquatDay={isSquatDay}
          jumpRopeCount={jumpRopeCount}
          treadmillSeconds={treadmillSeconds}
          onClear={onClear}
        />
      ) : isSquatDay ? (
        <JumpRopeInput onSave={onSaveJumpRope} />
      ) : (
        <TreadmillInput onSave={onSaveTreadmill} />
      )}
    </View>
  );
}

// ---- Completed state view ----

function CompletedView({
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
    <View style={styles.completedContainer}>
      <View style={styles.completedResult}>
        <MaterialCommunityIcons
          name="check-circle"
          size={28}
          color={colors.success}
        />
        <Text style={styles.completedValue}>
          {isSquatDay
            ? `${jumpRopeCount ?? 0} прыжков`
            : formatDuration(treadmillSeconds ?? 0)}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.clearButton}
        onPress={onClear}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name="pencil" size={16} color={colors.textMuted} />
        <Text style={styles.clearText}>Изменить</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---- Jump rope input ----

function JumpRopeInput({ onSave }: { onSave: (count: number) => void }) {
  const [text, setText] = useState('');

  const handleSave = () => {
    const count = parseInt(text, 10);
    if (!isNaN(count) && count > 0) {
      onSave(count);
    }
  };

  return (
    <View style={styles.inputSection}>
      <Text style={styles.inputLabel}>Количество прыжков</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.numberInput}
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
            styles.saveButton,
            !text.trim() && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          activeOpacity={0.7}
          disabled={!text.trim()}
        >
          <MaterialCommunityIcons
            name="check"
            size={24}
            color={
              text.trim() ? colors.textOnPrimary : colors.textMuted
            }
          />
          <Text
            style={[
              styles.saveButtonText,
              !text.trim() && { color: colors.textMuted },
            ]}
          >
            Записать
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---- Treadmill input ----

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

  const hasValue = (parseInt(minutes, 10) || 0) > 0 || (parseInt(seconds, 10) || 0) > 0;

  return (
    <View style={styles.inputSection}>
      <Text style={styles.inputLabel}>Время пробежки</Text>
      <View style={styles.inputRow}>
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
              // Clamp seconds to 59
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
            styles.saveButton,
            !hasValue && styles.saveButtonDisabled,
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
          <Text
            style={[
              styles.saveButtonText,
              !hasValue && { color: colors.textMuted },
            ]}
          >
            Записать
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  headerRight: {
    justifyContent: 'flex-start',
  },
  cardioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
  },
  cardioBadgeText: {
    color: colors.info,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardioName: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  cardioDesc: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  statusBadge: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },

  // Input section
  inputSection: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  numberInput: {
    flex: 1,
    backgroundColor: colors.surface,
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

  // Time input group
  timeInputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeInput: {
    flex: 1,
    backgroundColor: colors.surface,
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

  // Save button
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    minHeight: touchTarget.large,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  saveButtonDisabled: {
    backgroundColor: colors.surfaceLight,
  },
  saveButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },

  // Completed state
  completedContainer: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  completedResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  completedValue: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  clearText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
});
