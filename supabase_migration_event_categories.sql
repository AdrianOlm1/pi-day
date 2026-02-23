-- Event categories (customizable) and per-category notification preferences
-- Run in Supabase SQL Editor after the main schema.

-- ─── Event categories ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  icon       TEXT NOT NULL DEFAULT 'folder-outline',
  color      TEXT NOT NULL DEFAULT '#6366F1',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER event_categories_updated_at
  BEFORE UPDATE ON event_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed default categories (match previous event types) only if table is empty
INSERT INTO event_categories (name, icon, color, sort_order)
SELECT * FROM (VALUES
  ('Work',     'briefcase-outline',  '#F59E0B', 0),
  ('School',   'school-outline',     '#10B981', 1),
  ('Personal', 'person-outline',     '#6366F1', 2),
  ('Shared',   'people-outline',     '#8B5CF6', 3)
) AS v(name, icon, color, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM event_categories LIMIT 1);

-- If you need stable UUIDs for seed data, run a separate seed with fixed UUIDs and reference in backfill.
-- Here we backfill by name: get category ids by name and set events.category_id.
DO $$
DECLARE
  cat_work     UUID; cat_school UUID; cat_personal UUID; cat_shared UUID;
BEGIN
  SELECT id INTO cat_work     FROM event_categories WHERE name = 'Work'     LIMIT 1;
  SELECT id INTO cat_school   FROM event_categories WHERE name = 'School'   LIMIT 1;
  SELECT id INTO cat_personal FROM event_categories WHERE name = 'Personal' LIMIT 1;
  SELECT id INTO cat_shared   FROM event_categories WHERE name = 'Shared'   LIMIT 1;

  ALTER TABLE events ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES event_categories(id) ON DELETE SET NULL;

  UPDATE events SET category_id = cat_work     WHERE type = 'work'     AND category_id IS NULL;
  UPDATE events SET category_id = cat_school   WHERE type = 'school'   AND category_id IS NULL;
  UPDATE events SET category_id = cat_personal WHERE type = 'personal' AND category_id IS NULL;
  UPDATE events SET category_id = cat_shared   WHERE type = 'shared'   AND category_id IS NULL;
  -- Default any remaining to Personal
  UPDATE events SET category_id = cat_personal WHERE category_id IS NULL;
END $$;

-- Make category_id the primary reference (keep type for legacy display if needed)
-- ALTER TABLE events ALTER COLUMN category_id SET NOT NULL;  -- uncomment once all rows backfilled

-- ─── Profile: which categories to notify for ─────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_category_ids UUID[] NOT NULL DEFAULT '{}';

-- RLS and Realtime
ALTER TABLE event_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_event_categories" ON event_categories FOR ALL TO anon USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE event_categories;
