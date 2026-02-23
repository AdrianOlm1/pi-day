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
      setError(e.message ?? 'Failed to load habits');
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

  /** Has `owner` checked into `habitId` today? */
  const isCheckedIn = useCallback(
    (habitId: string, owner: UserId): boolean =>
      completions.some((c) => c.habit_id === habitId && c.owner === owner && c.date === todayStr()),
    [completions],
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
    recentDates,
    partnerId,
  };
}
