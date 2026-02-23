-- Add optional due_time to todos (time to be finished by)
ALTER TABLE todos ADD COLUMN IF NOT EXISTS due_time TIME;
