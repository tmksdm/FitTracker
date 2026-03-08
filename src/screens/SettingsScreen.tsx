// ==========================================
// Экран «Настройки»
// ==========================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,  
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
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
import { exportAsJSON, exportAsCSV, pickAndParseBackup, restoreFromBackup } from '../utils';
import type { ImportPreview } from '../utils';
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

// ---- Import preview modal ----

function ImportPreviewModal({
  visible,
  preview,
  onConfirm,
  onCancel,
  isRestoring,
}: {
  visible: boolean;
  preview: ImportPreview | null;
  onConfirm: () => void;
  onCancel: () => void;
  isRestoring: boolean;
}) {
  if (!preview) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <Text style={modalStyles.title}>Восстановление из бэкапа</Text>
          <Text style={modalStyles.subtitle}>
            Все текущие данные будут заменены данными из файла.
          </Text>

          <View style={modalStyles.statsBlock}>
            <View style={modalStyles.statRow}>
              <Text style={modalStyles.statLabel}>Дата бэкапа</Text>
              <Text style={modalStyles.statValue}>
                {formatExportDate(preview.exportedAt)}
              </Text>
            </View>
            <View style={modalStyles.statRow}>
              <Text style={modalStyles.statLabel}>Тренировок</Text>
              <Text style={modalStyles.statValue}>{preview.sessionCount}</Text>
            </View>
            <View style={modalStyles.statRow}>
              <Text style={modalStyles.statLabel}>Упражнений</Text>
              <Text style={modalStyles.statValue}>{preview.exerciseCount}</Text>
            </View>
            <View style={modalStyles.statRow}>
              <Text style={modalStyles.statLabel}>Записей подходов</Text>
              <Text style={modalStyles.statValue}>{preview.logCount}</Text>
            </View>
            <View style={modalStyles.statRow}>
              <Text style={modalStyles.statLabel}>Записей кардио</Text>
              <Text style={modalStyles.statValue}>{preview.cardioCount}</Text>
            </View>
            <View style={modalStyles.statRow}>
              <Text style={modalStyles.statLabel}>Период</Text>
              <Text style={modalStyles.statValue}>{preview.dateRange}</Text>
            </View>
          </View>

          <View style={modalStyles.buttonRow}>
            <TouchableOpacity
              style={modalStyles.cancelButton}
              onPress={onCancel}
              disabled={isRestoring}
              activeOpacity={0.7}
            >
              <Text style={modalStyles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                modalStyles.confirmButton,
                isRestoring && { opacity: 0.6 },
              ]}
              onPress={onConfirm}
              disabled={isRestoring}
              activeOpacity={0.7}
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <Text style={modalStyles.confirmButtonText}>Восстановить</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function formatExportDate(iso: string): string {
  if (iso === 'неизвестно') return iso;
  try {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } catch {
    return iso;
  }
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.warning,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  statsBlock: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: 0,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  statValue: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    height: touchTarget.comfortable,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    height: touchTarget.comfortable,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsNavProp>();
  const refreshNextDayInfo = useAppStore((s) => s.refreshNextDayInfo);

  const [isSeedingData, setIsSeedingData] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [isExportingJSON, setIsExportingJSON] = useState(false);
  const [isExportingCSV, setIsExportingCSV] = useState(false);

  // Import state
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isPickingFile, setIsPickingFile] = useState(false);

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

  const handleExportJSON = async () => {
    setIsExportingJSON(true);
    try {
      await exportAsJSON();
    } catch (error) {
      console.error('Export JSON error:', error);
      Alert.alert('Ошибка', 'Не удалось экспортировать данные в JSON.');
    } finally {
      setIsExportingJSON(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExportingCSV(true);
    try {
      await exportAsCSV();
    } catch (error) {
      console.error('Export CSV error:', error);
      Alert.alert('Ошибка', 'Не удалось экспортировать данные в CSV.');
    } finally {
      setIsExportingCSV(false);
    }
  };

  const handleImportJSON = async () => {
    setIsPickingFile(true);
    try {
      const preview = await pickAndParseBackup();
      if (preview) {
        setImportPreview(preview);
        setShowImportModal(true);
      }
      // null = user cancelled picker, do nothing
    } catch (error: any) {
      console.error('Import parse error:', error);
      Alert.alert(
        'Ошибка чтения файла',
        error?.message ?? 'Не удалось прочитать файл.'
      );
    } finally {
      setIsPickingFile(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!importPreview) return;

    setIsRestoring(true);
    try {
      await restoreFromBackup(importPreview.raw);
      await refreshNextDayInfo();
      setShowImportModal(false);
      setImportPreview(null);
      Alert.alert(
        'Готово',
        `Восстановлено ${importPreview.sessionCount} тренировок.`
      );
    } catch (error: any) {
      console.error('Restore error:', error);
      Alert.alert(
        'Ошибка восстановления',
        error?.message ?? 'Не удалось восстановить данные из бэкапа.'
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCancelImport = () => {
    if (isRestoring) return; // don't close while restoring
    setShowImportModal(false);
    setImportPreview(null);
  };

  // ---- Render ----

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Настройки</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
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

        {/* Data export & import */}
        <Section title="Данные">
          <MenuItem
            icon="code-json"
            label="Экспорт JSON"
            sublabel="Полный бэкап всех данных"
            color={colors.success}
            onPress={handleExportJSON}
            loading={isExportingJSON}
          />
          <Separator />
          <MenuItem
            icon="file-delimited"
            label="Экспорт CSV"
            sublabel="3 файла по типам дней (для Excel)"
            color={colors.success}
            onPress={handleExportCSV}
            loading={isExportingCSV}
          />
          <Separator />
          <MenuItem
            icon="database-import"
            label="Импорт JSON"
            sublabel="Восстановить из бэкапа"
            color={colors.info}
            onPress={handleImportJSON}
            loading={isPickingFile}
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
      </ScrollView>

      {/* Import preview modal */}
      <ImportPreviewModal
        visible={showImportModal}
        preview={importPreview}
        onConfirm={handleConfirmRestore}
        onCancel={handleCancelImport}
        isRestoring={isRestoring}
      />
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
  },
  contentInner: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.xl,
  },
});
