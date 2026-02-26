-- Tasks = daily one-off goals. Add due_date and due_time to goals.
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS due_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS due_time text DEFAULT NULL;

COMMENT ON COLUMN goals.due_date IS 'For one-off daily goals (tasks): the day this task is due. YYYY-MM-DD.';
COMMENT ON COLUMN goals.due_time IS 'Optional time for tasks, e.g. 14:30 (HH:mm).';
