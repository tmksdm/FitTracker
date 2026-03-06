// ==========================================
// Тёмная тема и общие стили
// ==========================================

export const colors = {
  // Backgrounds
  background: '#121212',
  surface: '#1E1E1E',
  surfaceLight: '#2A2A2A',
  card: '#252525',

  // Primary (accent)
  primary: '#4CAF50',        // green — main action color
  primaryDark: '#388E3C',
  primaryLight: '#81C784',

  // Secondary
  secondary: '#FF9800',      // orange — for warnings/priority
  secondaryDark: '#F57C00',

  // Status colors
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',

  // Text
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textMuted: '#707070',
  textOnPrimary: '#FFFFFF',

  // Borders
  border: '#333333',
  borderLight: '#444444',

  // Exercise statuses
  statusNotStarted: '#555555',
  statusInProgress: '#FF9800',
  statusCompleted: '#4CAF50',
  statusSkipped: '#F44336',

  // Day type colors
  dayLegs: '#E91E63',       // pink
  dayBack: '#2196F3',       // blue
  dayBench: '#9C27B0',      // purple

  // Misc
  ripple: 'rgba(255,255,255,0.1)',
  overlay: 'rgba(0,0,0,0.6)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  huge: 36,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 999,
} as const;

// Large touch target — minimum 48dp per Material Design guidelines,
// we go bigger for gym conditions
export const touchTarget = {
  min: 48,
  comfortable: 56,
  large: 64,
} as const;

// Helper to get day type color
export function getDayTypeColor(dayTypeId: number): string {
  switch (dayTypeId) {
    case 1: return colors.dayLegs;
    case 2: return colors.dayBack;
    case 3: return colors.dayBench;
    default: return colors.primary;
  }
}

// Helper to get status color
export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return colors.statusCompleted;
    case 'in_progress': return colors.statusInProgress;
    case 'skipped': return colors.statusSkipped;
    default: return colors.statusNotStarted;
  }
}
