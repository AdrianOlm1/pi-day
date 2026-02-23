import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addDays,
  addWeeks,
  isWithinInterval,
  getDay,
} from 'date-fns';
import type { CalendarEvent, EventOccurrence, RecurrenceRule } from '../types';

// ─── Formatting ──────────────────────────────────────────────────────────────

export const formatDate = (date: Date | string, fmt = 'yyyy-MM-dd') =>
  format(typeof date === 'string' ? parseISO(date) : date, fmt);

/**
 * Normalizes a shift date (from AI or MM-DD/YYYY-MM-DD) to the correct calendar year:
 * - Current year by default.
 * - If we're in December, use next year (schedule is for upcoming year).
 * Use for schedule import so dates don't end up in the wrong year (e.g. 2023).
 */
export function normalizeShiftDate(dateStr: string): string {
  const parts = dateStr.trim().split('-').map((p) => parseInt(p, 10));
  let month: number;
  let day: number;
  if (parts.length >= 3 && !Number.isNaN(parts[1]) && !Number.isNaN(parts[2])) {
    [, month, day] = parts;
  } else if (parts.length >= 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
    month = parts[0];
    day = parts[1];
  } else {
    const fallback = new Date();
    month = fallback.getMonth() + 1;
    day = fallback.getDate();
  }
  const now = new Date();
  const currentYear = now.getFullYear();
  const year = now.getMonth() === 11 ? currentYear + 1 : currentYear;
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

export const formatTime = (iso: string) =>
  format(parseISO(iso), 'h:mm a');

export const formatTimeRange = (startIso: string, endIso: string) =>
  `${formatTime(startIso)} – ${formatTime(endIso)}`;

export const formatDisplayDate = (date: Date) =>
  format(date, 'EEEE, MMMM d');

export const formatMonthYear = (date: Date) =>
  format(date, 'MMMM yyyy');

export const today = () => new Date();

/** Returns YYYY-MM-DD for the *local* calendar day of the given ISO timestamp. Use this for grouping events by day so timezone doesn't shift events to the wrong date. */
export const toDateOnly = (iso: string) => format(parseISO(iso), 'yyyy-MM-dd');

// ─── Calendar grid ───────────────────────────────────────────────────────────

/** Returns all days in the 6-week grid that contains the given month. */
export function getMonthGrid(date: Date): Date[] {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
}

/** Returns the 7 days of the week containing the given date. */
export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 0 });
  const end = endOfWeek(date, { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
}

export { isSameDay, isSameMonth };

// ─── Recurrence expansion ────────────────────────────────────────────────────

/**
 * Expands a recurring event into occurrences within [rangeStart, rangeEnd].
 * Non-recurring events are returned as-is (single occurrence).
 */
export function expandRecurringEvent(
  event: CalendarEvent,
  rule: RecurrenceRule | null,
  rangeStart: Date,
  rangeEnd: Date,
): EventOccurrence[] {
  if (!rule) {
    const d = parseISO(event.start_at);
    if (isWithinInterval(d, { start: rangeStart, end: rangeEnd })) {
      return [{ ...event, occurrence_date: toDateOnly(event.start_at) }];
    }
    return [];
  }

  const occurrences: EventOccurrence[] = [];
  const eventStart = parseISO(event.start_at);
  const eventEnd = parseISO(event.end_at);
  const durationMs = eventEnd.getTime() - eventStart.getTime();

  if (rule.rule_type === 'weekly' && rule.days_of_week) {
    const maxWeeks = rule.num_weeks ?? 260; // ~5 years default
    for (let w = 0; w < maxWeeks; w++) {
      for (const dow of rule.days_of_week) {
        const weekStart = startOfWeek(addWeeks(eventStart, w), { weekStartsOn: 0 });
        const occDate = addDays(weekStart, dow);
        if (occDate < rangeStart) continue;
        if (occDate > rangeEnd) return occurrences;
        const occStart = new Date(occDate);
        occStart.setHours(eventStart.getHours(), eventStart.getMinutes(), 0, 0);
        const occEnd = new Date(occStart.getTime() + durationMs);
        occurrences.push({
          ...event,
          start_at: occStart.toISOString(),
          end_at: occEnd.toISOString(),
          occurrence_date: formatDate(occDate),
        });
      }
    }
  } else if (rule.rule_type === 'custom' && rule.custom_dates) {
    for (const dateStr of rule.custom_dates) {
      const occDate = parseISO(dateStr);
      if (!isWithinInterval(occDate, { start: rangeStart, end: rangeEnd })) continue;
      const occStart = new Date(occDate);
      occStart.setHours(eventStart.getHours(), eventStart.getMinutes(), 0, 0);
      const occEnd = new Date(occStart.getTime() + durationMs);
      occurrences.push({
        ...event,
        start_at: occStart.toISOString(),
        end_at: occEnd.toISOString(),
        occurrence_date: dateStr,
      });
    }
  }

  return occurrences;
}

/** Groups occurrences by their occurrence_date (YYYY-MM-DD) key */
export function groupByDate(occurrences: EventOccurrence[]): Record<string, EventOccurrence[]> {
  return occurrences.reduce<Record<string, EventOccurrence[]>>((acc, occ) => {
    const key = occ.occurrence_date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(occ);
    return acc;
  }, {});
}
