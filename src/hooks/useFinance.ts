import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { UserId, FinanceAccount, FinanceCategory, FinanceBudget, FinanceTransaction, FinanceBill, BudgetSummary } from '../types';
import * as FinanceService from '../services/finance';
import { startOfMonth } from 'date-fns';

// ─── useAccounts ──────────────────────────────────────────────────────────────

export function useAccounts(
  owner: UserId,
  transactions?: Pick<FinanceTransaction, 'account_id' | 'transfer_account_id' | 'amount' | 'type'>[]
) {
  const [accounts, setAccounts]   = useState<FinanceAccount[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await FinanceService.fetchAccounts(owner);
      setAccounts(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [owner]);

  useEffect(() => { load(); }, [load]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`finance_accounts_${owner}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_accounts', filter: `owner=eq.${owner}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [owner, load]);

  const createAccount = useCallback(async (
    payload: Pick<FinanceAccount, 'name' | 'type' | 'balance' | 'color' | 'icon'>
  ) => {
    // Store the initial balance as starting_balance so recompute works correctly
    const acc = await FinanceService.createAccount(owner, payload);
    setAccounts(prev => [...prev, acc]);
    return acc;
  }, [owner]);

  const updateAccount = useCallback(async (
    id: string,
    patch: Partial<Pick<FinanceAccount, 'name' | 'type' | 'balance' | 'color' | 'icon' | 'is_archived'>>
  ) => {
    const updated = await FinanceService.updateAccount(id, patch);
    setAccounts(prev => prev.map(a => a.id === id ? updated : a));
    return updated;
  }, []);

  const deleteAccount = useCallback(async (id: string) => {
    await FinanceService.deleteAccount(id);
    setAccounts(prev => prev.filter(a => a.id !== id));
  }, []);

  // If we have transactions and accounts have starting_balance set, compute balances from transactions.
  // Otherwise use the stored balance from the DB (avoids showing 0 + income - expenses when starting_balance is missing).
  const accountsWithLiveBalances: FinanceAccount[] = (() => {
    if (!transactions || transactions.length === 0) return accounts;
    const hasStartingBalance = accounts.some(a => (a as any).starting_balance != null);
    if (!hasStartingBalance) return accounts;
    const computed = FinanceService.computeBalancesFromTransactions(accounts, transactions);
    return accounts.map(a => ({
      ...a,
      balance: (a as any).starting_balance != null ? (computed[a.id] ?? a.balance) : a.balance,
    }));
  })();

  const netWorth = FinanceService.computeNetWorth(accountsWithLiveBalances);

  return {
    accounts: accountsWithLiveBalances,
    loading, error, refresh: load,
    createAccount, updateAccount, deleteAccount,
    netWorth,
  };
}

// ─── useCategories (finance) ──────────────────────────────────────────────────

export function useFinanceCategories(owner: UserId) {
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await FinanceService.fetchCategories(owner);
      setCategories(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [owner]);

  useEffect(() => { load(); }, [load]);

  const createCategory = useCallback(async (
    payload: Pick<FinanceCategory, 'name' | 'icon' | 'color' | 'type' | 'budget_goal' | 'rollover'>
  ) => {
    const cat = await FinanceService.createCategory(owner, payload);
    setCategories(prev => [...prev, cat]);
    return cat;
  }, [owner]);

  const updateCategory = useCallback(async (
    id: string,
    patch: Partial<Pick<FinanceCategory, 'name' | 'icon' | 'color' | 'budget_goal' | 'rollover'>>
  ) => {
    const updated = await FinanceService.updateCategory(id, patch);
    setCategories(prev => prev.map(c => c.id === id ? updated : c));
    return updated;
  }, []);

  const seedDefaults = useCallback(async () => {
    await FinanceService.seedDefaultCategories(owner);
    await load();
  }, [owner, load]);

  return { categories, loading, error, refresh: load, createCategory, updateCategory, seedDefaults };
}

// ─── useBudgets ───────────────────────────────────────────────────────────────

export function useBudgets(owner: UserId, month: Date) {
  const [budgets, setBudgets]   = useState<FinanceBudget[]>([]);
  const [summary, setSummary]   = useState<BudgetSummary[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const categoriesRef           = useRef<FinanceCategory[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [bdata, cats] = await Promise.all([
        FinanceService.fetchBudgets(owner, month),
        FinanceService.fetchCategories(owner),
      ]);
      categoriesRef.current = cats;
      setBudgets(bdata);
      const s = await FinanceService.computeBudgetSummary(owner, cats, bdata, month);
      setSummary(s);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [owner, month]);

  useEffect(() => { load(); }, [load]);

  const upsertBudget = useCallback(async (category_id: string, allocated: number) => {
    await FinanceService.upsertBudget(owner, category_id, month, allocated);
    await load();
  }, [owner, month, load]);

  return { budgets, summary, loading, error, refresh: load, upsertBudget };
}

// ─── useTransactions ──────────────────────────────────────────────────────────

export function useTransactions(owner: UserId, month: Date) {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [allTxnsForBalance, setAllTxnsForBalance] = useState<Pick<FinanceTransaction, 'id' | 'account_id' | 'transfer_account_id' | 'amount' | 'type'>[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [monthlyTotals, setMonthlyTotals] = useState<Array<{ month: string; income: number; expense: number }>>([]);
  const [dailySpending, setDailySpending] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [txns, totals, daily, allForBalance] = await Promise.all([
        FinanceService.fetchTransactions(owner, { month }),
        FinanceService.fetchMonthlyTotals(owner, 6),
        FinanceService.fetchDailySpending(owner, month),
        FinanceService.fetchAllTransactionsForBalance(owner),
      ]);
      setTransactions(txns);
      setMonthlyTotals(totals);
      setDailySpending(daily);
      setAllTxnsForBalance(allForBalance);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [owner, month]);

  useEffect(() => { load(); }, [load]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`finance_txns_${owner}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_transactions', filter: `owner=eq.${owner}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [owner, load]);

  const addTransaction = useCallback(async (payload: FinanceService.CreateTransactionPayload) => {
    const txn = await FinanceService.createTransaction(owner, payload);
    await load();
    return txn;
  }, [owner, load]);

  const removeTransaction = useCallback(async (id: string) => {
    await FinanceService.deleteTransaction(id);
    await load();
  }, [load]);

  const monthIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);

  return {
    transactions, allTxnsForBalance, loading, error, refresh: load,
    addTransaction, removeTransaction,
    monthIncome, monthExpense, monthlyTotals, dailySpending,
  };
}

// ─── useBills ─────────────────────────────────────────────────────────────────

export function useBills(owner: UserId) {
  const [bills, setBills]   = useState<FinanceBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await FinanceService.fetchBills(owner);
      setBills(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [owner]);

  useEffect(() => { load(); }, [load]);

  const createBill = useCallback(async (
    payload: Pick<FinanceBill, 'name' | 'amount' | 'due_day' | 'frequency' | 'next_due' | 'auto_pay' | 'color' | 'icon' | 'account_id' | 'category_id'>
  ) => {
    const bill = await FinanceService.createBill(owner, payload);
    setBills(prev => [...prev, bill].sort((a, b) => a.next_due.localeCompare(b.next_due)));
    return bill;
  }, [owner]);

  const updateBill = useCallback(async (
    id: string,
    patch: Partial<Pick<FinanceBill, 'name' | 'amount' | 'due_day' | 'frequency' | 'next_due' | 'auto_pay' | 'is_active' | 'color' | 'icon'>>
  ) => {
    const updated = await FinanceService.updateBill(id, patch);
    setBills(prev => prev.map(b => b.id === id ? updated : b));
    return updated;
  }, []);

  const deleteBill = useCallback(async (id: string) => {
    await FinanceService.deleteBill(id);
    setBills(prev => prev.filter(b => b.id !== id));
  }, []);

  const upcomingBills = bills.filter(b => b.is_active).slice(0, 5);
  const totalMonthlyBills = bills
    .filter(b => b.is_active && b.frequency === 'monthly')
    .reduce((s, b) => s + b.amount, 0);

  return { bills, loading, error, refresh: load, createBill, updateBill, deleteBill, upcomingBills, totalMonthlyBills };
}
