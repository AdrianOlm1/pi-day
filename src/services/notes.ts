import { supabase } from '../lib/supabase';
import type { Note } from '../types';

export async function fetchNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Note[];
}

export async function createNote(note: { title: string; body?: string | null }): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .insert({ title: note.title, body: note.body ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as Note;
}

export async function updateNote(
  id: string,
  updates: { title?: string; body?: string | null },
): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Note;
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw error;
}
