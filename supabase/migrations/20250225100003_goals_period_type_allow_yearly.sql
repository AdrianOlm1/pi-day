-- Allow 'yearly' in goals.period_type (app uses daily/weekly/monthly/yearly).
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_period_type_check;
ALTER TABLE goals ADD CONSTRAINT goals_period_type_check
  CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly'));
