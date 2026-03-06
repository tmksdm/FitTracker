// ==========================================
// Основной навигатор приложения
// ==========================================

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { colors, fontSize } from '../theme';
import type { RootStackParamList, MainTabParamList } from './types';

// ---- Placeholder screens (will be replaced with real ones) ----

function PlaceholderScreen({ name }: { name: string }) {
  return (
    <View style={placeholderStyles.container}>
      <Text style={placeholderStyles.text}>{name}</Text>
      <Text style={placeholderStyles.subtext}>Скоро будет реализовано</Text>
    </View>
  );
}

const placeholderStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '600',
  },
  subtext: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    marginTop: 8,
  },
});

// Placeholder screen components
function HomeScreen() {
  return <PlaceholderScreen name="Главная" />;
}
function HistoryScreen() {
  return <PlaceholderScreen name="История" />;
}
function AnalyticsScreen() {
  return <PlaceholderScreen name="Аналитика" />;
}
function SettingsScreen() {
  return <PlaceholderScreen name="Настройки" />;
}
function ActiveWorkoutScreen() {
  return <PlaceholderScreen name="Тренировка" />;
}
function WorkoutSummaryScreen() {
  return <PlaceholderScreen name="Итоги тренировки" />;
}
function ExerciseEditorScreen() {
  return <PlaceholderScreen name="Редактор упражнений" />;
}

// ---- Tab icons (simple text-based until we add icon library) ----

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontSize: 20,
        color: focused ? colors.primary : colors.textMuted,
      }}
    >
      {label}
    </Text>
  );
}

// ---- Navigators ----

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingTop: 4,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Главная',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="🏠" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'История',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="📋" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          tabBarLabel: 'Статистика',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="📊" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Настройки',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="⚙️" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="ActiveWorkout"
        component={ActiveWorkoutScreen}
        options={{
          animation: 'slide_from_bottom',
          gestureEnabled: false, // prevent accidental swipe-back during workout
        }}
      />
      <Stack.Screen
        name="WorkoutSummary"
        component={WorkoutSummaryScreen}
        options={{
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name="ExerciseEditor"
        component={ExerciseEditorScreen}
      />
    </Stack.Navigator>
  );
}
