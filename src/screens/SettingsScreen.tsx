// ==========================================
// Экран «Настройки»
// ==========================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  borderRadius,
  touchTarget,
  getDayTypeColor,
} from '../theme';
import { seedFakeData, clearAllWorkoutData } from '../db';
import { useAppStore } from '../stores/appStore';
import type { RootStackParamList } from '../navigation/types';

type SettingsNavProp = NativeStackNavigationProp<RootStackParamList>;

// ---- Menu item component ----

interface MenuItemProps {
  icon: string;
  label: string;
  sublabel?: string;
  color?: string;
  onPress: () => void;
  loading?: boolean;
  destructive?: boolean;
}

function MenuItem({
  icon,
  label,
  sublabel,
  color,
  onPress,
  loading,
  destructive,
}: MenuItemProps) {
  const iconColor = destructive ? colors.error : color ?? colors.textSecondary;
  const textColor = destructive ? colors.error : colors.text;

  return (
    <TouchableOpacity
      style={menuStyles.container}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={loading}
    >
      <View style={[menuStyles.iconBox, { backgroundColor: iconColor + '20' }]}>
        {loading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <MaterialCommunityIcons
            name={icon as any}
            size={22}
            color={iconColor}
          />
        )}
      </View>
      <View style={menuStyles.textBlock}>
        <Text style={[menuStyles.label, { color: textColor }]}>{label}</Text>
        {sublabel && <Text style={menuStyles.sublabel}>{sublabel}</Text>}
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={22}
        color={colors.textMuted}
      />
    </TouchableOpacity>
  );
}

const menuStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    minHeight: touchTarget.comfortable,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  sublabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
});

// ---- Section component ----

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>{title}</Text>
      <View style={sectionStyles.card}>{children}</View>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  title: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: spacing.xs,
  },
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
});

// ---- Separator ----

function Separator() {
  return (
    <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 66 }} />
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsNavProp>();
  const refreshNextDayInfo = useAppStore((s) => s.refreshNextDayInfo);

  const [isSeedingData, setIsSeedingData] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);

  // ---- Handlers ----

  const handleEditExercises = (dayTypeId: number) => {
    navigation.navigate('ExerciseEditor', { dayTypeId });
  };

  const handleSeedFakeData = () => {
    Alert.alert(
      'Загрузить тестовые данные?',
      'Будет создана история тренировок за 4 месяца. ' +
        'Существующие данные не удаляются — новые добавятся к ним.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Загрузить',
          onPress: async () => {
            setIsSeedingData(true);
            try {
              const count = await seedFakeData();
              await refreshNextDayInfo();
              Alert.alert(
                'Готово',
                `Создано ${count} тренировок с подходами и кардио.`
              );
            } catch (error) {
              console.error('Seed error:', error);
              Alert.alert('Ошибка', 'Не удалось создать тестовые данные.');
            } finally {
              setIsSeedingData(false);
            }
          },
        },
      ]
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Удалить все тренировки?',
      'Все записи тренировок, подходов и кардио будут удалены безвозвратно. ' +
        'Упражнения и настройки сохранятся.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            setIsClearingData(true);
            try {
              await clearAllWorkoutData();
              await refreshNextDayInfo();
              Alert.alert('Готово', 'Все тренировки удалены.');
            } catch (error) {
              console.error('Clear error:', error);
              Alert.alert('Ошибка', 'Не удалось удалить данные.');
            } finally {
              setIsClearingData(false);
            }
          },
        },
      ]
    );
  };

  // ---- Render ----

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Настройки</Text>
      </View>

      <View style={styles.content}>
        {/* Exercise editors */}
        <Section title="Упражнения">
          <MenuItem
            icon="dumbbell"
            label="Присед"
            sublabel="Редактировать упражнения"
            color={getDayTypeColor(1)}
            onPress={() => handleEditExercises(1)}
          />
          <Separator />
          <MenuItem
            icon="dumbbell"
            label="Тяга"
            sublabel="Редактировать упражнения"
            color={getDayTypeColor(2)}
            onPress={() => handleEditExercises(2)}
          />
          <Separator />
          <MenuItem
            icon="dumbbell"
            label="Жим"
            sublabel="Редактировать упражнения"
            color={getDayTypeColor(3)}
            onPress={() => handleEditExercises(3)}
          />
        </Section>

        {/* Dev tools */}
        <Section title="Разработка">
          <MenuItem
            icon="database-plus"
            label="Загрузить тестовые данные"
            sublabel="Создать историю за 4 месяца"
            color={colors.info}
            onPress={handleSeedFakeData}
            loading={isSeedingData}
          />
          <Separator />
          <MenuItem
            icon="delete-forever"
            label="Удалить все тренировки"
            sublabel="Очистить историю и логи"
            onPress={handleClearAllData}
            loading={isClearingData}
            destructive
          />
        </Section>
      </View>
    </SafeAreaView>
  );
}

// ---- Styles ----

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
});
