import { supabase } from '../lib/supabase';
import type { Todo, TodoOwner } from '../types';

export async function fetchTodos(): Promise<Todo[]> {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createTodo(
  todo: Omit<Todo, 'id' | 'created_at' | 'updated_at'>,
): Promise<Todo> {
  const { due_time, ...rest } = todo;
  const payload = { ...rest } as Record<string, unknown>;
  if (due_time != null && due_time !== '') {
    payload.due_time = due_time;
  }
  const { data, error } = await supabase
    .from('todos')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return { ...data, due_time: (data as Todo).due_time ?? null } as Todo;
}

export async function updateTodo(
  id: string,
  updates: Partial<Omit<Todo, 'id' | 'created_at'>>,
): Promise<Todo> {
  const { data, error } = await supabase
    .from('todos')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTodo(id: string): Promise<void> {
  const { error } = await supabase.from('todos').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleTodo(id: string, done: boolean): Promise<Todo> {
  return updateTodo(id, { done });
}
