-- Track numeric progress per period for metric goals (e.g. miles run this week).
-- For metric goals, one row per period (date = period key); amount accumulates.
--
-- If you get PGRST204 "Could not find the 'amount' column", run this file in
-- Supabase Dashboard → SQL Editor → New query, then paste and run.
ALTER TABLE habit_completions
  ADD COLUMN IF NOT EXISTS amount numeric DEFAULT 0;

COMMENT ON COLUMN habit_completions.amount IS 'Total logged for this period. For metric goals, period is identified by date (day/week start/month start).';
