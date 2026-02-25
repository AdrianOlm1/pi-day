import { supabase } from '../lib/supabase';
import type {
  UserId,
  FinanceAccount,
  FinanceCategory,
  FinanceBudget,
  FinanceTransaction,
  FinanceBill,
  BudgetSummary,
  FinanceTxnType,
  FinanceAccountType,
  FinanceCatType,
  BillFrequency,
  FinanceRecurrenceRule,
} from '../types';
import { format, startOfMonth, subMonths, addMonths } from 'date-fns';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function monthKey(d: Date): string {
  return format(startOfMonth(d), 'yyyy-MM-dd');
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

export async function fetchAccounts(owner: UserId): Promise<FinanceAccount[]> {
  const { data, error } = await supabase
    .from('finance_accounts')
    .select('*')
    .eq('owner', owner)
    .eq('is_archived', false)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createAccount(
  owner: UserId,
  payload: Pick<FinanceAccount, 'name' | 'type' | 'balance' | 'color' | 'icon'>
): Promise<FinanceAccount> {
  const { data, error } = await supabase
    .from('finance_accounts')
    .insert({ owner, ...payload, currency: 'USD' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateAccount(
  id: string,
  patch: Partial<Pick<FinanceAccount, 'name' | 'type' | 'balance' | 'color' | 'icon' | 'is_archived'>>
): Promise<FinanceAccount> {
  const { data, error } = await supabase
    .from('finance_accounts')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteAccount(id: string): Promise<void> {
  const { error } = await supabase.from('finance_accounts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function fetchCategories(owner: UserId): Promise<FinanceCategory[]> {
  const { data, error } = await supabase
    .from('finance_categories')
    .select('*')
    .eq('owner', owner)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createCategory(
  owner: UserId,
  payload: Pick<FinanceCategory, 'name' | 'icon' | 'color' | 'type' | 'budget_goal' | 'rollover'>
): Promise<FinanceCategory> {
  const { data, error } = await supabase
    .from('finance_categories')
    .insert({ owner, ...payload })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateCategory(
  id: string,
  patch: Partial<Pick<FinanceCategory, 'name' | 'icon' | 'color' | 'budget_goal' | 'rollover'>>
): Promise<FinanceCategory> {
  const { data, error } = await supabase
    .from('finance_categories')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('finance_categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Seed default categories for a new user. No-op if owner already has categories. */
export async function seedDefaultCategories(owner: UserId): Promise<void> {
  const existing = await fetchCategories(owner);
  if (existing.length > 0) return;

  const defaults: Array<Pick<FinanceCategory, 'name' | 'icon' | 'color' | 'type' | 'budget_goal' | 'rollover' | 'sort_order'>> = [
    { name: 'Groceries',     icon: 'basket-outline',      color: '#22C55E', type: 'expense', budget_goal: 400,  rollover: false, sort_order: 1 },
    { name: 'Dining Out',    icon: 'restaurant-outline',  color: '#F59E0B', type: 'expense', budget_goal: 200,  rollover: false, sort_order: 2 },
    { name: 'Transport',     icon: 'car-outline',         color: '#3B82F6', type: 'expense', budget_goal: 150,  rollover: false, sort_order: 3 },
    { name: 'Shopping',      icon: 'bag-outline',         color: '#8B5CF6', type: 'expense', budget_goal: 200,  rollover: false, sort_order: 4 },
    { name: 'Utilities',     icon: 'flash-outline',       color: '#EF4444', type: 'expense', budget_goal: 200,  rollover: false, sort_order: 5 },
    { name: 'Health',        icon: 'heart-outline',       color: '#EC4899', type: 'expense', budget_goal: 100,  rollover: true,  sort_order: 6 },
    { name: 'Entertainment', icon: 'tv-outline',          color: '#06B6D4', type: 'expense', budget_goal: 100,  rollover: false, sort_order: 7 },
    { name: 'Savings',       icon: 'save-outline',        color: '#10B981', type: 'income',  budget_goal: null, rollover: true,  sort_order: 8 },
    { name: 'Salary',        icon: 'cash-outline',        color: '#22C55E', type: 'income',  budget_goal: null, rollover: false, sort_order: 9 },
    { name: 'Freelance',     icon: 'briefcase-outline',   color: '#F59E0B', type: 'income',  budget_goal: null, rollover: false, sort_order: 10 },
    { name: 'Subscriptions', icon: 'repeat-outline',      color: '#6366F1', type: 'expense', budget_goal: 50,   rollover: false, sort_order: 11 },
    { name: 'Rent/Mortgage', icon: 'home-outline',        color: '#14B8A6', type: 'expense', budget_goal: 0,    rollover: false, sort_order: 12 },
  ];
  const rows = defaults.map((d, i) => ({ owner, ...d, goal_id: null, sort_order: i + 1 }));
  const { error } = await supabase.from('finance_categories').insert(rows);
  if (error) throw new Error(error.message);
}

// ─── Budgets ──────────────────────────────────────────────────────────────────

export async function fetchBudgets(owner: UserId, month: Date): Promise<FinanceBudget[]> {
  const { data, error } = await supabase
    .from('finance_budgets')
    .select('*, category:finance_categories(*)')
    .eq('owner', owner)
    .eq('month', monthKey(month));
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Upsert a budget allocation for a category+month */
export async function upsertBudget(
  owner: UserId,
  category_id: string,
  month: Date,
  allocated: number
): Promise<FinanceBudget> {
  const { data, error } = await supabase
    .from('finance_budgets')
    .upsert(
      { owner, category_id, month: monthKey(month), allocated, updated_at: new Date().toISOString() },
      { onConflict: 'owner,category_id,month' }
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Roll over unspent budget from previous month to current */
export async function rolloverBudgets(owner: UserId, toMonth: Date): Promise<void> {
  const fromMonth = subMonths(toMonth, 1);
  const cats = await fetchCategories(owner);
  const rolloverCats = cats.filter(c => c.rollover);
  if (rolloverCats.length === 0) return;

  const prevBudgets = await fetchBudgets(owner, fromMonth);
  // Calculate spending for each rollover cat in prev month
  const spent = await fetchMonthlySpentByCategory(owner, fromMonth);

  for (const cat of rolloverCats) {
    const prev = prevBudgets.find(b => b.category_id === cat.id);
    if (!prev) continue;
    const prevSpent = Math.abs(spent[cat.id] ?? 0);
    const unspent = Math.max(0, prev.allocated + prev.rollover_from - prevSpent);
    if (unspent <= 0) continue;
    // Apply rollover to current month
    const { error } = await supabase
      .from('finance_budgets')
      .upsert(
        {
          owner,
          category_id: cat.id,
          month: monthKey(toMonth),
          rollover_from: unspent,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'owner,category_id,month' }
      );
    if (error) throw new Error(error.message);
  }
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function fetchTransactions(
  owner: UserId,
  opts: { limit?: number; accountId?: string; categoryId?: string; month?: Date } = {}
): Promise<FinanceTransaction[]> {
  let q = supabase
    .from('finance_transactions')
    .select('*, category:finance_categories(*), account:finance_accounts!account_id(*)')
    .eq('owner', owner)
    .is('parent_id', null)  // don't show split children separately
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (opts.accountId)  q = q.eq('account_id', opts.accountId);
  if (opts.categoryId) q = q.eq('category_id', opts.categoryId);
  if (opts.month) {
    const start = format(startOfMonth(opts.month), 'yyyy-MM-dd');
    const end   = format(startOfMonth(addMonths(opts.month, 1)), 'yyyy-MM-dd');
    q = q.gte('date', start).lt('date', end);
  }
  if (opts.limit) q = q.limit(opts.limit);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchRecentTransactions(owner: UserId, limit = 20): Promise<FinanceTransaction[]> {
  return fetchTransactions(owner, { limit });
}

/** Lightweight fetch of all transactions for balance computation — no joins, minimal columns */
export async function fetchAllTransactionsForBalance(
  owner: UserId
): Promise<Pick<FinanceTransaction, 'id' | 'account_id' | 'transfer_account_id' | 'amount' | 'type'>[]> {
  const { data, error } = await supabase
    .from('finance_transactions')
    .select('id, account_id, transfer_account_id, amount, type')
    .eq('owner', owner)
    .is('parent_id', null);
  if (error) throw new Error(error.message);
  return (data ?? []) as any;
}

/** Fetch monthly spending grouped by category_id */
export async function fetchMonthlySpentByCategory(
  owner: UserId,
  month: Date
): Promise<Record<string, number>> {
  const start = format(startOfMonth(month), 'yyyy-MM-dd');
  const end   = format(startOfMonth(addMonths(month, 1)), 'yyyy-MM-dd');
  const { data, error } = await supabase
    .from('finance_transactions')
    .select('category_id, amount')
    .eq('owner', owner)
    .eq('type', 'expense')
    .gte('date', start)
    .lt('date', end)
    .is('parent_id', null);
  if (error) throw new Error(error.message);
  const result: Record<string, number> = {};
  for (const row of (data ?? [])) {
    if (!row.category_id) continue;
    result[row.category_id] = (result[row.category_id] ?? 0) + Math.abs(row.amount);
  }
  return result;
}

/** Daily spending amounts for heatmap — returns { 'YYYY-MM-DD': amount } */
export async function fetchDailySpending(owner: UserId, month: Date): Promise<Record<string, number>> {
  const start = format(startOfMonth(month), 'yyyy-MM-dd');
  const end   = format(startOfMonth(addMonths(month, 1)), 'yyyy-MM-dd');
  const { data, error } = await supabase
    .from('finance_transactions')
    .select('date, amount')
    .eq('owner', owner)
    .eq('type', 'expense')
    .gte('date', start)
    .lt('date', end);
  if (error) throw new Error(error.message);
  const result: Record<string, number> = {};
  for (const row of (data ?? [])) {
    result[row.date] = (result[row.date] ?? 0) + Math.abs(row.amount);
  }
  return result;
}

/** Monthly income & expense totals for the last N months */
export async function fetchMonthlyTotals(
  owner: UserId,
  months = 6
): Promise<Array<{ month: string; income: number; expense: number }>> {
  const results: Array<{ month: string; income: number; expense: number }> = [];
  for (let i = months - 1; i >= 0; i--) {
    const m = subMonths(new Date(), i);
    const start = format(startOfMonth(m), 'yyyy-MM-dd');
    const end   = format(startOfMonth(addMonths(m, 1)), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('finance_transactions')
      .select('type, amount')
      .eq('owner', owner)
      .gte('date', start)
      .lt('date', end)
      .is('parent_id', null);
    let income = 0, expense = 0;
    for (const row of (data ?? [])) {
      if (row.type === 'income') income += row.amount;
      else if (row.type === 'expense') expense += Math.abs(row.amount);
    }
    results.push({ month: format(m, 'MMM'), income, expense });
  }
  return results;
}

export interface CreateTransactionPayload {
  account_id:          string;
  category_id:         string | null;
  title:               string;
  payee:               string | null;
  amount:              number;
  type:                FinanceTxnType;
  date:                string;
  notes:               string | null;
  is_recurring:        boolean;
  recurrence_rule:     FinanceRecurrenceRule | null;
  recurrence_day:      number | null;
  transfer_account_id: string | null;
  receipt_url:         string | null;
  /** Child splits — omit for non-split transactions */
  splits?: Array<{ category_id: string; amount: number; title: string }>;
}

export async function createTransaction(
  owner: UserId,
  payload: CreateTransactionPayload
): Promise<FinanceTransaction> {
  const { splits, ...rest } = payload;
  // Coerce empty strings → null for UUID columns
  const toUuid = (v: string | null | undefined): string | null =>
    v && v.trim() !== '' ? v : null;
  const sanitized = {
    ...rest,
    account_id:          toUuid(rest.account_id) as string, // account_id required, but guard anyway
    category_id:         toUuid(rest.category_id),
    transfer_account_id: toUuid(rest.transfer_account_id),
  };
  const { data: parent, error } = await supabase
    .from('finance_transactions')
    .insert({ owner, ...sanitized, cleared: true })
    .select()
    .single();
  if (error) throw new Error(error.message);

  // Insert split children
  if (splits && splits.length > 0) {
    const children = splits.map(s => ({
      owner,
      account_id: sanitized.account_id,
      category_id: toUuid(s.category_id),
      title: s.title,
      payee: sanitized.payee,
      amount: s.amount,
      type: sanitized.type,
      date: sanitized.date,
      notes: null,
      parent_id: parent.id,
      is_recurring: false,
      recurrence_rule: null,
      recurrence_day: null,
      transfer_account_id: null,
      receipt_url: null,
      cleared: true,
    }));
    const { error: ce } = await supabase.from('finance_transactions').insert(children);
    if (ce) throw new Error(ce.message);
  }

  // Update account balance
  const delta = sanitized.type === 'expense'
    ? -Math.abs(sanitized.amount)
    : sanitized.type === 'income'
    ? Math.abs(sanitized.amount)
    : 0;
  if (delta !== 0) {
    await supabase.rpc('increment_balance', { account_id: sanitized.account_id, delta });
  }
  // Transfer: deduct from source, add to dest
  if (sanitized.type === 'transfer' && sanitized.transfer_account_id) {
    await supabase.rpc('increment_balance', { account_id: sanitized.account_id, delta: -Math.abs(sanitized.amount) });
    await supabase.rpc('increment_balance', { account_id: sanitized.transfer_account_id, delta: Math.abs(sanitized.amount) });
  }

  return parent;
}

export async function updateTransaction(
  id: string,
  patch: Partial<Pick<FinanceTransaction, 'title' | 'payee' | 'amount' | 'category_id' | 'date' | 'notes'>>
): Promise<FinanceTransaction> {
  const { data, error } = await supabase
    .from('finance_transactions')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteTransaction(id: string): Promise<void> {
  // Fetch the transaction first so we can reverse its balance effect
  const { data: txn } = await supabase
    .from('finance_transactions')
    .select('account_id, transfer_account_id, amount, type')
    .eq('id', id)
    .single();

  const { error } = await supabase.from('finance_transactions').delete().eq('id', id);
  if (error) throw new Error(error.message);

  // Reverse the balance delta
  if (txn) {
    if (txn.type === 'income') {
      await supabase.rpc('increment_balance', { account_id: txn.account_id, delta: -Math.abs(txn.amount) });
    } else if (txn.type === 'expense') {
      await supabase.rpc('increment_balance', { account_id: txn.account_id, delta: Math.abs(txn.amount) });
    } else if (txn.type === 'transfer') {
      await supabase.rpc('increment_balance', { account_id: txn.account_id, delta: Math.abs(txn.amount) });
      if (txn.transfer_account_id) {
        await supabase.rpc('increment_balance', { account_id: txn.transfer_account_id, delta: -Math.abs(txn.amount) });
      }
    }
  }
}

/** Bulk insert transactions — used for CSV import */
export async function bulkCreateTransactions(
  owner: UserId,
  payloads: CreateTransactionPayload[]
): Promise<number> {
  if (payloads.length === 0) return 0;
  // Coerce empty strings → null so Postgres UUID columns don't reject them
  const toUuid = (v: string | null | undefined): string | null =>
    v && v.trim() !== '' ? v : null;
  const rows = payloads.map(p => ({
    owner,
    account_id:          toUuid(p.account_id),
    category_id:         toUuid(p.category_id),
    title:               p.title,
    payee:               p.payee,
    amount:              p.amount,
    type:                p.type,
    date:                p.date,
    notes:               p.notes,
    is_recurring:        false,
    recurrence_rule:     null,
    recurrence_day:      null,
    transfer_account_id: null,
    receipt_url:         null,
    cleared:             true,
  }));

  // Insert in chunks of 100
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { error } = await supabase.from('finance_transactions').insert(chunk);
    if (error) throw new Error(error.message);
    inserted += chunk.length;
  }

  // Recompute all account balances from the full transaction history
  try {
    await recomputeAccountBalances(owner);
  } catch {
    // Non-fatal — balances will be fixed on next recompute
  }

  return inserted;
}

// ─── Spending Habits ──────────────────────────────────────────────────────────

export interface MerchantSummary {
  payee:   string;
  total:   number;
  count:   number;
  lastDate: string;
}

/** Top merchants/payees by spend in a date range */
export async function fetchTopMerchants(
  owner:     UserId,
  startDate: string,
  endDate:   string,
  limit = 20
): Promise<MerchantSummary[]> {
  const { data, error } = await supabase
    .from('finance_transactions')
    .select('payee, title, amount, date')
    .eq('owner', owner)
    .eq('type', 'expense')
    .gte('date', startDate)
    .lte('date', endDate)
    .is('parent_id', null);
  if (error) throw new Error(error.message);

  const map: Record<string, { total: number; count: number; lastDate: string }> = {};
  for (const row of (data ?? [])) {
    const key = (row.payee || row.title || 'Unknown').trim();
    if (!map[key]) map[key] = { total: 0, count: 0, lastDate: row.date };
    map[key].total   += Math.abs(row.amount);
    map[key].count   += 1;
    if (row.date > map[key].lastDate) map[key].lastDate = row.date;
  }

  return Object.entries(map)
    .map(([payee, v]) => ({ payee, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export interface PeriodSummary {
  label:   string;
  income:  number;
  expense: number;
  net:     number;
  txnCount: number;
}

/** Spending summary for a custom date range */
export async function fetchPeriodSummary(
  owner:     UserId,
  startDate: string,
  endDate:   string
): Promise<PeriodSummary> {
  const { data, error } = await supabase
    .from('finance_transactions')
    .select('type, amount')
    .eq('owner', owner)
    .gte('date', startDate)
    .lte('date', endDate)
    .is('parent_id', null);
  if (error) throw new Error(error.message);

  let income = 0, expense = 0;
  for (const row of (data ?? [])) {
    if (row.type === 'income')  income  += Math.abs(row.amount);
    if (row.type === 'expense') expense += Math.abs(row.amount);
  }
  return {
    label:    `${startDate} → ${endDate}`,
    income,
    expense,
    net:      income - expense,
    txnCount: (data ?? []).length,
  };
}

// ─── Bills ────────────────────────────────────────────────────────────────────

export async function fetchBills(owner: UserId): Promise<FinanceBill[]> {
  const { data, error } = await supabase
    .from('finance_bills')
    .select('*')
    .eq('owner', owner)
    .order('next_due', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createBill(
  owner: UserId,
  payload: Pick<FinanceBill, 'name' | 'amount' | 'due_day' | 'frequency' | 'next_due' | 'auto_pay' | 'color' | 'icon' | 'account_id' | 'category_id'>
): Promise<FinanceBill> {
  const { data, error } = await supabase
    .from('finance_bills')
    .insert({ owner, ...payload, is_active: true })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateBill(
  id: string,
  patch: Partial<Pick<FinanceBill, 'name' | 'amount' | 'due_day' | 'frequency' | 'next_due' | 'auto_pay' | 'is_active' | 'color' | 'icon'>>
): Promise<FinanceBill> {
  const { data, error } = await supabase
    .from('finance_bills')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteBill(id: string): Promise<void> {
  const { error } = await supabase.from('finance_bills').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Budget summary ───────────────────────────────────────────────────────────

export async function computeBudgetSummary(
  owner: UserId,
  categories: ReturnType<typeof fetchCategories> extends Promise<infer T> ? T : never,
  budgets: FinanceBudget[],
  month: Date
): Promise<BudgetSummary[]> {
  const spent = await fetchMonthlySpentByCategory(owner, month);
  return categories
    .filter(c => c.type === 'expense' && c.budget_goal !== null)
    .map(cat => {
      const b = budgets.find(bud => bud.category_id === cat.id);
      const allocated = b?.allocated ?? cat.budget_goal ?? 0;
      const rollover  = b?.rollover_from ?? 0;
      const catSpent  = spent[cat.id] ?? 0;
      return {
        category_id: cat.id,
        category: cat,
        allocated,
        spent: catSpent,
        remaining: allocated + rollover - catSpent,
        rollover,
      };
    });
}

// ─── Net worth snapshot ───────────────────────────────────────────────────────

export function computeNetWorth(accounts: FinanceAccount[]): number {
  return accounts.reduce((sum, a) => {
    // Credit accounts are liabilities — subtract
    return sum + (a.type === 'credit' ? -a.balance : a.balance);
  }, 0);
}

// ─── Balance recompute from transactions ──────────────────────────────────────

/**
 * Recomputes every account's balance as:
 *   starting_balance  +  sum(income txns)  -  sum(expense txns)
 *
 * Uses the `starting_balance` column if it exists, otherwise falls back to 0.
 * Returns the updated accounts with corrected balances.
 */
export async function recomputeAccountBalances(owner: UserId): Promise<FinanceAccount[]> {
  // Fetch all accounts and all non-split transactions in parallel
  const [{ data: accts, error: ae }, { data: txns, error: te }] = await Promise.all([
    supabase.from('finance_accounts').select('*').eq('owner', owner).eq('is_archived', false),
    supabase.from('finance_transactions')
      .select('account_id, transfer_account_id, amount, type')
      .eq('owner', owner)
      .is('parent_id', null),
  ]);
  if (ae) throw new Error(ae.message);
  if (te) throw new Error(te.message);

  // Accumulate deltas per account from transactions
  const deltas: Record<string, number> = {};
  for (const t of (txns ?? [])) {
    if (t.type === 'income') {
      deltas[t.account_id] = (deltas[t.account_id] ?? 0) + Math.abs(t.amount);
    } else if (t.type === 'expense') {
      deltas[t.account_id] = (deltas[t.account_id] ?? 0) - Math.abs(t.amount);
    } else if (t.type === 'transfer') {
      deltas[t.account_id]             = (deltas[t.account_id] ?? 0) - Math.abs(t.amount);
      if (t.transfer_account_id) {
        deltas[t.transfer_account_id]  = (deltas[t.transfer_account_id] ?? 0) + Math.abs(t.amount);
      }
    }
  }

  // Write corrected balances back and return updated accounts
  const updated: FinanceAccount[] = [];
  for (const a of (accts ?? [])) {
    const startingBalance = (a as any).starting_balance ?? 0;
    const newBalance = startingBalance + (deltas[a.id] ?? 0);
    const { data, error } = await supabase
      .from('finance_accounts')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', a.id)
      .select()
      .single();
    if (!error && data) {
      updated.push(data);
    } else {
      updated.push({ ...a, balance: newBalance });
    }
  }
  return updated;
}

/**
 * Compute per-account balances from a list of transactions (already in memory).
 * Returns a map of accountId → computed balance including the stored starting_balance.
 */
export function computeBalancesFromTransactions(
  accounts: FinanceAccount[],
  transactions: Pick<FinanceTransaction, 'account_id' | 'transfer_account_id' | 'amount' | 'type'>[]
): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const a of accounts) {
    balances[a.id] = (a as any).starting_balance ?? 0;
  }
  for (const t of transactions) {
    if (t.type === 'income') {
      balances[t.account_id] = (balances[t.account_id] ?? 0) + Math.abs(t.amount);
    } else if (t.type === 'expense') {
      balances[t.account_id] = (balances[t.account_id] ?? 0) - Math.abs(t.amount);
    } else if (t.type === 'transfer') {
      balances[t.account_id] = (balances[t.account_id] ?? 0) - Math.abs(t.amount);
      if (t.transfer_account_id) {
        balances[t.transfer_account_id] = (balances[t.transfer_account_id] ?? 0) + Math.abs(t.amount);
      }
    }
  }
  return balances;
}
