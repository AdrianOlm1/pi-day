-- Add yearly/repeating/sub_objectives support for unified habits & goals
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS repeating boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS sub_objectives jsonb DEFAULT NULL;

COMMENT ON COLUMN goals.repeating IS 'When true, goal repeats each period (habit). When false, one-off target.';
COMMENT ON COLUMN goals.sub_objectives IS 'Optional array of smaller steps (from AI split) to complete this goal.';
