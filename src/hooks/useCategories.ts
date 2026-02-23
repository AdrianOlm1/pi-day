import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from '../services/categories';
import type { EventCategory } from '../types';

export function useCategories() {
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await fetchCategories();
      setCategories(list);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel('event_categories-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'event_categories' }, () => load())
        .subscribe();
    } catch {
      // Realtime subscription is optional; app works without it
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [load]);

  const addCategory = useCallback(
    async (category: Omit<EventCategory, 'id' | 'created_at' | 'updated_at'>) => {
      const created = await createCategory(category);
      setCategories((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
      return created;
    },
    [],
  );

  const updateCat = useCallback(async (id: string, updates: Parameters<typeof updateCategory>[1]) => {
    const updated = await updateCategory(id, updates);
    setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  }, []);

  const removeCategory = useCallback(async (id: string) => {
    await deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const reorder = useCallback(async (orderedIds: string[]) => {
    await reorderCategories(orderedIds);
    const byId = new Map(categories.map((c) => [c.id, c]));
    setCategories(orderedIds.map((id) => byId.get(id)!).filter(Boolean));
  }, [categories]);

  const getCategoryById = useCallback(
    (id: string | null): EventCategory | null => {
      if (!id) return null;
      return categories.find((c) => c.id === id) ?? null;
    },
    [categories],
  );

  return {
    categories,
    loading,
    error,
    refresh: load,
    addCategory,
    updateCategory: updateCat,
    deleteCategory: removeCategory,
    reorderCategories: reorder,
    getCategoryById,
  };
}
