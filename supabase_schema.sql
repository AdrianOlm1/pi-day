-- Pi Day Database Schema
-- Run this in your Supabase SQL editor (project dashboard → SQL Editor → New query)

-- ─── Extensions ──────────────────────────────────────────────────────────────
-- (uuid-ossp is pre-enabled in Supabase)

-- ─── Profiles ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                TEXT PRIMARY KEY CHECK (id IN ('adrian', 'sarah')),
  name              TEXT NOT NULL,
  color             TEXT NOT NULL DEFAULT '#3B82F6',
  push_token        TEXT,
  notification_time TIME NOT NULL DEFAULT '09:00:00',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed initial profiles
INSERT INTO profiles (id, name, color, notification_time) VALUES
  ('adrian', 'Adrian', '#3B82F6', '09:00:00'),
  ('sarah',  'Sarah',  '#F472B6', '09:00:00')
ON CONFLICT (id) DO NOTHING;

-- ─── Recurrences ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recurrences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type     TEXT NOT NULL CHECK (rule_type IN ('weekly', 'custom')),
  days_of_week  INTEGER[],           -- 0=Sun…6=Sat; used for 'weekly' rules
  num_weeks     INTEGER,             -- null = repeat forever
  custom_dates  DATE[],              -- used for 'custom' rules
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Events ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  type           TEXT NOT NULL DEFAULT 'personal' CHECK (type IN ('work', 'school', 'personal', 'shared')),
  start_at       TIMESTAMPTZ NOT NULL,
  end_at         TIMESTAMPTZ NOT NULL,
  color          TEXT NOT NULL DEFAULT '#3B82F6',
  all_day        BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_id  UUID REFERENCES recurrences(id) ON DELETE SET NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_user_id_idx ON events(user_id);
CREATE INDEX IF NOT EXISTS events_start_at_idx ON events(start_at);

-- ─── Todos ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS todos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner       TEXT NOT NULL CHECK (owner IN ('adrian', 'sarah', 'shared')),
  title       TEXT NOT NULL,
  done        BOOLEAN NOT NULL DEFAULT FALSE,
  due_date    DATE,
  due_time    TIME,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Orders ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name  TEXT NOT NULL,
  description    TEXT NOT NULL,
  design_notes   TEXT,
  total          NUMERIC(10, 2),
  status         TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Complete')),
  due_date       DATE,
  archived       BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Goals ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner            TEXT NOT NULL CHECK (owner IN ('adrian', 'sarah')),
  title            TEXT NOT NULL,
  period_type      TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  reminder_enabled  BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS goals_owner_idx ON goals(owner);

-- ─── updated_at trigger function ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at   BEFORE UPDATE ON events   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER todos_updated_at    BEFORE UPDATE ON todos    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER orders_updated_at   BEFORE UPDATE ON orders   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER goals_updated_at    BEFORE UPDATE ON goals    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Permissive RLS: both phones share the same anon key and see all data.
-- This is intentional for a private couples app.

ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals      ENABLE ROW LEVEL SECURITY;

-- Allow anon key full access (the app does not use Supabase Auth)
CREATE POLICY "anon_all_profiles"    ON profiles    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_events"      ON events      FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_recurrences" ON recurrences FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_todos"       ON todos       FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_orders"      ON orders      FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_goals"       ON goals       FOR ALL TO anon USING (true) WITH CHECK (true);

-- ─── Realtime ────────────────────────────────────────────────────────────────
-- Enable realtime publication for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE recurrences;
ALTER PUBLICATION supabase_realtime ADD TABLE todos;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE goals;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
