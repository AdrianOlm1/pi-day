import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  fetchGoals,
  fetchAllGoals,
  fetchCompletions,
  createGoal,
  updateGoal,
  deleteGoal,
  checkInHabit,
  uncheckHabit,
  getPeriodKey,
  logMetricProgress as logMetricProgressService,
  resetMetricPeriod as resetMetricPeriodService,
} from '../services/goals';
import { playHabitComplete, playAllHabitComplete, playHabitUnselect } from '../utils/sounds';
import type { Goal, HabitCompletion, UserId } from '../types';

// ─── useGoals — owns goals + completions for current user ─────────────────────

export function useGoals(userId: UserId) {
  const [goals, setGoals]             = useState<Goal[]>([]);
  const [partnerGoals, setPartnerGoals] = useState<Goal[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const partnerId: UserId = userId === 'adrian' ? 'sarah' : 'adrian';

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);

      const [mine, all] = await Promise.all([fetchGoals(userId), fetchAllGoals()]);
      setGoals(mine);
      setPartnerGoals(all.filter((g) => g.owner === partnerId));

      const allIds = all.map((g) => g.id);
      const comps  = await fetchCompletions(allIds);
      setCompletions(comps);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, [userId, partnerId]);

  useEffect(() => {
    load();

    const ch1 = supabase
      .channel('goals-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, () => load(true))
      .subscribe();

    const ch2 = supabase
      .channel('completions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_completions' }, () => load(true))
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [load]);

  // ── derived helpers ──────────────────────────────────────────────────────────

  const todayStr = () => new Date().toISOString().slice(0, 10);

  /** Current period key (today's date, this week's Monday, or this month's 1st) for a goal's period type. */
  const currentPeriodKey = useCallback((periodType: import('../types').GoalPeriodType) => {
    return getPeriodKey(new Date(), periodType);
  }, []);

  /** For metric goals: total amount logged in the current period. For binary, 0. */
  const currentPeriodAmount = useCallback(
    (habitId: string, owner: UserId, periodType: import('../types').GoalPeriodType): number => {
      const key = getPeriodKey(new Date(), periodType);
      const c = completions.find(
        (x) => x.habit_id === habitId && x.owner === owner && x.date === key,
      );
      return c?.amount != null ? Number(c.amount) : 0;
    },
    [completions],
  );

  /** Has `owner` checked into `habitId` this period? (binary) or achieved period target? (metric) */
  const isCheckedIn = useCallback(
    (habitId: string, owner: UserId, goal?: Goal): boolean => {
      const g = goal ?? goals.find((x) => x.id === habitId);
      if (g?.metric_target != null) {
        const amount = currentPeriodAmount(habitId, owner, g.period_type);
        return amount >= g.metric_target;
      }
      const periodType = g?.period_type ?? 'daily';
      const currentKey = getPeriodKey(new Date(), periodType);
      return completions.some(
        (c) =>
          c.habit_id === habitId &&
          c.owner === owner &&
          getPeriodKey(new Date(c.date + 'T12:00:00'), periodType) === currentKey,
      );
    },
    [completions, goals, currentPeriodAmount],
  );

  /** Last 28 completion dates for a habit+owner (for mini calendar grid) */
  const recentDates = useCallback(
    (habitId: string, owner: UserId): Set<string> => {
      const since = new Date();
      since.setDate(since.getDate() - 27);
      const sinceStr = since.toISOString().slice(0, 10);
      return new Set(
        completions
          .filter((c) => c.habit_id === habitId && c.owner === owner && c.date >= sinceStr)
          .map((c) => c.date),
      );
    },
    [completions],
  );

  /** Number of current user's goals completed this period (for encouragement / celebration) */
  const completedTodayCount = goals.filter((g) => isCheckedIn(g.id, userId, g)).length;

  /** Goals that appear on a given date: daily (repeating or due that day) OR long-term goals whose deadline is on or after that date. */
  const dailyGoalsForDate = useCallback(
    (dateStr: string): Goal[] =>
      goals.filter(
        (g) =>
          g.owner === userId &&
          (g.period_type === 'daily'
            ? (g.repeating !== false || g.due_date === dateStr)
            : g.period_type === 'long_term' && g.target_end_date != null && g.target_end_date >= dateStr),
      ),
    [goals, userId],
  );

  /** Goals to show in calendar day view: daily (repeating or due that day, respect active_days), weekly (for week containing date), long-term (target_end_date on that day). */
  const goalsForCalendarDate = useCallback(
    (dateStr: string): Goal[] => {
      const d = new Date(dateStr + 'T12:00:00');
      const dayOfWeek = d.getDay();
      const weekKey = getPeriodKey(d, 'weekly');
      return goals.filter((g) => {
        if (g.owner !== userId) return false;
        if (g.period_type === 'daily') {
          const applies = g.repeating !== false || g.due_date === dateStr;
          if (!applies) return false;
          if (g.active_days != null && g.active_days.length > 0) {
            return g.active_days.includes(dayOfWeek);
          }
          return true;
        }
        if (g.period_type === 'weekly') return true;
        if (g.period_type === 'long_term') return g.target_end_date === dateStr;
        return false;
      });
    },
    [goals, userId],
  );

  /** Whether the goal was checked in for the period containing the given date (for calendar past/future). */
  const isCheckedInForDate = useCallback(
    (goal: Goal, dateStr: string): boolean => {
      const d = new Date(dateStr + 'T12:00:00');
      const periodKey = getPeriodKey(d, goal.period_type);
      if (goal.metric_target != null) {
        const c = completions.find(
          (x) => x.habit_id === goal.id && x.owner === userId && x.date === periodKey,
        );
        return c != null && (c.amount ?? 0) >= (goal.metric_target ?? 0);
      }
      return completions.some(
        (c) => c.habit_id === goal.id && c.owner === userId && c.date === periodKey,
      );
    },
    [completions, userId],
  );

  // ── mutations ────────────────────────────────────────────────────────────────

  const addGoal = useCallback(
    async (goal: Omit<Goal, 'id' | 'created_at' | 'updated_at' | 'current_streak' | 'longest_streak' | 'last_checked_in'>) => {
      const created = await createGoal(goal);
      await load(true);
      return created;
    },
    [load],
  );

  const update = useCallback(
    async (id: string, updates: Partial<Omit<Goal, 'id' | 'created_at'>>) => {
      await updateGoal(id, updates);
      await load(true);
    },
    [load],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteGoal(id);
      await load(true);
    },
    [load],
  );

  const checkIn = useCallback(
    async (goal: Goal): Promise<{ isNew: boolean; newStreak: number; isMilestoneHit: boolean }> => {
      const today = todayStr();
      const optimisticCompletion: HabitCompletion = {
        id: `opt-${goal.id}-${today}`,
        habit_id: goal.id,
        owner: userId,
        date: today,
        created_at: new Date().toISOString(),
      };
      setCompletions((prev) => [...prev, optimisticCompletion]);
      try {
        const result = await checkInHabit(goal.id, userId, goal.period_type, goal.longest_streak);
        setGoals((prev) =>
          prev.map((g) =>
            g.id === goal.id
              ? {
                  ...g,
                  current_streak: result.newStreak,
                  longest_streak: Math.max(g.longest_streak, result.newStreak),
                  last_checked_in: today,
                }
              : g,
          ),
        );
        const completedTodayNow =
          completions.filter((c) => c.owner === userId && c.date === today).length + 1;
        const allComplete = goals.length > 0 && completedTodayNow >= goals.length;
        if (allComplete) {
          playAllHabitComplete();
        } else {
          playHabitComplete();
        }
        return result;
      } catch (e) {
        setCompletions((prev) =>
          prev.filter((c) => !(c.habit_id === goal.id && c.owner === userId && c.date === today)),
        );
        throw e;
      }
    },
    [userId, completions, goals.length],
  );

  const uncheck = useCallback(
    async (goal: Goal) => {
      const today = todayStr();
      setCompletions((prev) =>
        prev.filter((c) => !(c.habit_id === goal.id && c.owner === userId && c.date === today)),
      );
      try {
        await uncheckHabit(goal.id, userId, goal.period_type, goal.longest_streak);
        playHabitUnselect();
      } catch (e) {
        setCompletions((prev) => [
          ...prev,
          {
            id: `opt-${goal.id}-${today}`,
            habit_id: goal.id,
            owner: userId,
            date: today,
            created_at: new Date().toISOString(),
          },
        ]);
        throw e;
      }
    },
    [userId],
  );

  /** Log amount for a metric goal (adds to current period). Returns when period is achieved. */
  const logMetricProgress = useCallback(
    async (
      goal: Goal,
      amountToAdd: number,
    ): Promise<{ newTotal: number; achieved: boolean; newStreak: number; isMilestoneHit: boolean }> => {
      if (goal.metric_target == null) throw new Error('Goal has no metric target');
      const periodKey = getPeriodKey(new Date(), goal.period_type);
      const prevAmount = currentPeriodAmount(goal.id, userId, goal.period_type);
      setCompletions((prev) => {
        const rest = prev.filter(
          (c) => !(c.habit_id === goal.id && c.owner === userId && c.date === periodKey),
        );
        const newTotal = prevAmount + amountToAdd;
        return [...rest, { id: `opt-${goal.id}-${periodKey}`, habit_id: goal.id, owner: userId, date: periodKey, amount: newTotal, created_at: new Date().toISOString() }];
      });
      try {
        const result = await logMetricProgressService(
          goal.id,
          userId,
          amountToAdd,
          goal.period_type,
          goal.metric_target,
          goal.longest_streak,
        );
        setGoals((prev) =>
          prev.map((g) =>
            g.id === goal.id
              ? {
                  ...g,
                  current_streak: result.newStreak,
                  longest_streak: Math.max(g.longest_streak, result.newStreak),
                  ...(result.achieved ? { last_checked_in: periodKey } : {}),
                }
              : g,
          ),
        );
        if (result.achieved) playHabitComplete();
        await load(true);
        return result;
      } catch (e) {
        setCompletions((prev) =>
          prev.filter(
            (c) => !(c.habit_id === goal.id && c.owner === userId && c.date === periodKey),
          ),
        );
        throw e;
      }
    },
    [userId, load, goals, completions, currentPeriodAmount],
  );

  /** Reset current period progress for a metric goal. */
  const resetMetricPeriod = useCallback(
    async (goal: Goal) => {
      if (goal.metric_target == null) return;
      await resetMetricPeriodService(
        goal.id,
        userId,
        goal.period_type,
        goal.metric_target,
        goal.longest_streak,
      );
      await load(true);
    },
    [userId, load],
  );

  /** Refetch goals/completions. Pass true to refresh in background without showing loading spinner. */
  const refresh = useCallback((silent = false) => load(silent), [load]);

  return {
    goals,
    partnerGoals,
    completions,
    loading,
    error,
    refresh,
    addGoal,
    update,
    remove,
    checkIn,
    uncheck,
    isCheckedIn,
    currentPeriodKey,
    currentPeriodAmount,
    completedTodayCount,
    dailyGoalsForDate,
    goalsForCalendarDate,
    isCheckedInForDate,
    logMetricProgress,
    resetMetricPeriod,
    recentDates,
    partnerId,
  };
}
