-- Goals: daily / weekly / monthly with optional reminders
CREATE TABLE IF NOT EXISTS goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner           TEXT NOT NULL CHECK (owner IN ('adrian', 'sarah')),
  title           TEXT NOT NULL,
  period_type     TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS goals_owner_idx ON goals(owner);

CREATE TRIGGER goals_updated_at BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_goals" ON goals FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE goals;
