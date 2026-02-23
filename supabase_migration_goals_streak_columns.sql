-- Add missing streak/habit columns to goals (fixes PGRST204 "Could not find 'current_streak'")
-- Run in Supabase Dashboard → SQL Editor → New Query

ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS current_streak   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_checked_in  DATE,
  ADD COLUMN IF NOT EXISTS emoji            TEXT    NOT NULL DEFAULT '🎯',
  ADD COLUMN IF NOT EXISTS stake           TEXT;
