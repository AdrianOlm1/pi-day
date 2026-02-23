import { supabase } from '../lib/supabase';
import type { Profile, UserId } from '../types';

export async function fetchProfile(userId: UserId): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data;
}

export async function upsertProfile(profile: Profile): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert(profile, { onConflict: 'id' });
  if (error) throw error;
}

export async function updateNotificationTime(
  userId: UserId,
  time: string,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ notification_time: time })
    .eq('id', userId);
  if (error) throw error;
}

export async function updatePushToken(
  userId: UserId,
  token: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', userId);
  if (error) throw error;
}

export async function updateNotificationCategoryIds(
  userId: UserId,
  categoryIds: string[],
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ notification_category_ids: categoryIds })
    .eq('id', userId);
  if (error) throw error;
}
