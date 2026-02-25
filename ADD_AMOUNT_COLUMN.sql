-- Run this in Supabase Dashboard → SQL Editor if you see:
--   PGRST204: Could not find the 'amount' column of 'habit_completions' in the schema cache
-- Then click "Run" and reload your app.

ALTER TABLE habit_completions
  ADD COLUMN IF NOT EXISTS amount numeric DEFAULT 0;
