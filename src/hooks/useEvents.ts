import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  fetchEventsWithRecurrences,
  createEvent,
  createEventWithRecurrence,
  updateEvent,
  deleteEvent,
  bulkInsertEvents,
} from '../services/events';
import { expandRecurringEvent, groupByDate } from '../utils/date';
import { subMonths, addMonths } from 'date-fns';
import type { CalendarEvent, RecurrenceRule, EventOccurrence } from '../types';

export function useEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [rules, setRules] = useState<RecurrenceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { events: evs, rules: rls } = await fetchEventsWithRecurrences();
      setEvents(evs);
      setRules(rls);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    // Realtime subscription
    const channel = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => load(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recurrences' },
        () => load(),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  /** Returns all occurrences within the given date range, grouped by YYYY-MM-DD */
  const getOccurrencesByRange = useCallback(
    (start: Date, end: Date): Record<string, EventOccurrence[]> => {
      const rulesMap = new Map(rules.map((r) => [r.id, r]));
      const all: EventOccurrence[] = [];
      for (const event of events) {
        const rule = event.recurrence_id ? (rulesMap.get(event.recurrence_id) ?? null) : null;
        const occs = expandRecurringEvent(event, rule, start, end);
        all.push(...occs);
      }
      // Sort by start_at
      all.sort((a, b) => a.start_at.localeCompare(b.start_at));
      return groupByDate(all);
    },
    [events, rules],
  );

  return {
    events,
    rules,
    loading,
    error,
    refresh: load,
    getOccurrencesByRange,
    createEvent,
    createEventWithRecurrence,
    updateEvent,
    deleteEvent,
    bulkInsertEvents,
  };
}
