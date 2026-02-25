-- Allow anon role to use finance_categories (app uses custom owner 'adrian'|'sarah', not auth.uid())
-- Run in Supabase Dashboard → SQL Editor, or: supabase db push

ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_categories_anon_select"
  ON public.finance_categories FOR SELECT TO anon
  USING (true);

CREATE POLICY "finance_categories_anon_insert"
  ON public.finance_categories FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "finance_categories_anon_update"
  ON public.finance_categories FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "finance_categories_anon_delete"
  ON public.finance_categories FOR DELETE TO anon
  USING (true);

-- Ensure anon has table privileges (often already granted)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_categories TO anon;
