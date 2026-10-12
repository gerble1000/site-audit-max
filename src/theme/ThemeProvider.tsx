import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme as useSystemScheme } from 'react-native';
import {
  darkColors,
  lightColors,
  palette,
  statusColorsDark,
  statusColorsLight,
  type AppColors,
  type StatusColor,
  type StatusKey,
} from './tokens';
import { useAppStore } from '../store/useAppStore';

export type ThemeColors = AppColors & {
  isDark: boolean;
  status: Record<StatusKey, StatusColor>;
};

const ThemeCtx = createContext<ThemeColors>({
  ...lightColors,
  isDark: false,
  status: statusColorsLight,
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useSystemScheme();
  const appearance = useAppStore((s) => s.settings?.appearance ?? 'dark');
  const highContrast = useAppStore((s) => !!s.settings?.highContrast);
  const colors = useMemo((): ThemeColors => {
    const mode =
      appearance === 'system' ? system : appearance === 'dark' ? 'dark' : 'light';
    const isDark = mode === 'dark';
    const base = isDark ? darkColors : lightColors;
    const status = isDark ? statusColorsDark : statusColorsLight;
    if (!highContrast) return { ...base, isDark, status };
    return {
      ...base,
      isDark,
      status,
      text: isDark ? '#FFFFFF' : '#000000',
      textMuted: isDark ? '#E5E7EB' : '#1F2937',
      background: isDark ? '#000000' : '#FFFFFF',
      border: isDark ? '#F9FAFB' : '#111827',
      accent: palette.brandGreen,
    };
  }, [appearance, system, highContrast]);

  return <ThemeCtx.Provider value={colors}>{children}</ThemeCtx.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeCtx);
}
