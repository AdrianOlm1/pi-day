-- Add active_days to goals (0=Sun … 6=Sat). When null, habit is active every day.
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS active_days integer[] DEFAULT NULL;

COMMENT ON COLUMN goals.active_days IS 'Days of week (0=Sun … 6=Sat) when habit is active; null = every day';
