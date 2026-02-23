import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  enabled: 'piday_auto_delete_enabled',
  mode: 'piday_auto_delete_mode',
  categoryIds: 'piday_auto_delete_category_ids',
} as const;

export type AutoDeleteMode = 'all' | 'by_category';

export interface AutoDeleteSettings {
  enabled: boolean;
  mode: AutoDeleteMode;
  categoryIds: string[];
}

const DEFAULT: AutoDeleteSettings = {
  enabled: false,
  mode: 'all',
  categoryIds: [],
};

export function useAutoDeleteSettings() {
  const [settings, setSettings] = useState<AutoDeleteSettings>(DEFAULT);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [enabled, mode, categoryIdsJson] = await Promise.all([
        AsyncStorage.getItem(KEYS.enabled),
        AsyncStorage.getItem(KEYS.mode),
        AsyncStorage.getItem(KEYS.categoryIds),
      ]);
      setSettings({
        enabled: enabled === 'true',
        mode: (mode === 'by_category' ? 'by_category' : 'all') as AutoDeleteMode,
        categoryIds: categoryIdsJson ? JSON.parse(categoryIdsJson) : [],
      });
    } catch {
      setSettings(DEFAULT);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setEnabled = useCallback(async (enabled: boolean) => {
    setSettings((s) => ({ ...s, enabled }));
    await AsyncStorage.setItem(KEYS.enabled, String(enabled));
  }, []);

  const setMode = useCallback(async (mode: AutoDeleteMode) => {
    setSettings((s) => ({ ...s, mode }));
    await AsyncStorage.setItem(KEYS.mode, mode);
  }, []);

  const setCategoryIds = useCallback(async (categoryIds: string[]) => {
    setSettings((s) => ({ ...s, categoryIds }));
    await AsyncStorage.setItem(KEYS.categoryIds, JSON.stringify(categoryIds));
  }, []);

  return {
    settings,
    loading,
    setEnabled,
    setMode,
    setCategoryIds,
    refresh: load,
  };
}
