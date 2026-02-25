-- Add metric tracking columns to goals table
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS metric_target numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS metric_unit   text    DEFAULT NULL;
