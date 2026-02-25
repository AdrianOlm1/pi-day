import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  dailyReminder: 'piday_order_reminder_daily',
  dailyReminderTime: 'piday_order_reminder_daily_time',
  weekAfterCreate: 'piday_order_reminder_week_after',
  onDueDate: 'piday_order_reminder_on_due_date',
  monthlyRecap: 'piday_order_reminder_monthly_recap',
} as const;

export interface OrderReminderSettings {
  dailyReminder: boolean;
  dailyReminderTime: string; // HH:MM
  weekAfterCreate: boolean;
  onDueDate: boolean;
  monthlyRecap: boolean;
}

const DEFAULT: OrderReminderSettings = {
  dailyReminder: false,
  dailyReminderTime: '09:00',
  weekAfterCreate: false,
  onDueDate: false,
  monthlyRecap: false,
};

export function useOrderReminderSettings() {
  const [settings, setSettings] = useState<OrderReminderSettings>(DEFAULT);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [daily, time, week, due, monthly] = await Promise.all([
        AsyncStorage.getItem(KEYS.dailyReminder),
        AsyncStorage.getItem(KEYS.dailyReminderTime),
        AsyncStorage.getItem(KEYS.weekAfterCreate),
        AsyncStorage.getItem(KEYS.onDueDate),
        AsyncStorage.getItem(KEYS.monthlyRecap),
      ]);
      setSettings({
        dailyReminder: daily === 'true',
        dailyReminderTime: time ?? DEFAULT.dailyReminderTime,
        weekAfterCreate: week === 'true',
        onDueDate: due === 'true',
        monthlyRecap: monthly === 'true',
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

  const update = useCallback((patch: Partial<OrderReminderSettings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      AsyncStorage.setItem(KEYS.dailyReminder, String(next.dailyReminder));
      if (patch.dailyReminderTime != null) AsyncStorage.setItem(KEYS.dailyReminderTime, next.dailyReminderTime);
      if (patch.weekAfterCreate != null) AsyncStorage.setItem(KEYS.weekAfterCreate, String(next.weekAfterCreate));
      if (patch.onDueDate != null) AsyncStorage.setItem(KEYS.onDueDate, String(next.onDueDate));
      if (patch.monthlyRecap != null) AsyncStorage.setItem(KEYS.monthlyRecap, String(next.monthlyRecap));
      return next;
    });
  }, []);

  return { settings, loading, update, refresh: load };
}
