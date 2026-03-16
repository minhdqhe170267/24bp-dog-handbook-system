export const colors = {
  primary: '#1B4332',
  primaryLight: '#2D6A4F',
  accent: '#52B788',
  accentLight: '#95D5B2',
  background: '#F5F5F0',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textLight: '#999999',
  border: '#E0E0E0',
  error: '#D32F2F',
  warning: '#F57C00',
  success: '#388E3C',
  white: '#FFFFFF',
};

export const Colors = {
  light: {
    text: colors.text,
    background: colors.background,
    tint: colors.primary,
    icon: colors.textLight,
    tabIconDefault: colors.textLight,
    tabIconSelected: colors.primary,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: colors.accent,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: colors.accent,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  title: 28,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
};
