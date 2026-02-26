-- Notes: simple title + body, newest first. App uses anon (no auth).
CREATE TABLE IF NOT EXISTS public.notes (
  id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text         NOT NULL DEFAULT '',
  body       text         DEFAULT NULL,
  created_at timestamptz  NOT NULL DEFAULT now(),
  updated_at timestamptz  NOT NULL DEFAULT now()
);

-- Keep updated_at in sync
CREATE OR REPLACE FUNCTION public.notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notes_updated_at ON public.notes;
CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE PROCEDURE public.notes_updated_at();

-- RLS: anon full access (same pattern as finance_categories / todos)
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Drop first so migration is idempotent (re-run safe if policies already exist)
DROP POLICY IF EXISTS "notes_anon_select" ON public.notes;
DROP POLICY IF EXISTS "notes_anon_insert" ON public.notes;
DROP POLICY IF EXISTS "notes_anon_update" ON public.notes;
DROP POLICY IF EXISTS "notes_anon_delete" ON public.notes;

CREATE POLICY "notes_anon_select"
  ON public.notes FOR SELECT TO anon USING (true);

CREATE POLICY "notes_anon_insert"
  ON public.notes FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "notes_anon_update"
  ON public.notes FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "notes_anon_delete"
  ON public.notes FOR DELETE TO anon USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO anon;
