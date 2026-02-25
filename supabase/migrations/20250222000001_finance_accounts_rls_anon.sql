-- Allow anon role to use finance_* tables (app uses custom owner 'adrian'|'sarah', not auth.uid())
-- Run in Supabase Dashboard → SQL Editor, or: supabase db push

-- finance_accounts
ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_accounts_anon_select"
  ON public.finance_accounts FOR SELECT TO anon USING (true);
CREATE POLICY "finance_accounts_anon_insert"
  ON public.finance_accounts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "finance_accounts_anon_update"
  ON public.finance_accounts FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "finance_accounts_anon_delete"
  ON public.finance_accounts FOR DELETE TO anon USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_accounts TO anon;

-- finance_budgets
ALTER TABLE public.finance_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_budgets_anon_select"
  ON public.finance_budgets FOR SELECT TO anon USING (true);
CREATE POLICY "finance_budgets_anon_insert"
  ON public.finance_budgets FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "finance_budgets_anon_update"
  ON public.finance_budgets FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "finance_budgets_anon_delete"
  ON public.finance_budgets FOR DELETE TO anon USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_budgets TO anon;

-- finance_transactions
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_transactions_anon_select"
  ON public.finance_transactions FOR SELECT TO anon USING (true);
CREATE POLICY "finance_transactions_anon_insert"
  ON public.finance_transactions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "finance_transactions_anon_update"
  ON public.finance_transactions FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "finance_transactions_anon_delete"
  ON public.finance_transactions FOR DELETE TO anon USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_transactions TO anon;

-- finance_bills
ALTER TABLE public.finance_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_bills_anon_select"
  ON public.finance_bills FOR SELECT TO anon USING (true);
CREATE POLICY "finance_bills_anon_insert"
  ON public.finance_bills FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "finance_bills_anon_update"
  ON public.finance_bills FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "finance_bills_anon_delete"
  ON public.finance_bills FOR DELETE TO anon USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_bills TO anon;
