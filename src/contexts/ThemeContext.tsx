import React, {
  createContext, useContext, useState, useEffect, useCallback, useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserId } from '@/types';
import {
  AC_THEMES, DEFAULT_THEME_ID,
  type ACTheme, type ACThemeId, type ACThemeColors,
} from '@/constants/acThemes';
import { AC_USER_COLOR_DEFAULTS } from '@/constants/acColors';
import { USER_COLORS, USER_NAMES } from '@/utils/colors';

// ─── Storage keys ────────────────────────────────────────────────────────────
const KEYS = {
  activeTheme:  'piday_active_theme',
  fontScale:    'piday_font_scale',
  colorAdrian:  'piday_color_adrian',
  colorSarah:   'piday_color_sarah',
  nameAdrian:   'piday_name_adrian',
  nameSarah:    'piday_name_sarah',
} as const;

export type FontSizeScale = 'compact' | 'default' | 'large';

const FONT_SCALE_MAP: Record<FontSizeScale, number> = {
  compact: 0.9,
  default: 1.0,
  large:   1.12,
};

// ─── Context interface ────────────────────────────────────────────────────────
interface ThemeContextValue {
  activeTheme:    ACTheme;
  appColors:      ACThemeColors;
  fontSizeScale:  FontSizeScale;
  fontScale:      number;
  getUserColor:   (userId: UserId) => string;
  getUserName:    (userId: UserId) => string;
  setThemeId:       (id: ACThemeId)         => Promise<void>;
  setFontSizeScale: (scale: FontSizeScale)  => Promise<void>;
  setUserColor:     (userId: UserId, hex: string)   => Promise<void>;
  setUserName:      (userId: UserId, name: string)  => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [activeThemeId,   setActiveThemeId]   = useState<ACThemeId>(DEFAULT_THEME_ID);
  const [fontSizeScale,   setFontSizeScaleState] = useState<FontSizeScale>('default');
  const [userColors,      setUserColors]      = useState<Record<UserId, string>>({
    adrian: AC_USER_COLOR_DEFAULTS.adrian,
    sarah:  AC_USER_COLOR_DEFAULTS.sarah,
  });
  const [userNames,       setUserNames]       = useState<Record<UserId, string>>({
    adrian: USER_NAMES.adrian,
    sarah:  USER_NAMES.sarah,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load all preferences in parallel on mount
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(KEYS.activeTheme),
      AsyncStorage.getItem(KEYS.fontScale),
      AsyncStorage.getItem(KEYS.colorAdrian),
      AsyncStorage.getItem(KEYS.colorSarah),
      AsyncStorage.getItem(KEYS.nameAdrian),
      AsyncStorage.getItem(KEYS.nameSarah),
    ]).then(([theme, font, cAdrian, cSarah, nAdrian, nSarah]) => {
      if (theme && AC_THEMES[theme as ACThemeId]) {
        setActiveThemeId(theme as ACThemeId);
      }
      if (font === 'compact' || font === 'default' || font === 'large') {
        setFontSizeScaleState(font);
      }
      setUserColors({
        adrian: cAdrian ?? AC_USER_COLOR_DEFAULTS.adrian,
        sarah:  cSarah  ?? AC_USER_COLOR_DEFAULTS.sarah,
      });
      setUserNames({
        adrian: nAdrian ?? USER_NAMES.adrian,
        sarah:  nSarah  ?? USER_NAMES.sarah,
      });
      setIsLoading(false);
    });
  }, []);

  // Computed
  const activeTheme = useMemo(() => AC_THEMES[activeThemeId], [activeThemeId]);
  const appColors   = useMemo(() => activeTheme.colors,       [activeTheme]);
  const fontScale   = useMemo(() => FONT_SCALE_MAP[fontSizeScale], [fontSizeScale]);

  // Setters
  const setThemeId = useCallback(async (id: ACThemeId) => {
    setActiveThemeId(id);
    await AsyncStorage.setItem(KEYS.activeTheme, id);
  }, []);

  const setFontSizeScale = useCallback(async (scale: FontSizeScale) => {
    setFontSizeScaleState(scale);
    await AsyncStorage.setItem(KEYS.fontScale, scale);
  }, []);

  const setUserColor = useCallback(async (userId: UserId, hex: string) => {
    setUserColors(prev => ({ ...prev, [userId]: hex }));
    await AsyncStorage.setItem(
      userId === 'adrian' ? KEYS.colorAdrian : KEYS.colorSarah,
      hex,
    );
  }, []);

  const setUserName = useCallback(async (userId: UserId, name: string) => {
    setUserNames(prev => ({ ...prev, [userId]: name }));
    await AsyncStorage.setItem(
      userId === 'adrian' ? KEYS.nameAdrian : KEYS.nameSarah,
      name,
    );
  }, []);

  const getUserColor = useCallback((userId: UserId) => userColors[userId], [userColors]);
  const getUserName  = useCallback((userId: UserId) => userNames[userId],  [userNames]);

  return (
    <ThemeContext.Provider value={{
      activeTheme, appColors, fontSizeScale, fontScale,
      getUserColor, getUserName,
      setThemeId, setFontSizeScale, setUserColor, setUserName,
      isLoading,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/** Convenience hook — returns just the reactive color palette */
export function useAppColors(): ACThemeColors {
  return useTheme().appColors;
}
