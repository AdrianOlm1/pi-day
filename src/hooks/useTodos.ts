import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { fetchTodos, createTodo, updateTodo, deleteTodo, toggleTodo } from '../services/todos';
import type { Todo, TodoOwner } from '../types';

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTodos();
      setTodos(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load todos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    const channel = supabase
      .channel('todos-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos' },
        () => load(),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const addTodo = useCallback(
    async (owner: TodoOwner, title: string, due_date?: string | null, due_time?: string | null) => {
      const maxOrder = todos.length === 0 ? 0 : Math.max(...todos.map((t) => t.sort_order), 0);
      const created = await createTodo({
        owner,
        title,
        done: false,
        due_date: due_date ?? null,
        due_time: due_time ?? null,
        sort_order: maxOrder + 1,
      });
      setTodos((prev) => [...prev, created]);
      return created;
    },
    [todos, load],
  );

  const toggle = useCallback(async (id: string, done: boolean) => {
    await toggleTodo(id, done);
    await load();
  }, [load]);

  const remove = useCallback(async (id: string) => {
    await deleteTodo(id);
    await load();
  }, [load]);

  const reorder = useCallback(
    async (orderedTodos: Todo[]) => {
      if (orderedTodos.length === 0) return;
      const sortedOrders = [...orderedTodos]
        .map((t) => t.sort_order)
        .sort((a, b) => a - b);
      await Promise.all(
        orderedTodos.map((todo, i) =>
          updateTodo(todo.id, { sort_order: sortedOrders[i] }),
        ),
      );
      await load();
    },
    [load],
  );

  const todosByOwner = (owner: TodoOwner) => todos.filter((t) => t.owner === owner);

  return {
    todos,
    loading,
    error,
    refresh: load,
    addTodo,
    toggle,
    remove,
    reorder,
    todosByOwner,
  };
}
