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

/** A habit / streak goal — stored in the `goals` table (extended with streak + scheduling + metric cols) */
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
  /**
   * Optional active days for daily habits (0=Sun … 6=Sat).
   * When null, treated as active every day.
   */
  active_days?: number[] | null;
  /**
   * Optional numeric target per period (e.g. 10 miles, 8 glasses).
   * When null, the habit is binary (done / not done).
   */
  metric_target?: number | null;
  /** Optional display unit for metric habits, e.g. "miles", "pages". */
  metric_unit?: string | null;
  /** Current streak length in periods */
  current_streak: number;
  /** All-time best streak */
  longest_streak: number;
  /** ISO date string of last successful check-in, or null */
  last_checked_in: string | null;
  created_at: string;
  updated_at: string;
}

/** One check-in record for a habit (one per day for binary; one per period for metric) */
export interface HabitCompletion {
  id: string;
  habit_id: string;
  owner: UserId;
  /** YYYY-MM-DD — for daily = that day; for weekly = Monday; for monthly = YYYY-MM-01 */
  date: string;
  /** For metric goals: total logged this period. Null/0 for binary. */
  amount?: number | null;
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

// ─── Finance ─────────────────────────────────────────────────────────────────

export type FinanceAccountType = 'checking' | 'savings' | 'credit' | 'cash' | 'investment';
export type FinanceTxnType     = 'income' | 'expense' | 'transfer';
export type FinanceCatType     = 'expense' | 'income' | 'transfer';
export type BillFrequency          = 'monthly' | 'yearly' | 'weekly' | 'quarterly';
export type FinanceRecurrenceRule  = 'monthly' | 'weekly' | 'yearly';

export interface FinanceAccount {
  id:          string;
  owner:       UserId;
  name:        string;
  type:        FinanceAccountType;
  balance:     number;
  currency:    string;
  color:       string;
  icon:        string;
  is_archived: boolean;
  created_at:  string;
  updated_at:  string;
}

export interface FinanceCategory {
  id:          string;
  owner:       UserId;
  name:        string;
  icon:        string;
  color:       string;
  type:        FinanceCatType;
  budget_goal: number | null;
  rollover:    boolean;
  goal_id:     string | null;
  sort_order:  number;
  created_at:  string;
  updated_at:  string;
}

export interface FinanceBudget {
  id:            string;
  owner:         UserId;
  category_id:   string;
  month:         string;  // YYYY-MM-DD (first of month)
  allocated:     number;
  rollover_from: number;
  created_at:    string;
  updated_at:    string;
  /** Joined */
  category?:     FinanceCategory;
}

export interface FinanceTransaction {
  id:                  string;
  owner:               UserId;
  account_id:          string;
  category_id:         string | null;
  title:               string;
  payee:               string | null;
  amount:              number;           // positive=income, negative=expense
  type:                FinanceTxnType;
  date:                string;           // YYYY-MM-DD
  notes:               string | null;
  is_recurring:        boolean;
  recurrence_rule:     FinanceRecurrenceRule | null;
  recurrence_day:      number | null;
  parent_id:           string | null;    // for split transactions
  transfer_account_id: string | null;
  receipt_url:         string | null;
  cleared:             boolean;
  created_at:          string;
  updated_at:          string;
  /** Joined */
  category?:           FinanceCategory;
  account?:            FinanceAccount;
}

export interface FinanceBill {
  id:          string;
  owner:       UserId;
  account_id:  string | null;
  category_id: string | null;
  name:        string;
  amount:      number;
  due_day:     number;
  frequency:   BillFrequency;
  next_due:    string;  // YYYY-MM-DD
  auto_pay:    boolean;
  is_active:   boolean;
  color:       string;
  icon:        string;
  created_at:  string;
  updated_at:  string;
}

/** Computed totals for a budget month */
export interface BudgetSummary {
  category_id: string;
  category:    FinanceCategory;
  allocated:   number;
  spent:       number;
  remaining:   number;
  rollover:    number;
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
