import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';

const THEME_STORAGE_KEY = 'cooked-dark-mode';

export const lightPalette = {
  cream: '#FFF8F0',
  paper: '#FFFFFF',
  ink: '#2A2118',
  muted: '#7D6E61',
  line: '#EADCCB',
  herb: '#41644A',
  tomato: '#D85A3A',
  butter: '#F4C95D',
  sage: '#EAF1E8',
  sageLine: '#D4E1D0',
  dangerSurface: '#FFF1ED',
  dangerLine: '#F3C0B5',
  shadow: '#3B2513',
  dot: '#C4A990',
  overlay: 'rgba(42, 33, 24, 0.38)',
  progressTrack: '#E9DCCA',
  checkmark: '#007AFF',
};

export type AppPalette = typeof lightPalette;

export const darkPalette: AppPalette = {
  cream: '#17130F',
  paper: '#211B16',
  ink: '#F7EFE7',
  muted: '#B9AA9D',
  line: '#3A3028',
  herb: '#86B993',
  tomato: '#F08468',
  butter: '#D9AD42',
  sage: '#29382D',
  sageLine: '#3D5543',
  dangerSurface: '#3B211B',
  dangerLine: '#754032',
  shadow: '#000000',
  dot: '#806B59',
  overlay: 'rgba(0, 0, 0, 0.62)',
  progressTrack: '#43372D',
  checkmark: '#5AA7FF',
};

type ThemeContextValue = {
  colors: AppPalette;
  isDark: boolean;
  setDarkMode: (enabled: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    async function loadTheme() {
      try {
        const savedValue = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        setIsDark(savedValue === 'dark');
      } catch {
        setIsDark(false);
      }
    }

    void loadTheme();
  }, []);

  useEffect(() => {
    Appearance.setColorScheme(isDark ? 'dark' : 'light');
  }, [isDark]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: isDark ? darkPalette : lightPalette,
      isDark,
      setDarkMode: (enabled) => {
        setIsDark(enabled);
        void AsyncStorage.setItem(THEME_STORAGE_KEY, enabled ? 'dark' : 'light').catch(() => undefined);
      },
    }),
    [isDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used inside AppThemeProvider.');
  }

  return context;
}

export function useThemeStyles<T>(createStyles: (colors: AppPalette) => T) {
  const { colors } = useAppTheme();

  return useMemo(() => createStyles(colors), [colors, createStyles]);
}
