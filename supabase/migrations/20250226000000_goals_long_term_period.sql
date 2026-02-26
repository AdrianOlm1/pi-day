-- Add 'long_term' to goals.period_type for goals with a specific due date.
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_period_type_check;
ALTER TABLE goals ADD CONSTRAINT goals_period_type_check
  CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly', 'long_term'));

COMMENT ON COLUMN goals.period_type IS 'daily | weekly | monthly | yearly | long_term. long_term = goal with a specific due date (target_end_date).';
