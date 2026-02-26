-- Goals can have an end date or a "big goal" in mind (e.g. marathon by end of year, apply until I get a job).
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS target_end_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_description text DEFAULT NULL;

COMMENT ON COLUMN goals.target_end_date IS 'Optional end date for this goal (e.g. run marathon by Dec 31).';
COMMENT ON COLUMN goals.target_description IS 'Optional big goal in mind (e.g. "run a marathon", "get a job") for AI to suggest sub-goals.';
