-- ============================================================
-- Pi-Day Finance Tracker — Supabase Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ─── Accounts ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS finance_accounts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner        TEXT NOT NULL CHECK (owner IN ('adrian', 'sarah')),
  name         TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'credit', 'cash', 'investment')),
  balance      NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency     TEXT NOT NULL DEFAULT 'USD',
  color        TEXT NOT NULL DEFAULT '#3B82F6',
  icon         TEXT NOT NULL DEFAULT 'wallet-outline',
  is_archived  BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Finance Categories ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS finance_categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner        TEXT NOT NULL CHECK (owner IN ('adrian', 'sarah')),
  name         TEXT NOT NULL,
  icon         TEXT NOT NULL DEFAULT 'pricetag-outline',
  color        TEXT NOT NULL DEFAULT '#8B5CF6',
  type         TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
  budget_goal  NUMERIC(12,2),        -- monthly envelope target
  rollover     BOOLEAN NOT NULL DEFAULT false,  -- roll unspent $ to next month
  goal_id      UUID REFERENCES goals(id) ON DELETE SET NULL,  -- linked savings goal
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Budget Envelopes (per month) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS finance_budgets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner         TEXT NOT NULL CHECK (owner IN ('adrian', 'sarah')),
  category_id   UUID NOT NULL REFERENCES finance_categories(id) ON DELETE CASCADE,
  month         DATE NOT NULL,          -- first day of month: 2026-03-01
  allocated     NUMERIC(12,2) NOT NULL DEFAULT 0,
  rollover_from NUMERIC(12,2) NOT NULL DEFAULT 0,  -- carried from previous month
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner, category_id, month)
);

-- ─── Transactions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS finance_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner           TEXT NOT NULL CHECK (owner IN ('adrian', 'sarah')),
  account_id      UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES finance_categories(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  payee           TEXT,
  amount          NUMERIC(12,2) NOT NULL,   -- positive = income, negative = expense
  type            TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  date            DATE NOT NULL,
  notes           TEXT,
  is_recurring    BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule TEXT,                     -- 'monthly', 'weekly', 'yearly'
  recurrence_day  INTEGER,                  -- day of month / week for recurrence
  -- For split transactions: parent_id points to the "parent" entry
  parent_id       UUID REFERENCES finance_transactions(id) ON DELETE CASCADE,
  -- For transfer: the destination account
  transfer_account_id UUID REFERENCES finance_accounts(id) ON DELETE SET NULL,
  -- Receipt / image
  receipt_url     TEXT,
  cleared         BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Bills / Subscriptions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS finance_bills (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner        TEXT NOT NULL CHECK (owner IN ('adrian', 'sarah')),
  account_id   UUID REFERENCES finance_accounts(id) ON DELETE SET NULL,
  category_id  UUID REFERENCES finance_categories(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  amount       NUMERIC(12,2) NOT NULL,
  due_day      INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),  -- day of month
  frequency    TEXT NOT NULL CHECK (frequency IN ('monthly', 'yearly', 'weekly', 'quarterly')),
  next_due     DATE NOT NULL,
  auto_pay     BOOLEAN NOT NULL DEFAULT false,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  color        TEXT NOT NULL DEFAULT '#EF4444',
  icon         TEXT NOT NULL DEFAULT 'card-outline',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Realtime ─────────────────────────────────────────────────────────────────
ALTER TABLE finance_accounts     REPLICA IDENTITY FULL;
ALTER TABLE finance_categories   REPLICA IDENTITY FULL;
ALTER TABLE finance_budgets      REPLICA IDENTITY FULL;
ALTER TABLE finance_transactions REPLICA IDENTITY FULL;
ALTER TABLE finance_bills        REPLICA IDENTITY FULL;

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_finance_txn_owner_date     ON finance_transactions(owner, date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_txn_account        ON finance_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_finance_txn_category       ON finance_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_finance_budget_owner_month ON finance_budgets(owner, month);
CREATE INDEX IF NOT EXISTS idx_finance_bills_owner        ON finance_bills(owner, next_due);

-- ─── Seed: default categories ─────────────────────────────────────────────────
-- (Run once per user after creating their first account)
-- INSERT INTO finance_categories (owner, name, icon, color, type, sort_order) VALUES
--   ('adrian', 'Groceries',    'basket-outline',      '#22C55E', 'expense', 1),
--   ('adrian', 'Dining Out',   'restaurant-outline',  '#F59E0B', 'expense', 2),
--   ('adrian', 'Transport',    'car-outline',         '#3B82F6', 'expense', 3),
--   ('adrian', 'Shopping',     'bag-outline',         '#8B5CF6', 'expense', 4),
--   ('adrian', 'Utilities',    'flash-outline',       '#EF4444', 'expense', 5),
--   ('adrian', 'Health',       'heart-outline',       '#EC4899', 'expense', 6),
--   ('adrian', 'Entertainment','tv-outline',          '#06B6D4', 'expense', 7),
--   ('adrian', 'Savings',      'save-outline',        '#10B981', 'income',  8),
--   ('adrian', 'Salary',       'cash-outline',        '#22C55E', 'income',  9),
--   ('adrian', 'Freelance',    'briefcase-outline',   '#F59E0B', 'income', 10);

-- ============================================================
-- Plaid integration (run in Supabase SQL Editor)
-- ============================================================

-- ─── Plaid Items (one per linked institution) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS plaid_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner              TEXT NOT NULL,
  item_id            TEXT NOT NULL UNIQUE,
  access_token       TEXT NOT NULL,
  institution_id     TEXT NOT NULL,
  institution_name   TEXT NOT NULL,
  institution_color  TEXT,
  institution_logo   TEXT,
  is_active          BOOLEAN NOT NULL DEFAULT true,
  last_synced_at     TIMESTAMPTZ,
  error_code         TEXT,
  error_message      TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Plaid Linked Accounts (Plaid accounts per item, optional link to finance_accounts) ─
CREATE TABLE IF NOT EXISTS plaid_linked_accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id             UUID NOT NULL REFERENCES plaid_items(id) ON DELETE CASCADE,
  plaid_account_id    TEXT NOT NULL,
  finance_account_id  UUID REFERENCES finance_accounts(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  official_name       TEXT,
  type                TEXT NOT NULL,
  subtype             TEXT,
  mask                TEXT,
  current_balance     NUMERIC(12,2),
  available_balance   NUMERIC(12,2),
  iso_currency_code   TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_id, plaid_account_id)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_plaid_items_owner        ON plaid_items(owner);
CREATE INDEX IF NOT EXISTS idx_plaid_linked_accounts_item ON plaid_linked_accounts(item_id);
CREATE INDEX IF NOT EXISTS idx_plaid_linked_accounts_finance ON plaid_linked_accounts(finance_account_id) WHERE finance_account_id IS NOT NULL;

-- ─── Realtime ───────────────────────────────────────────────────────────────
ALTER TABLE plaid_items           REPLICA IDENTITY FULL;
ALTER TABLE plaid_linked_accounts REPLICA IDENTITY FULL;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE plaid_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaid_linked_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY plaid_items_select ON plaid_items
  FOR SELECT USING (owner = auth.uid()::text);
CREATE POLICY plaid_items_insert ON plaid_items
  FOR INSERT WITH CHECK (owner = auth.uid()::text);
CREATE POLICY plaid_items_update ON plaid_items
  FOR UPDATE USING (owner = auth.uid()::text);
CREATE POLICY plaid_items_delete ON plaid_items
  FOR DELETE USING (owner = auth.uid()::text);

CREATE POLICY plaid_linked_accounts_select ON plaid_linked_accounts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM plaid_items WHERE plaid_items.id = plaid_linked_accounts.item_id AND plaid_items.owner = auth.uid()::text)
  );
CREATE POLICY plaid_linked_accounts_insert ON plaid_linked_accounts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM plaid_items WHERE plaid_items.id = plaid_linked_accounts.item_id AND plaid_items.owner = auth.uid()::text)
  );
CREATE POLICY plaid_linked_accounts_update ON plaid_linked_accounts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM plaid_items WHERE plaid_items.id = plaid_linked_accounts.item_id AND plaid_items.owner = auth.uid()::text)
  );
CREATE POLICY plaid_linked_accounts_delete ON plaid_linked_accounts
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM plaid_items WHERE plaid_items.id = plaid_linked_accounts.item_id AND plaid_items.owner = auth.uid()::text)
  );
