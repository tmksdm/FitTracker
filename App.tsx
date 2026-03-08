// ==========================================
// Точка входа приложения
// ==========================================

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { deactivateKeepAwake } from 'expo-keep-awake';
import AppNavigator from './src/navigation/AppNavigator';
import { useAppStore } from './src/stores';
import { colors } from './src/theme';

// Dark navigation theme — prevents white flash on screen transitions
const DarkNavTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
    notification: colors.error,
  },
};

export default function App() {
  const initialize = useAppStore((s) => s.initialize);
  const isInitialized = useAppStore((s) => s.isInitialized);
  const isLoading = useAppStore((s) => s.isLoading);

  useEffect(() => {
  deactivateKeepAwake();
}, []);

  useEffect(() => {
    initialize();
  }, []);

  if (!isInitialized || isLoading) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <StatusBar style="light" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={DarkNavTheme}>
        <AppNavigator />
        <StatusBar style="light" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
