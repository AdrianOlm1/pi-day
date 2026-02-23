export type UserId = 'adrian' | 'sarah';

export type EventType = 'work' | 'school' | 'personal' | 'shared';

/** Customizable event category (stored in event_categories table) */
export interface EventCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type OrderStatus = 'Pending' | 'In Progress' | 'Complete';

export type RecurrenceRuleType = 'weekly' | 'custom';

// ─── Recurrence ──────────────────────────────────────────────────────────────

export interface RecurrenceRule {
  id: string;
  rule_type: RecurrenceRuleType;
  /** For 'weekly': 0=Sun … 6=Sat */
  days_of_week: number[] | null;
  /** For 'weekly': how many weeks to repeat (null = forever) */
  num_weeks: number | null;
  /** For 'custom': explicit ISO date strings */
  custom_dates: string[] | null;
  created_at: string;
}

// ─── Event ───────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  user_id: UserId;
  title: string;
  type: EventType;
  /** References event_categories; preferred over type when present */
  category_id: string | null;
  /** ISO timestamp */
  start_at: string;
  /** ISO timestamp */
  end_at: string;
  /** hex color — inherited from user or overridden */
  color: string;
  all_day: boolean;
  recurrence_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Event with category joined (from select with categories) */
export interface CalendarEventWithCategory extends CalendarEvent {
  category?: EventCategory | null;
}

/** A single occurrence produced by expanding a recurring event */
export interface EventOccurrence extends CalendarEvent {
  /** The actual date this occurrence falls on (YYYY-MM-DD) */
  occurrence_date: string;
  /** Resolved category for display (from categories cache) */
  category?: EventCategory | null;
}

// ─── Todo ────────────────────────────────────────────────────────────────────

export type TodoOwner = 'adrian' | 'sarah' | 'shared';

export interface Todo {
  id: string;
  owner: TodoOwner;
  title: string;
  done: boolean;
  due_date: string | null;
  /** Time to be finished by, e.g. "14:30" (HH:mm) */
  due_time: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ─── Habits (replaces Goals) ──────────────────────────────────────────────────

export type GoalPeriodType = 'daily' | 'weekly' | 'monthly';

/** A habit / streak goal — stored in the `goals` table (extended with streak cols) */
export interface Goal {
  id: string;
  owner: UserId;
  title: string;
  period_type: GoalPeriodType;
  reminder_enabled: boolean;
  /** Display emoji for this habit */
  emoji: string;
  /** Optional accountability stake between partners (e.g. "Loser buys coffee") */
  stake: string | null;
  /** Current streak length in periods */
  current_streak: number;
  /** All-time best streak */
  longest_streak: number;
  /** ISO date string of last successful check-in, or null */
  last_checked_in: string | null;
  created_at: string;
  updated_at: string;
}

/** One daily check-in record for a habit */
export interface HabitCompletion {
  id: string;
  habit_id: string;
  owner: UserId;
  /** YYYY-MM-DD */
  date: string;
  created_at: string;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export interface Order {
  id: string;
  customer_name: string;
  description: string;
  design_notes: string | null;
  total: number | null;
  status: OrderStatus;
  due_date: string | null;
  /** When true, order is hidden from Active and only shown in Archived (searchable). */
  archived?: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export interface Profile {
  id: UserId;
  name: string;
  color: string;
  push_token: string | null;
  /** HH:MM format */
  notification_time: string;
  /** Category IDs for which this user wants event reminders */
  notification_category_ids: string[];
}

// ─── AI Import ───────────────────────────────────────────────────────────────

export type ImportSourceType = 'schedule' | 'flyer';
export type ImportEventType = 'work' | 'personal' | 'school' | 'shared';

export interface ParsedShift {
  date: string;           // YYYY-MM-DD
  start_time: string;     // HH:MM (24h)
  end_time: string;       // HH:MM (24h)
  title: string;
  /** For general event import (flyers, PDFs) */
  event_type?: ImportEventType;
  /** Optional location parsed from flyer */
  location?: string;
  /** Optional notes / description */
  notes?: string;
  /** Whether the event spans all day */
  all_day?: boolean;
}
