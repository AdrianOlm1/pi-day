import { useState, useCallback, useEffect } from 'react';
import { fetchNotes, createNote, updateNote, deleteNote } from '../services/notes';
import { supabase } from '../lib/supabase';
import type { Note } from '../types';

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchNotes();
      setNotes(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    const channel = supabase
      .channel('notes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const addNote = useCallback(async (title: string, body?: string | null) => {
    const created = await createNote({ title, body });
    setNotes((prev) => [created, ...prev]);
    return created;
  }, []);

  const editNote = useCallback(
    async (id: string, updates: { title?: string; body?: string | null }) => {
      const updated = await updateNote(id, updates);
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      return updated;
    },
    [],
  );

  const removeNote = useCallback(async (id: string) => {
    await deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return {
    notes,
    loading,
    error,
    refresh: load,
    addNote,
    editNote,
    removeNote,
  };
}
