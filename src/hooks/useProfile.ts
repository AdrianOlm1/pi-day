import { useState, useCallback, useEffect } from 'react';
import { fetchProfile, updateNotificationTime, updateNotificationCategoryIds } from '../services/profiles';
import { scheduleDailyTodoReminder } from '../services/notifications';
import type { Profile, UserId } from '../types';

function normalizeProfile(p: Profile | null): Profile | null {
  if (!p) return null;
  return {
    ...p,
    notification_category_ids: p.notification_category_ids ?? [],
  };
}

export function useProfile(userId: UserId) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const p = await fetchProfile(userId);
    setProfile(normalizeProfile(p));
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const setNotificationTime = useCallback(
    async (time: string) => {
      if (!profile) return;
      await updateNotificationTime(userId, time);
      await scheduleDailyTodoReminder(time);
      setProfile({ ...profile, notification_time: time });
    },
    [profile, userId],
  );

  const setNotificationCategoryIds = useCallback(
    async (categoryIds: string[]) => {
      if (!profile) return;
      await updateNotificationCategoryIds(userId, categoryIds);
      setProfile({ ...profile, notification_category_ids: categoryIds });
    },
    [profile, userId],
  );

  return { profile, loading, refresh: load, setNotificationTime, setNotificationCategoryIds };
}
