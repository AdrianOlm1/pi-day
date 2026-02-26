import { supabase } from '../lib/supabase';
import type { Goal, HabitCompletion, UserId, GoalPeriodType } from '../types';

// ─── helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeGoal(row: any): Goal {
  const sub = row.sub_objectives;
  const dueDate = row.due_date;
  const targetEnd = row.target_end_date;
  return {
    ...row,
    emoji:             row.emoji             ?? '',
    stake:             row.stake             ?? null,
    active_days:       row.active_days       ?? null,
    metric_target:     row.metric_target     ?? null,
    metric_unit:       row.metric_unit       ?? null,
    repeating:         row.repeating !== false,
    sub_objectives:    Array.isArray(sub) ? sub : (sub != null ? [].concat(sub) : null),
    due_date:          dueDate != null ? (typeof dueDate === 'string' ? dueDate.slice(0, 10) : dueDate) : null,
    due_time:          row.due_time ?? null,
    target_end_date:   targetEnd != null ? (typeof targetEnd === 'string' ? targetEnd.slice(0, 10) : targetEnd) : null,
    target_description: row.target_description ?? null,
    current_streak:    row.current_streak    ?? 0,
    longest_streak:    row.longest_streak    ?? 0,
    last_checked_in:   row.last_checked_in   ?? null,
  };
}

// ─── period key (exported for metric logging) ───────────────────────────────

/** Get the period key for a date (daily/long_term = YYYY-MM-DD, weekly = Monday, monthly = YYYY-MM-01, yearly = YYYY-01-01). */
export function getPeriodKey(d: Date, period: GoalPeriodType): string {
  if (period === 'daily' || period === 'long_term') return d.toISOString().slice(0, 10);
  if (period === 'weekly') {
    const dow = d.getDay(); // 0=Sun
    const mon = new Date(d);
    mon.setDate(d.getDate() - ((dow + 6) % 7));
    return mon.toISOString().slice(0, 10);
  }
  if (period === 'monthly') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  return `${d.getFullYear()}-01-01`;
}

// ─── streak math (pure, exported for tests) ───────────────────────────────────

const toMidnight = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};

/**
 * Given a sorted-DESCENDING list of YYYY-MM-DD strings (period keys),
 * return the current consecutive streak in `period` units.
 */
export function calcStreak(dates: string[], period: GoalPeriodType): number {
  if (dates.length === 0) return 0;

  const periodKey = (d: Date): string => getPeriodKey(d, period);

  const prevPeriod = (d: Date): Date => {
    const r = new Date(d);
    if (period === 'daily' || period === 'long_term') r.setDate(d.getDate() - 1);
    else if (period === 'weekly') r.setDate(d.getDate() - 7);
    else if (period === 'monthly') r.setMonth(d.getMonth() - 1);
    else r.setFullYear(d.getFullYear() - 1);
    return r;
  };

  const checked = new Set(dates.map((s) => periodKey(toMidnight(s))));

  const today    = new Date(); today.setHours(0,0,0,0);
  const todayKey = periodKey(today);
  const prevKey  = periodKey(prevPeriod(today));

  // Must have checked in this period OR last period (grace window)
  const startKey = checked.has(todayKey) ? todayKey : checked.has(prevKey) ? prevKey : null;
  if (!startKey) return 0;

  let streak = 0;
  let cursor = toMidnight(startKey);

  while (checked.has(periodKey(cursor))) {
    streak++;
    cursor = prevPeriod(cursor);
  }
  return streak;
}

/** Milestone thresholds (streak lengths that deserve celebration) */
export const MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365];

export function nextMilestone(streak: number): number | null {
  return MILESTONES.find((m) => m > streak) ?? null;
}

export function isMilestone(streak: number): boolean {
  return MILESTONES.includes(streak);
}

// ─── habit (goal) CRUD ────────────────────────────────────────────────────────

export async function fetchGoals(owner: UserId): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('owner', owner)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalizeGoal);
}

export async function fetchAllGoals(): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .order('owner', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalizeGoal);
}

export async function createGoal(
  goal: Omit<Goal, 'id' | 'created_at' | 'updated_at' | 'current_streak' | 'longest_streak' | 'last_checked_in'>,
): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .insert({
      owner:              goal.owner,
      title:              goal.title,
      period_type:        goal.period_type,
      reminder_enabled:   goal.reminder_enabled,
      repeating:          goal.repeating !== false,
      emoji:              goal.emoji ?? '',
      stake:              goal.stake ?? null,
      active_days:        goal.active_days ?? null,
      metric_target:      goal.metric_target ?? null,
      metric_unit:        goal.metric_unit ?? null,
      sub_objectives:     goal.sub_objectives ?? null,
      due_date:           goal.due_date ?? null,
      due_time:           goal.due_time ?? null,
      target_end_date:    goal.target_end_date ?? null,
      target_description: goal.target_description ?? null,
      current_streak:     0,
      longest_streak:     0,
    })
    .select()
    .single();
  if (error) throw error;
  return normalizeGoal(data);
}

export async function updateGoal(
  id: string,
  updates: Partial<Omit<Goal, 'id' | 'created_at'>>,
): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return normalizeGoal(data);
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) throw error;
}

// ─── completions ──────────────────────────────────────────────────────────────

/** Fetch the last 400 days of completions (covers ~57 weeks / 13 months for metric goals) */
export async function fetchCompletions(habitIds: string[]): Promise<HabitCompletion[]> {
  if (habitIds.length === 0) return [];
  const since = new Date();
  since.setDate(since.getDate() - 400);
  const sinceStr = since.toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('habit_completions')
    .select('*')
    .in('habit_id', habitIds)
    .gte('date', sinceStr)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ ...r, amount: r.amount != null ? Number(r.amount) : null }));
}

/** Check in for today — idempotent (upsert). Returns true if this was a NEW check-in. */
export async function checkInHabit(
  habitId: string,
  owner: UserId,
  periodType: GoalPeriodType,
  currentLongest: number,
): Promise<{ isNew: boolean; newStreak: number; isMilestoneHit: boolean }> {
  const today = todayStr();

  // Check if already checked in today
  const { data: existing } = await supabase
    .from('habit_completions')
    .select('id')
    .eq('habit_id', habitId)
    .eq('owner', owner)
    .eq('date', today)
    .maybeSingle();

  if (existing) return { isNew: false, newStreak: 0, isMilestoneHit: false };

  // Insert completion
  const { error: insertError } = await supabase
    .from('habit_completions')
    .insert({ habit_id: habitId, owner, date: today });

  if (insertError) throw insertError;

  // Recompute streak from DB
  const { data: rows, error: selectError } = await supabase
    .from('habit_completions')
    .select('date')
    .eq('habit_id', habitId)
    .eq('owner', owner)
    .order('date', { ascending: false });

  if (selectError) throw selectError;

  const dates = (rows ?? []).map((r: any) => r.date as string);
  const newStreak = calcStreak(dates, periodType);
  const newLongest = Math.max(newStreak, currentLongest);

  const { error: updateError } = await supabase
    .from('goals')
    .update({
      current_streak:  newStreak,
      longest_streak:  newLongest,
      last_checked_in: today,
      updated_at:      new Date().toISOString(),
    })
    .eq('id', habitId);

  if (updateError) throw updateError;

  return { isNew: true, newStreak, isMilestoneHit: isMilestone(newStreak) };
}

/** Log progress for a metric goal (add to current period total). Period = day/week/month by goal type. */
export async function logMetricProgress(
  habitId: string,
  owner: UserId,
  amountToAdd: number,
  periodType: GoalPeriodType,
  metricTarget: number,
  currentLongest: number,
): Promise<{ newTotal: number; achieved: boolean; newStreak: number; isMilestoneHit: boolean }> {
  const now = new Date();
  const periodKey = getPeriodKey(now, periodType);

  const { data: existing } = await supabase
    .from('habit_completions')
    .select('id, amount')
    .eq('habit_id', habitId)
    .eq('owner', owner)
    .eq('date', periodKey)
    .maybeSingle();

  const prevAmount = existing?.amount != null ? Number(existing.amount) : 0;
  const newTotal = prevAmount + amountToAdd;

  if (existing) {
    const { error: updateErr } = await supabase
      .from('habit_completions')
      .update({ amount: newTotal })
      .eq('id', existing.id);
    if (updateErr) throw updateErr;
  } else {
    const { error: insertErr } = await supabase
      .from('habit_completions')
      .insert({ habit_id: habitId, owner, date: periodKey, amount: newTotal });
    if (insertErr) throw insertErr;
  }

  // Recompute streak: completed periods = rows where amount >= target
  const since = new Date();
  since.setDate(since.getDate() - 400);
  const sinceStr = since.toISOString().slice(0, 10);
  const { data: rows, error: selectError } = await supabase
    .from('habit_completions')
    .select('date, amount')
    .eq('habit_id', habitId)
    .eq('owner', owner)
    .gte('date', sinceStr)
    .order('date', { ascending: false });

  if (selectError) throw selectError;

  const completedPeriodKeys = (rows ?? [])
    .filter((r: any) => (r.amount != null ? Number(r.amount) : 0) >= metricTarget)
    .map((r: any) => r.date as string);
  const uniqueKeys = [...new Set(completedPeriodKeys)];
  uniqueKeys.sort((a, b) => b.localeCompare(a));
  const newStreak = calcStreak(uniqueKeys, periodType);
  const newLongest = Math.max(newStreak, currentLongest);
  const achieved = newTotal >= metricTarget;

  const goalUpdates: Record<string, unknown> = {
    current_streak: newStreak,
    longest_streak: newLongest,
    updated_at: now.toISOString(),
  };
  if (achieved) goalUpdates.last_checked_in = periodKey;

  const { error: goalErr } = await supabase
    .from('goals')
    .update(goalUpdates)
    .eq('id', habitId);
  if (goalErr) throw goalErr;

  return {
    newTotal,
    achieved,
    newStreak,
    isMilestoneHit: achieved && isMilestone(newStreak),
  };
}

/** Reset current period progress for a metric goal. */
export async function resetMetricPeriod(
  habitId: string,
  owner: UserId,
  periodType: GoalPeriodType,
  metricTarget: number,
  currentLongest: number,
): Promise<void> {
  const periodKey = getPeriodKey(new Date(), periodType);

  await supabase
    .from('habit_completions')
    .delete()
    .eq('habit_id', habitId)
    .eq('owner', owner)
    .eq('date', periodKey);

  const since = new Date();
  since.setDate(since.getDate() - 400);
  const sinceStr = since.toISOString().slice(0, 10);
  const { data: rows, error: selectError } = await supabase
    .from('habit_completions')
    .select('date, amount')
    .eq('habit_id', habitId)
    .eq('owner', owner)
    .gte('date', sinceStr)
    .order('date', { ascending: false });

  if (selectError) throw selectError;

  const completedPeriodKeys = (rows ?? [])
    .filter((r: any) => (r.amount != null ? Number(r.amount) : 0) >= metricTarget)
    .map((r: any) => r.date as string);
  const uniqueKeys = [...new Set(completedPeriodKeys)];
  uniqueKeys.sort((a, b) => b.localeCompare(a));
  const newStreak = calcStreak(uniqueKeys, periodType);
  const lastDate = uniqueKeys[0] ?? null;

  await supabase
    .from('goals')
    .update({
      current_streak: newStreak,
      last_checked_in: lastDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', habitId);
}

/** Undo today's check-in */
export async function uncheckHabit(
  habitId: string,
  owner: UserId,
  periodType: GoalPeriodType,
  currentLongest: number,
): Promise<void> {
  const today = todayStr();
  const { error: deleteError } = await supabase
    .from('habit_completions')
    .delete()
    .eq('habit_id', habitId)
    .eq('owner', owner)
    .eq('date', today);

  if (deleteError) throw deleteError;

  const { data: rows, error: selectError } = await supabase
    .from('habit_completions')
    .select('date')
    .eq('habit_id', habitId)
    .eq('owner', owner)
    .order('date', { ascending: false });

  if (selectError) throw selectError;

  const dates = (rows ?? []).map((r: any) => r.date as string);
  const newStreak = calcStreak(dates, periodType);
  const lastDate  = dates[0] ?? null;

  const { error: updateError } = await supabase
    .from('goals')
    .update({
      current_streak:  newStreak,
      last_checked_in: lastDate,
      updated_at:      new Date().toISOString(),
    })
    .eq('id', habitId);

  if (updateError) throw updateError;
}
