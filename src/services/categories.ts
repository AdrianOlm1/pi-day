import { supabase } from '../lib/supabase';
import type { EventCategory } from '../types';

export async function fetchCategories(): Promise<EventCategory[]> {
  const { data, error } = await supabase
    .from('event_categories')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createCategory(
  category: Omit<EventCategory, 'id' | 'created_at' | 'updated_at'>,
): Promise<EventCategory> {
  const { data, error } = await supabase
    .from('event_categories')
    .insert(category)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(
  id: string,
  updates: Partial<Pick<EventCategory, 'name' | 'icon' | 'color' | 'sort_order'>>,
): Promise<EventCategory> {
  const { data, error } = await supabase
    .from('event_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('event_categories').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('event_categories').update({ sort_order: index }).eq('id', id),
    ),
  );
}
