import { create } from 'zustand';

export const lightColors = {
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

export const darkColors = {
    primary: '#52B788',
    primaryLight: '#2D6A4F',
    accent: '#52B788',
    accentLight: '#1B4332',
    background: '#121212',
    surface: '#1E1E1E',
    text: '#E8E8E8',
    textSecondary: '#AAAAAA',
    textLight: '#777777',
    border: '#333333',
    error: '#EF5350',
    warning: '#FFA726',
    success: '#66BB6A',
    white: '#FFFFFF',
};

export type ThemeColors = typeof lightColors;

interface ThemeState {
    isDark: boolean;
    colors: ThemeColors;
    toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
    isDark: false,
    colors: lightColors,
    toggleTheme: () =>
        set((state) => ({
            isDark: !state.isDark,
            colors: state.isDark ? lightColors : darkColors,
        })),
}));
