import { supabase } from '../lib/supabase';
import type { CalendarEvent, RecurrenceRule, UserId } from '../types';
import { addMonths, subMonths } from 'date-fns';

// ─── Fetch events + recurrences within a rolling ±3 month window ─────────────

export async function fetchEventsWithRecurrences(): Promise<{
  events: CalendarEvent[];
  rules: RecurrenceRule[];
}> {
  const from = subMonths(new Date(), 2).toISOString();
  const to = addMonths(new Date(), 4).toISOString();

  // Fetch non-recurring events in range
  const { data: events, error: evErr } = await supabase
    .from('events')
    .select('*')
    .or(`start_at.gte.${from},recurrence_id.not.is.null`)
    .order('start_at', { ascending: true });

  if (evErr) throw evErr;

  // Fetch all recurrences
  const { data: rules, error: rErr } = await supabase
    .from('recurrences')
    .select('*');

  if (rErr) throw rErr;

  return { events: events ?? [], rules: rules ?? [] };
}

export async function createEvent(
  event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>,
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('events')
    .insert(event)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createEventWithRecurrence(
  event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at' | 'recurrence_id'>,
  rule: Omit<RecurrenceRule, 'id' | 'created_at'>,
): Promise<CalendarEvent> {
  // Insert recurrence first
  const { data: ruleData, error: rErr } = await supabase
    .from('recurrences')
    .insert(rule)
    .select()
    .single();
  if (rErr) throw rErr;

  // Insert event with recurrence_id
  const { data, error } = await supabase
    .from('events')
    .insert({ ...event, recurrence_id: ruleData.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEvent(
  id: string,
  updates: Partial<Omit<CalendarEvent, 'id' | 'created_at'>>,
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('events')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}

/** Inserts multiple shifts at once (used by AI import confirmation) */
export async function bulkInsertEvents(
  events: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>[],
): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .insert(events)
    .select();
  if (error) throw error;
  return data ?? [];
}

/** Delete all events that ended before the given date (e.g. wipe past events). */
export async function deletePastEvents(olderThan: Date): Promise<number> {
  const before = olderThan.toISOString();
  const { data, error } = await supabase
    .from('events')
    .delete()
    .lt('end_at', before)
    .select('id');
  if (error) throw error;
  return data?.length ?? 0;
}

/** Delete past events that ended before the given date and belong to the given category IDs. */
export async function deletePastEventsByCategory(
  olderThan: Date,
  categoryIds: string[],
): Promise<number> {
  if (categoryIds.length === 0) return 0;
  const before = olderThan.toISOString();
  const { data, error } = await supabase
    .from('events')
    .delete()
    .lt('end_at', before)
    .in('category_id', categoryIds)
    .select('id');
  if (error) throw error;
  return data?.length ?? 0;
}
