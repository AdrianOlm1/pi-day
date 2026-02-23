-- Pi Day — Habit & Streak Tracker Migration
-- Run this entire file in Supabase SQL Editor → New Query
-- Then: Dashboard → Settings → API → "Reload schema cache" (or wait a minute and refresh)

-- 1. Extend goals table with habit/streak columns
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS current_streak  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_checked_in DATE,
  ADD COLUMN IF NOT EXISTS emoji           TEXT    NOT NULL DEFAULT '🎯',
  ADD COLUMN IF NOT EXISTS stake           TEXT;

-- 2. Create habit_completions table in public schema
CREATE TABLE IF NOT EXISTS public.habit_completions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id   UUID        NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  owner      TEXT        NOT NULL CHECK (owner IN ('adrian', 'sarah')),
  date       DATE        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (habit_id, owner, date)
);

CREATE INDEX IF NOT EXISTS habit_completions_habit_idx  ON public.habit_completions(habit_id);
CREATE INDEX IF NOT EXISTS habit_completions_owner_date ON public.habit_completions(owner, date);

-- 3. RLS (drop first so re-run is safe)
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_habit_completions" ON public.habit_completions;
CREATE POLICY "anon_all_habit_completions"
  ON public.habit_completions FOR ALL TO anon USING (true) WITH CHECK (true);

-- 4. Realtime (ignore error if already in publication)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.habit_completions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
