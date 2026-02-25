import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, Pressable, Modal, ActivityIndicator,
  Alert, TextInput as RNTextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { format, addMonths, subMonths, startOfMonth } from 'date-fns';
import { useUserMode } from '@/contexts/UserModeContext';
import { useAppColors } from '@/contexts/ThemeContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAccounts, useTransactions, useFinanceCategories, useBudgets } from '@/hooks/useFinance';
import * as FinanceService from '@/services/finance';
import { playTrash } from '@/utils/sounds';
import { parseCSV } from '@/services/csvImport';
import { categorizeAll } from '@/services/aiCategorize';
import { spacing, typography, radius, shadows, colors } from '@/theme';
import type { FinanceTransaction, FinanceCategory, FinanceAccount } from '@/types';

// ─── helpers ──────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${a})`;
}
function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}
function fmtDate(d: string): string {
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(y, m - 1, dd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function todayStr(): string { return format(new Date(), 'yyyy-MM-dd'); }

// ─── Shared sheet styles ───────────────────────────────────────────────────────

const sheet = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  card:     { borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: spacing.xl, paddingBottom: spacing.xxxl + 8 },
  handle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.12)', alignSelf: 'center', marginBottom: spacing.md },
  title:    { ...typography.title3, textAlign: 'center', marginBottom: spacing.lg },
  // Compact paired action row
  actionRow:{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  btn:      { flex: 1, paddingVertical: 9, borderRadius: radius.md, alignItems: 'center' },
  btnText:  { fontSize: 14, fontWeight: '600' },
  // Input
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 40, marginBottom: spacing.sm },
  inputText:{ flex: 1, ...typography.subhead, padding: 0 },
  // Section label
  label:    { ...typography.caption, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: spacing.sm },
  // Small chip
  chip:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1 },
  chipText: { ...typography.caption, fontWeight: '600' },
});

// ─── InnerTabs ────────────────────────────────────────────────────────────────

type TabKey = 'overview' | 'transactions' | 'budget' | 'accounts';
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'overview',     label: 'Overview',     icon: 'stats-chart-outline'  },
  { key: 'transactions', label: 'Transactions', icon: 'receipt-outline'      },
  { key: 'budget',       label: 'Budget',       icon: 'albums-outline'       },
  { key: 'accounts',     label: 'Accounts',     icon: 'wallet-outline'       },
];

function InnerTabs({ active, onChange, color }: { active: TabKey; onChange: (t: TabKey) => void; color: string }) {
  const appColors = useAppColors();
  return (
    <View style={[it.bar, { backgroundColor: appColors.surface, borderBottomColor: appColors.separator ?? colors.separator }]}>
      {TABS.map(t => {
        const sel = t.key === active;
        return (
          <Pressable key={t.key} onPress={() => onChange(t.key)} style={[it.tab, sel && { borderBottomColor: color, borderBottomWidth: 2 }]}>
            <Ionicons name={t.icon as any} size={16} color={sel ? color : appColors.labelTertiary} />
            <Text style={[it.label, { color: sel ? color : appColors.labelTertiary }]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
const it = StyleSheet.create({
  bar:   { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab:   { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 3, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  label: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
});

// ─── SpendingHeatmap ──────────────────────────────────────────────────────────

function SpendingHeatmap({
  dailySpending, month, onMonthChange, onDayPress, accentColor,
}: {
  dailySpending: Record<string, number>; month: Date;
  onMonthChange: (d: Date) => void; onDayPress: (d: string) => void; accentColor: string;
}) {
  const appColors = useAppColors();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const firstDow = startOfMonth(month).getDay();
  const maxSpend = Math.max(1, ...Object.values(dailySpending));
  const today = todayStr();

  return (
    <View>
      <View style={hm.header}>
        <Pressable onPress={() => onMonthChange(subMonths(month, 1))} hitSlop={12}><Ionicons name="chevron-back" size={17} color={appColors.labelSecondary} /></Pressable>
        <Text style={[hm.monthLabel, { color: appColors.label }]}>{format(month, 'MMMM yyyy')}</Text>
        <Pressable onPress={() => onMonthChange(addMonths(month, 1))} hitSlop={12}><Ionicons name="chevron-forward" size={17} color={appColors.labelSecondary} /></Pressable>
      </View>
      <View style={hm.dowRow}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <Text key={i} style={[hm.dow, { color: appColors.labelTertiary }]}>{d}</Text>
        ))}
      </View>
      <View style={hm.grid}>
        {Array.from({ length: firstDow }).map((_, i) => <View key={`e${i}`} style={hm.cell} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = `${format(startOfMonth(month), 'yyyy-MM')}-${String(i + 1).padStart(2,'0')}`;
          const amt = dailySpending[d] ?? 0;
          const intensity = amt > 0 ? 0.15 + 0.85 * (amt / maxSpend) : 0;
          const isToday = d === today;
          return (
            <Pressable key={d} onPress={() => onDayPress(d)}
              style={[hm.cell, { backgroundColor: amt > 0 ? hexToRgba(accentColor, intensity) : hexToRgba(accentColor, 0.05) },
                isToday && { borderWidth: 1.5, borderColor: accentColor }]}
            >
              <Text style={[hm.dayNum, { color: intensity > 0.5 ? '#fff' : appColors.labelTertiary }]}>
                {i + 1}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
const hm = StyleSheet.create({
  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  monthLabel:{ ...typography.subhead, fontWeight: '700' },
  dowRow:   { flexDirection: 'row', marginBottom: 2 },
  dow:      { flex: 1, textAlign: 'center', fontSize: 9, fontWeight: '600' },
  grid:     { flexDirection: 'row', flexWrap: 'wrap' },
  cell:     { width: `${100/7}%` as any, aspectRatio: 1, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  dayNum:   { fontSize: 10, fontWeight: '600' },
});

// ─── MiniBar chart ────────────────────────────────────────────────────────────

function MiniBarChart({ data, color }: { data: Array<{ month: string; income: number; expense: number }>; color: string }) {
  const appColors = useAppColors();
  const maxE = Math.max(1, ...data.map(d => d.expense));
  const maxI = Math.max(1, ...data.map(d => d.income));
  const maxV = Math.max(maxE, maxI);
  return (
    <View style={mb.wrap}>
      {data.map((d, i) => (
        <View key={i} style={mb.col}>
          <View style={mb.barGroup}>
            <View style={[mb.bar, { height: Math.max(2, (d.income / maxV) * 60), backgroundColor: hexToRgba('#22C55E', 0.7) }]} />
            <View style={[mb.bar, { height: Math.max(2, (d.expense / maxV) * 60), backgroundColor: hexToRgba(color, 0.75) }]} />
          </View>
          <Text style={[mb.label, { color: appColors.labelTertiary }]}>{d.month}</Text>
        </View>
      ))}
    </View>
  );
}
const mb = StyleSheet.create({
  wrap:     { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 80, paddingTop: spacing.xs },
  col:      { flex: 1, alignItems: 'center', gap: 3 },
  barGroup: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar:      { width: 6, borderRadius: 3 },
  label:    { fontSize: 9, fontWeight: '600' },
});

// ─── TxnRow ───────────────────────────────────────────────────────────────────

function TxnRow({ txn, onPress }: { txn: FinanceTransaction; onPress: () => void }) {
  const appColors = useAppColors();
  const isIncome  = txn.type === 'income';
  const isExpense = txn.type === 'expense';
  const catColor  = txn.category?.color ?? '#6B7280';
  const catIcon   = txn.category?.icon  ?? 'ellipse-outline';
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [tr.row, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={[tr.icon, { backgroundColor: hexToRgba(catColor, 0.12) }]}>
        <Ionicons name={catIcon as any} size={17} color={catColor} />
      </View>
      <View style={tr.mid}>
        <Text style={[tr.title, { color: appColors.label }]} numberOfLines={1}>{txn.title}</Text>
        <Text style={[tr.sub, { color: appColors.labelTertiary }]}>
          {txn.category?.name ?? <Text style={{ color: '#F59E0B', fontWeight: '600' }}>Uncategorized</Text>}
          {' · '}{fmtDate(txn.date)}
        </Text>
      </View>
      <Text style={[tr.amt, { color: isIncome ? '#22C55E' : isExpense ? appColors.label : appColors.labelSecondary }]}>
        {isIncome ? '+' : isExpense ? '-' : ''}{fmtMoney(Math.abs(txn.amount))}
      </Text>
    </Pressable>
  );
}
const tr = StyleSheet.create({
  row:  { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  icon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  mid:  { flex: 1, minWidth: 0 },
  title:{ fontSize: 14, fontWeight: '600', marginBottom: 1 },
  sub:  { ...typography.caption },
  amt:  { fontSize: 14, fontWeight: '700', flexShrink: 0 },
});

// ─── BudgetBar ────────────────────────────────────────────────────────────────

function BudgetBar({ label, icon, color, spent, allocated }: {
  label: string; icon: string; color: string; spent: number; allocated: number;
}) {
  const appColors = useAppColors();
  const pct = allocated > 0 ? Math.min(1, spent / allocated) : 0;
  const over = spent > allocated && allocated > 0;
  return (
    <View style={bb.row}>
      <View style={[bb.iconWrap, { backgroundColor: hexToRgba(color, 0.12) }]}>
        <Ionicons name={icon as any} size={14} color={color} />
      </View>
      <View style={bb.mid}>
        <View style={bb.topRow}>
          <Text style={[bb.name, { color: appColors.label }]} numberOfLines={1}>{label}</Text>
          <Text style={[bb.amt, { color: over ? '#EF4444' : appColors.labelSecondary }]}>
            {fmtMoney(spent)} / {fmtMoney(allocated)}
          </Text>
        </View>
        <View style={[bb.track, { backgroundColor: hexToRgba(color, 0.1) }]}>
          <View style={[bb.fill, { width: `${Math.round(pct * 100)}%`, backgroundColor: over ? '#EF4444' : color }]} />
        </View>
      </View>
    </View>
  );
}
const bb = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 7 },
  iconWrap:{ width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  mid:     { flex: 1 },
  topRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  name:    { fontSize: 13, fontWeight: '600' },
  amt:     { ...typography.caption },
  track:   { height: 5, borderRadius: 3, overflow: 'hidden' },
  fill:    { height: '100%', borderRadius: 3 },
});

// ─── TxnDetailModal ───────────────────────────────────────────────────────────

function TxnDetailModal({ txn, categories, onClose, onCategorize, onDelete }: {
  txn: FinanceTransaction | null; categories: FinanceCategory[];
  onClose: () => void; onCategorize: (id: string, catId: string) => Promise<void>; onDelete: (id: string) => Promise<void>;
}) {
  const appColors = useAppColors();
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  if (!txn) return null;
  const catColor = txn.category?.color ?? '#6B7280';

  async function doCategorize(catId: string) {
    setSaving(true);
    try { await onCategorize(txn!.id, catId); setShowPicker(false); } finally { setSaving(false); }
  }
  function doDelete() {
    Alert.alert('Delete', `Delete "${txn!.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        playTrash();
        setSaving(true);
        try { await onDelete(txn!.id); onClose(); } finally { setSaving(false); }
      }},
    ]);
  }

  return (
    <Modal visible={!!txn} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sheet.overlay} onPress={onClose} />
      <View style={[sheet.card, { backgroundColor: appColors.surface }]}>
        <View style={sheet.handle} />
        {/* Amount + title */}
        <Text style={[dm.hero, { color: txn.type === 'income' ? '#22C55E' : txn.type === 'expense' ? appColors.label : appColors.labelSecondary }]}>
          {txn.type === 'income' ? '+' : txn.type === 'expense' ? '-' : ''}{fmtMoney(Math.abs(txn.amount))}
        </Text>
        <Text style={[dm.txnTitle, { color: appColors.label }]}>{txn.title}</Text>
        <Text style={[dm.meta, { color: appColors.labelTertiary }]}>
          {fmtDate(txn.date)}{txn.account ? `  ·  ${txn.account.name}` : ''}
        </Text>

        {/* Category pill */}
        <Pressable onPress={() => setShowPicker(v => !v)}
          style={[dm.catPill, { backgroundColor: hexToRgba(catColor, 0.1), borderColor: hexToRgba(catColor, 0.3) }]}>
          <Ionicons name={(txn.category?.icon ?? 'pricetag-outline') as any} size={13} color={catColor} />
          <Text style={[dm.catPillText, { color: catColor }]}>{txn.category?.name ?? 'Uncategorized'}</Text>
          <Ionicons name={showPicker ? 'chevron-up' : 'chevron-down'} size={12} color={catColor} />
        </Pressable>

        {/* Category picker */}
        {showPicker && (
          <ScrollView style={dm.pickerScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            <View style={dm.pickerGrid}>
              {categories.map(c => (
                <Pressable key={c.id} onPress={() => doCategorize(c.id)}
                  style={[sheet.chip, { backgroundColor: hexToRgba(c.color, 0.08), borderColor: hexToRgba(c.color, 0.25) }]}>
                  <Ionicons name={c.icon as any} size={11} color={c.color} />
                  <Text style={[sheet.chipText, { color: c.color }]}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}
        {txn.notes && <Text style={[dm.notes, { color: appColors.labelSecondary }]}>{txn.notes}</Text>}

        <View style={sheet.actionRow}>
          <Pressable onPress={onClose} style={[sheet.btn, { backgroundColor: 'rgba(0,0,0,0.06)' }]}>
            <Text style={[sheet.btnText, { color: appColors.labelSecondary }]}>Close</Text>
          </Pressable>
          <Pressable onPress={doDelete} disabled={saving} style={[sheet.btn, { backgroundColor: hexToRgba('#EF4444', 0.08) }]}>
            <Text style={[sheet.btnText, { color: '#EF4444' }]}>{saving ? '…' : 'Delete'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
const dm = StyleSheet.create({
  hero:       { fontSize: 38, fontWeight: '800', letterSpacing: -1.2, textAlign: 'center', marginBottom: 4 },
  txnTitle:   { ...typography.title3, textAlign: 'center', marginBottom: 2 },
  meta:       { ...typography.caption, textAlign: 'center', marginBottom: spacing.md },
  catPill:    { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center', paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, marginBottom: spacing.sm },
  catPillText:{ ...typography.subhead },
  pickerScroll:{ maxHeight: 130, marginTop: spacing.xs },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  notes:      { ...typography.body, textAlign: 'center', marginTop: spacing.sm, fontStyle: 'italic' },
});

// ─── DayModal ─────────────────────────────────────────────────────────────────

function DayModal({ dateStr, transactions, onClose, onPressTxn }: {
  dateStr: string | null; transactions: FinanceTransaction[];
  onClose: () => void; onPressTxn: (t: FinanceTransaction) => void;
}) {
  const appColors = useAppColors();
  if (!dateStr) return null;
  const dayTxns = transactions.filter(t => t.date === dateStr && t.type === 'expense');
  const total   = dayTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
  return (
    <Modal visible={!!dateStr} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sheet.overlay} onPress={onClose} />
      <View style={[sheet.card, { backgroundColor: appColors.surface }]}>
        <View style={sheet.handle} />
        <Text style={[sheet.title, { color: appColors.label }]}>{fmtDate(dateStr)}</Text>
        <Text style={[dm.meta, { color: appColors.labelSecondary }]}>
          {dayTxns.length} expense{dayTxns.length !== 1 ? 's' : ''} · {fmtMoney(total)}
        </Text>
        {dayTxns.length === 0
          ? <Text style={[dm.meta, { color: appColors.labelTertiary }]}>No expenses on this day.</Text>
          : <ScrollView style={{ maxHeight: 260 }} nestedScrollEnabled>
              {dayTxns.map(t => <TxnRow key={t.id} txn={t} onPress={() => { onClose(); setTimeout(() => onPressTxn(t), 250); }} />)}
            </ScrollView>
        }
        <Pressable onPress={onClose} style={[sheet.btn, { backgroundColor: 'rgba(0,0,0,0.06)', marginTop: spacing.lg, alignSelf: 'center', paddingHorizontal: spacing.xxl }]}>
          <Text style={[sheet.btnText, { color: appColors.labelSecondary }]}>Close</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

// ─── UncategorizedModal ───────────────────────────────────────────────────────

function UncategorizedModal({ visible, transactions, categories, onClose, onCategorize }: {
  visible: boolean; transactions: FinanceTransaction[]; categories: FinanceCategory[];
  onClose: () => void; onCategorize: (txnId: string, catId: string) => Promise<void>;
}) {
  const appColors = useAppColors();
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const uncat = transactions.filter(t => !t.category_id);

  async function handle(txnId: string, catId: string) {
    setSaving(true);
    try { await onCategorize(txnId, catId); } finally { setSaving(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sheet.overlay} onPress={onClose} />
      <View style={[sheet.card, { backgroundColor: appColors.surface, maxHeight: '80%' }]}>
        <View style={sheet.handle} />
        <Text style={[sheet.title, { color: appColors.label }]}>Uncategorized</Text>
        {uncat.length === 0
          ? <Text style={[dm.meta, { color: '#22C55E' }]}>All caught up ✓</Text>
          : <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {uncat.map(txn => {
                const open = openId === txn.id;
                return (
                  <View key={txn.id} style={uc.item}>
                    <Pressable onPress={() => setOpenId(open ? null : txn.id)} style={uc.header}>
                      <View style={{ flex: 1 }}>
                        <Text style={[uc.title, { color: appColors.label }]} numberOfLines={1}>{txn.title}</Text>
                        <Text style={[uc.sub, { color: appColors.labelTertiary }]}>{fmtDate(txn.date)} · {fmtMoney(Math.abs(txn.amount))}</Text>
                      </View>
                      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={appColors.labelTertiary} />
                    </Pressable>
                    {open && (
                      <View style={uc.grid}>
                        {categories.map(c => (
                          <Pressable key={c.id} onPress={() => handle(txn.id, c.id)} disabled={saving}
                            style={[sheet.chip, { backgroundColor: hexToRgba(c.color, 0.08), borderColor: hexToRgba(c.color, 0.25) }]}>
                            <Ionicons name={c.icon as any} size={11} color={c.color} />
                            <Text style={[sheet.chipText, { color: c.color }]}>{c.name}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
        }
        <Pressable onPress={onClose} style={[sheet.btn, { backgroundColor: 'rgba(0,0,0,0.06)', marginTop: spacing.lg, alignSelf: 'center', paddingHorizontal: spacing.xxl }]}>
          <Text style={[sheet.btnText, { color: appColors.label }]}>Done</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
const uc = StyleSheet.create({
  item:   { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator, paddingVertical: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title:  { fontSize: 14, fontWeight: '600' },
  sub:    { ...typography.caption, marginTop: 2 },
  grid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
});

// ─── AddTransactionModal ──────────────────────────────────────────────────────

// Persisted smart-defaults (last used values across opens)
let _lastCatId  = '';
let _lastAcctId = '';

function AddTransactionModal({ visible, onClose, onAdd, accounts, categories, userColor }: {
  visible: boolean; onClose: () => void;
  onAdd: (p: FinanceService.CreateTransactionPayload) => Promise<unknown>;
  accounts: FinanceAccount[]; categories: FinanceCategory[]; userColor: string;
}) {
  const appColors = useAppColors();
  const [type,    setType]    = useState<'expense'|'income'>('expense');
  const [title,   setTitle]   = useState('');
  const [amount,  setAmount]  = useState('');
  const [date,    setDate]    = useState(todayStr);
  const [acctId,  setAcctId]  = useState(_lastAcctId);
  const [catId,   setCatId]   = useState(_lastCatId);
  const [saving,  setSaving]  = useState(false);
  const amtRef = useRef<RNTextInput>(null);

  useEffect(() => {
    if (visible) {
      setDate(todayStr());
      if (!acctId && accounts.length) setAcctId(accounts[0].id);
    }
  }, [visible, accounts]);

  function reset() { setTitle(''); setAmount(''); setSaving(false); }

  async function handleAdd() {
    const n = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (!title.trim() || isNaN(n) || n <= 0 || !acctId) return;
    setSaving(true);
    _lastCatId  = catId;
    _lastAcctId = acctId;
    try {
      await onAdd({ account_id: acctId, category_id: catId || null, title: title.trim(),
        payee: null, amount: n, type, date, notes: null,
        is_recurring: false, recurrence_rule: null, recurrence_day: null,
        transfer_account_id: null, receipt_url: null });
      reset(); onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not save.');
    } finally { setSaving(false); }
  }

  const filteredCats = categories.filter(c => c.type === type);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { onClose(); reset(); }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={sheet.overlay} onPress={() => { onClose(); reset(); }} />
        <View style={[sheet.card, { backgroundColor: appColors.surface }]}>
          <View style={sheet.handle} />
          <Text style={[sheet.title, { color: appColors.label }]}>Add Transaction</Text>

          {/* Type */}
          <View style={add.typeRow}>
            {(['expense','income'] as const).map(t => (
              <Pressable key={t} onPress={() => { setType(t); setCatId(''); }}
                style={[add.typeBtn, type === t && { backgroundColor: t === 'expense' ? hexToRgba('#EF4444', 0.12) : hexToRgba('#22C55E', 0.12), borderColor: t === 'expense' ? '#EF4444' : '#22C55E' }]}>
                <Ionicons name={t === 'expense' ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'} size={14} color={type === t ? (t === 'expense' ? '#EF4444' : '#22C55E') : appColors.labelTertiary} />
                <Text style={[add.typeBtnText, { color: type === t ? (t === 'expense' ? '#EF4444' : '#22C55E') : appColors.labelSecondary }]}>
                  {t === 'expense' ? 'Expense' : 'Income'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Amount — prominent */}
          <View style={[add.amtWrap, { borderColor: hexToRgba(userColor, 0.35) }]}>
            <Text style={[add.amtPrefix, { color: appColors.labelTertiary }]}>$</Text>
            <RNTextInput ref={amtRef} value={amount} onChangeText={setAmount}
              placeholder="0.00" placeholderTextColor={appColors.labelTertiary}
              keyboardType="decimal-pad" returnKeyType="next"
              style={[add.amtInput, { color: appColors.label }]} autoFocus />
          </View>

          {/* Title */}
          <View style={[sheet.inputRow, { borderColor: hexToRgba(userColor, 0.2) }]}>
            <RNTextInput value={title} onChangeText={setTitle}
              placeholder="Description" placeholderTextColor={appColors.labelTertiary}
              returnKeyType="done" style={[sheet.inputText, { color: appColors.label }]} />
          </View>

          {/* Date */}
          <View style={[sheet.inputRow, { borderColor: 'rgba(0,0,0,0.1)', marginBottom: spacing.md }]}>
            <Ionicons name="calendar-outline" size={14} color={appColors.labelTertiary} style={{ marginRight: 6 }} />
            <RNTextInput value={date} onChangeText={setDate}
              placeholder="YYYY-MM-DD" placeholderTextColor={appColors.labelTertiary}
              style={[sheet.inputText, { color: appColors.label }]} returnKeyType="done" />
          </View>

          {/* Account chips */}
          <Text style={[sheet.label, { color: appColors.labelTertiary }]}>Account</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', gap: 6, paddingRight: 4 }}>
              {accounts.map(a => (
                <Pressable key={a.id} onPress={() => setAcctId(a.id)}
                  style={[add.chip, acctId === a.id && { backgroundColor: hexToRgba(a.color, 0.12), borderColor: a.color }]}>
                  <Text style={[add.chipText, { color: acctId === a.id ? a.color : appColors.labelSecondary }]}>{a.name}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Category chips */}
          <Text style={[sheet.label, { color: appColors.labelTertiary }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', gap: 6, paddingRight: 4 }}>
              {filteredCats.map(c => (
                <Pressable key={c.id} onPress={() => setCatId(c.id)}
                  style={[add.chip, catId === c.id && { backgroundColor: hexToRgba(c.color, 0.12), borderColor: c.color }]}>
                  <Ionicons name={c.icon as any} size={11} color={catId === c.id ? c.color : appColors.labelTertiary} />
                  <Text style={[add.chipText, { color: catId === c.id ? c.color : appColors.labelSecondary }]}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={sheet.actionRow}>
            <Pressable onPress={() => { onClose(); reset(); }} style={[sheet.btn, { backgroundColor: 'rgba(0,0,0,0.06)' }]}>
              <Text style={[sheet.btnText, { color: appColors.labelSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleAdd} disabled={saving || !title.trim() || !amount.trim()}
              style={[sheet.btn, { backgroundColor: hexToRgba(userColor, 0.12), opacity: (saving || !title.trim() || !amount.trim()) ? 0.4 : 1 }]}>
              <Text style={[sheet.btnText, { color: userColor }]}>{saving ? 'Saving…' : 'Add'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const add = StyleSheet.create({
  typeRow:    { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  typeBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.1)', backgroundColor: 'rgba(0,0,0,0.03)' },
  typeBtnText:{ fontSize: 13, fontWeight: '700' },
  amtWrap:    { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 52, marginBottom: spacing.sm },
  amtPrefix:  { fontSize: 22, fontWeight: '700', marginRight: 4 },
  amtInput:   { flex: 1, fontSize: 26, fontWeight: '800', letterSpacing: -0.5, padding: 0 },
  chip:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  chipText:   { fontSize: 12, fontWeight: '600' },
});

// ─── CSV Import Modal ─────────────────────────────────────────────────────────

function CSVImportModal({ visible, onClose, accounts, categories, userId, userColor, onImported }: {
  visible: boolean; onClose: () => void;
  accounts: FinanceAccount[]; categories: FinanceCategory[];
  userId: string; userColor: string; onImported: () => void;
}) {
  const appColors = useAppColors();
  const [stage,    setStage]    = useState<'pick'|'preview'|'importing'|'done'>('pick');
  const [preview,  setPreview]  = useState<import('@/services/csvImport').ImportResult | null>(null);
  const [acctId,   setAcctId]   = useState('');
  const [aiCat,    setAiCat]    = useState(true);
  const [progress, setProgress] = useState('');
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (visible) { setStage('pick'); setPreview(null); setError(''); setProgress(''); }
    if (visible && accounts.length) setAcctId(accounts[0].id);
  }, [visible, accounts]);

  async function pickFile() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'public.comma-separated-values-text', '*/*'], copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const text = await FileSystem.readAsStringAsync(res.assets[0].uri);
      const parsed = parseCSV(text);
      setPreview(parsed);
      setStage('preview');
    } catch (e: any) {
      setError(e?.message ?? 'Could not read file.');
    }
  }

  async function doImport() {
    if (!preview || !acctId) return;
    setStage('importing');
    try {
      let payloads: FinanceService.CreateTransactionPayload[] = preview.transactions.map(t => ({
        account_id: acctId, category_id: null, title: t.description,
        payee: t.description, amount: t.amount, type: t.type, date: t.date,
        notes: null, is_recurring: false, recurrence_rule: null,
        recurrence_day: null, transfer_account_id: null, receipt_url: null,
      }));

      if (aiCat && categories.length) {
        setProgress('AI categorizing…');
        try {
          const txnsForAI = preview.transactions.map((t, i) => ({
            index: i, description: t.description, amount: t.amount, rawCategory: t.rawCategory ?? '',
          }));
          const aiResults = await categorizeAll(txnsForAI, categories);
          const aiMap: Record<number, string | null> = {};
          for (const r of aiResults) aiMap[r.index] = r.categoryId;
          payloads = payloads.map((p, i) => ({ ...p, category_id: aiMap[i] ?? null }));
        } catch { /* non-fatal */ }
      }

      setProgress(`Importing ${payloads.length} transactions…`);
      await FinanceService.bulkCreateTransactions(userId as any, payloads);
      setStage('done');
      onImported();
    } catch (e: any) {
      setError(e?.message ?? 'Import failed.');
      setStage('preview');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sheet.overlay} onPress={onClose} />
      <View style={[sheet.card, { backgroundColor: appColors.surface }]}>
        <View style={sheet.handle} />
        <Text style={[sheet.title, { color: appColors.label }]}>Import CSV</Text>

        {stage === 'pick' && (
          <>
            <Text style={[ci.hint, { color: appColors.labelSecondary }]}>
              Supports Chase, Amex, Bank of America, Citi, Capital One, Wells Fargo, and generic CSV.
            </Text>
            {error ? <Text style={ci.error}>{error}</Text> : null}
            <Pressable onPress={pickFile} style={[ci.pickBtn, { borderColor: hexToRgba(userColor, 0.4), backgroundColor: hexToRgba(userColor, 0.06) }]}>
              <Ionicons name="cloud-upload-outline" size={28} color={userColor} />
              <Text style={[ci.pickBtnText, { color: userColor }]}>Select CSV file</Text>
            </Pressable>
            <Pressable onPress={onClose} style={[sheet.btn, { backgroundColor: 'rgba(0,0,0,0.06)', alignSelf: 'center', paddingHorizontal: spacing.xxl, marginTop: spacing.sm }]}>
              <Text style={[sheet.btnText, { color: appColors.labelSecondary }]}>Cancel</Text>
            </Pressable>
          </>
        )}

        {stage === 'preview' && preview && (
          <>
            <View style={ci.previewCard}>
              <Text style={[ci.previewBank, { color: appColors.label }]}>{preview.bank}</Text>
              <Text style={[ci.previewCount, { color: appColors.labelSecondary }]}>
                {preview.count} transactions{preview.skipped > 0 ? ` · ${preview.skipped} skipped` : ''}
              </Text>
            </View>

            {/* Account picker */}
            <Text style={[sheet.label, { color: appColors.labelTertiary, marginTop: spacing.sm }]}>Import to account</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {accounts.map(a => (
                  <Pressable key={a.id} onPress={() => setAcctId(a.id)}
                    style={[add.chip, acctId === a.id && { backgroundColor: hexToRgba(a.color, 0.12), borderColor: a.color }]}>
                    <Text style={[add.chipText, { color: acctId === a.id ? a.color : appColors.labelSecondary }]}>{a.name}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* AI categorize toggle */}
            <Pressable onPress={() => setAiCat(v => !v)}
              style={[ci.aiRow, { backgroundColor: aiCat ? hexToRgba(userColor, 0.06) : 'rgba(0,0,0,0.03)', borderColor: aiCat ? hexToRgba(userColor, 0.3) : 'rgba(0,0,0,0.1)' }]}>
              <Ionicons name="sparkles-outline" size={16} color={aiCat ? userColor : appColors.labelTertiary} />
              <View style={{ flex: 1 }}>
                <Text style={[ci.aiLabel, { color: aiCat ? userColor : appColors.label }]}>AI auto-categorize</Text>
                <Text style={[ci.aiSub, { color: appColors.labelTertiary }]}>Uses GPT to match categories</Text>
              </View>
              <View style={[ci.toggle, { backgroundColor: aiCat ? userColor : 'rgba(0,0,0,0.15)' }]}>
                <Text style={ci.toggleText}>{aiCat ? 'On' : 'Off'}</Text>
              </View>
            </Pressable>

            {error ? <Text style={ci.error}>{error}</Text> : null}

            <View style={sheet.actionRow}>
              <Pressable onPress={() => setStage('pick')} style={[sheet.btn, { backgroundColor: 'rgba(0,0,0,0.06)' }]}>
                <Text style={[sheet.btnText, { color: appColors.labelSecondary }]}>Back</Text>
              </Pressable>
              <Pressable onPress={doImport} style={[sheet.btn, { backgroundColor: hexToRgba(userColor, 0.12) }]}>
                <Text style={[sheet.btnText, { color: userColor }]}>Import {preview.count}</Text>
              </Pressable>
            </View>
          </>
        )}

        {stage === 'importing' && (
          <View style={ci.loadingWrap}>
            <ActivityIndicator color={userColor} size="large" />
            <Text style={[ci.progressText, { color: appColors.labelSecondary }]}>{progress}</Text>
          </View>
        )}

        {stage === 'done' && (
          <>
            <View style={ci.doneWrap}>
              <Ionicons name="checkmark-circle" size={52} color="#22C55E" />
              <Text style={[ci.doneText, { color: appColors.label }]}>Import complete!</Text>
              <Text style={[ci.doneSub, { color: appColors.labelSecondary }]}>{preview?.count} transactions added</Text>
            </View>
            <Pressable onPress={onClose} style={[sheet.btn, { backgroundColor: hexToRgba(userColor, 0.12), alignSelf: 'center', paddingHorizontal: spacing.xxl, marginTop: spacing.lg }]}>
              <Text style={[sheet.btnText, { color: userColor }]}>Done</Text>
            </Pressable>
          </>
        )}
      </View>
    </Modal>
  );
}
const ci = StyleSheet.create({
  hint:        { ...typography.body, textAlign: 'center', marginBottom: spacing.lg, color: '#6B7280' },
  error:       { ...typography.subhead, color: '#EF4444', textAlign: 'center', marginBottom: spacing.sm },
  pickBtn:     { borderWidth: 2, borderStyle: 'dashed', borderRadius: radius.xl, padding: spacing.xxl, alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  pickBtnText: { ...typography.bodyEmphasis },
  previewCard: { backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginBottom: spacing.md },
  previewBank: { ...typography.bodyEmphasis },
  previewCount:{ ...typography.subhead, marginTop: 2 },
  aiRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1.5, marginBottom: spacing.sm },
  aiLabel:     { ...typography.bodyEmphasis },
  aiSub:       { ...typography.caption, marginTop: 1 },
  toggle:      { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  toggleText:  { fontSize: 11, fontWeight: '700', color: '#fff' },
  loadingWrap: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  progressText:{ ...typography.subhead },
  doneWrap:    { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  doneText:    { ...typography.title3 },
  doneSub:     { ...typography.body },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function FinanceScreen() {
  const { userId, userColor } = useUserMode();
  const appColors = useAppColors();

  const [activeTab,   setActiveTab]   = useState<TabKey>('overview');
  const [month,       setMonth]       = useState(() => startOfMonth(new Date()));
  const [selTxn,      setSelTxn]      = useState<FinanceTransaction | null>(null);
  const [dayModal,    setDayModal]    = useState<string | null>(null);
  const [showUncat,   setShowUncat]   = useState(false);
  const [showAdd,     setShowAdd]     = useState(false);
  const [showCSV,     setShowCSV]     = useState(false);

  const {
    transactions, allTxnsForBalance, loading: txnLoading,
    addTransaction, removeTransaction, refresh: refreshTxns,
    monthIncome, monthExpense, dailySpending, monthlyTotals,
  } = useTransactions(userId, month);

  const { accounts, loading: acctLoading, refresh: refreshAccounts, netWorth } = useAccounts(userId, allTxnsForBalance);
  const { categories, refresh: refreshCats } = useFinanceCategories(userId);
  const { summary: budgetSummary, loading: budgetLoading } = useBudgets(userId, month);

  useFocusEffect(useCallback(() => {
    refreshTxns(); refreshAccounts(); refreshCats();
  }, [refreshTxns, refreshAccounts, refreshCats]));

  const uncatCount = useMemo(() => transactions.filter(t => !t.category_id).length, [transactions]);

  async function handleCategorize(txnId: string, catId: string) {
    await FinanceService.updateTransaction(txnId, { category_id: catId });
    await refreshTxns();
    if (selTxn?.id === txnId) {
      const cat = categories.find(c => c.id === catId);
      setSelTxn(prev => prev ? { ...prev, category_id: catId, category: cat } : null);
    }
  }

  async function handleDelete(txnId: string) {
    await removeTransaction(txnId); setSelTxn(null);
  }

  // ── Category breakdown for overview ─────────────────────────────────────────
  const catBreakdown = useMemo(() => {
    const map: Record<string, { cat: FinanceCategory; total: number }> = {};
    for (const t of transactions) {
      if (t.type !== 'expense' || !t.category) continue;
      const id = t.category.id;
      if (!map[id]) map[id] = { cat: t.category, total: 0 };
      map[id].total += Math.abs(t.amount);
    }
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [transactions]);

  const isLoading = txnLoading || acctLoading;

  // ── Overview ─────────────────────────────────────────────────────────────────
  function OverviewTab() {
    const net = monthIncome - monthExpense;
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero summary card */}
        <View style={[ov.hero, { backgroundColor: userColor }]}>
          <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.18)']} style={StyleSheet.absoluteFill} />
          <Text style={ov.heroLabel}>Net Worth</Text>
          <Text style={ov.heroValue}>{fmtMoney(netWorth)}</Text>
          <View style={ov.heroRow}>
            <View style={ov.heroStat}>
              <Ionicons name="arrow-down-circle" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={ov.heroStatText}>{fmtMoney(monthIncome)}</Text>
              <Text style={ov.heroStatLabel}>in</Text>
            </View>
            <View style={ov.heroDivider} />
            <View style={ov.heroStat}>
              <Ionicons name="arrow-up-circle" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={ov.heroStatText}>{fmtMoney(monthExpense)}</Text>
              <Text style={ov.heroStatLabel}>out</Text>
            </View>
            <View style={ov.heroDivider} />
            <View style={ov.heroStat}>
              <Ionicons name={net >= 0 ? 'trending-up' : 'trending-down'} size={14} color="rgba(255,255,255,0.8)" />
              <Text style={ov.heroStatText}>{fmtMoney(Math.abs(net))}</Text>
              <Text style={ov.heroStatLabel}>{net >= 0 ? 'saved' : 'over'}</Text>
            </View>
          </View>
        </View>

        {/* Heatmap */}
        <GlassCard style={ov.card}>
          <View style={ov.cardHeader}>
            <Text style={[ov.cardTitle, { color: appColors.labelSecondary }]}>DAILY SPENDING</Text>
            <Text style={[ov.cardSub, { color: appColors.labelTertiary }]}>{format(month, 'MMM yyyy')}</Text>
          </View>
          <SpendingHeatmap dailySpending={dailySpending} month={month}
            onMonthChange={setMonth} onDayPress={d => setDayModal(d)} accentColor={userColor} />
        </GlassCard>

        {/* 6-month trend */}
        {monthlyTotals.length > 0 && (
          <GlassCard style={ov.card}>
            <View style={ov.cardHeader}>
              <Text style={[ov.cardTitle, { color: appColors.labelSecondary }]}>6-MONTH TREND</Text>
              <View style={ov.legend}>
                <View style={[ov.legendDot, { backgroundColor: '#22C55E' }]} /><Text style={[ov.legendText, { color: appColors.labelTertiary }]}>In</Text>
                <View style={[ov.legendDot, { backgroundColor: userColor }]} /><Text style={[ov.legendText, { color: appColors.labelTertiary }]}>Out</Text>
              </View>
            </View>
            <MiniBarChart data={monthlyTotals} color={userColor} />
          </GlassCard>
        )}

        {/* Top categories */}
        {catBreakdown.length > 0 && (
          <GlassCard style={ov.card}>
            <Text style={[ov.cardTitle, { color: appColors.labelSecondary, marginBottom: spacing.sm }]}>TOP SPENDING</Text>
            {catBreakdown.map(({ cat, total }) => (
              <View key={cat.id} style={ov.catRow}>
                <View style={[ov.catIcon, { backgroundColor: hexToRgba(cat.color, 0.12) }]}>
                  <Ionicons name={cat.icon as any} size={14} color={cat.color} />
                </View>
                <Text style={[ov.catName, { color: appColors.label }]} numberOfLines={1}>{cat.name}</Text>
                <Text style={[ov.catAmt, { color: appColors.labelSecondary }]}>{fmtMoney(total)}</Text>
              </View>
            ))}
          </GlassCard>
        )}

        {/* Recent transactions */}
        <View style={ov.cardHeader2}>
          <Text style={[ov.cardTitle, { color: appColors.labelSecondary }]}>RECENT</Text>
          {transactions.length > 5 && (
            <Pressable onPress={() => setActiveTab('transactions')}>
              <Text style={[ov.seeAll, { color: userColor }]}>See all</Text>
            </Pressable>
          )}
        </View>
        <GlassCard style={ov.card}>
          {transactions.length === 0
            ? <Text style={[ov.empty, { color: appColors.labelTertiary }]}>No transactions this month</Text>
            : transactions.slice(0, 5).map(t => <TxnRow key={t.id} txn={t} onPress={() => setSelTxn(t)} />)
          }
        </GlassCard>
      </ScrollView>
    );
  }

  // ── Transactions ─────────────────────────────────────────────────────────────
  function TransactionsTab() {
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Uncategorized banner */}
        {uncatCount > 0 && (
          <Pressable onPress={() => setShowUncat(true)}
            style={[txv.banner, { backgroundColor: hexToRgba('#F59E0B', 0.1), borderColor: hexToRgba('#F59E0B', 0.3) }]}>
            <Ionicons name="alert-circle-outline" size={15} color="#F59E0B" />
            <Text style={[txv.bannerText, { color: '#D97706' }]}>{uncatCount} uncategorized — tap to fix</Text>
            <Ionicons name="chevron-forward" size={14} color="#F59E0B" />
          </Pressable>
        )}

        {/* Month nav + summary */}
        <View style={txv.monthRow}>
          <Pressable onPress={() => setMonth(m => subMonths(m, 1))} hitSlop={10}>
            <Ionicons name="chevron-back" size={20} color={appColors.labelSecondary} />
          </Pressable>
          <Text style={[txv.monthLabel, { color: appColors.label }]}>{format(month, 'MMMM yyyy')}</Text>
          <Pressable onPress={() => setMonth(m => addMonths(m, 1))} hitSlop={10}>
            <Ionicons name="chevron-forward" size={20} color={appColors.labelSecondary} />
          </Pressable>
        </View>

        <View style={txv.summaryRow}>
          <View style={[txv.summaryChip, { backgroundColor: hexToRgba('#22C55E', 0.08) }]}>
            <Text style={[txv.summaryLabel, { color: '#22C55E' }]}>Income</Text>
            <Text style={[txv.summaryAmt, { color: '#22C55E' }]}>{fmtMoney(monthIncome)}</Text>
          </View>
          <View style={[txv.summaryChip, { backgroundColor: hexToRgba('#EF4444', 0.08) }]}>
            <Text style={[txv.summaryLabel, { color: '#EF4444' }]}>Spent</Text>
            <Text style={[txv.summaryAmt, { color: '#EF4444' }]}>{fmtMoney(monthExpense)}</Text>
          </View>
          <View style={[txv.summaryChip, { backgroundColor: hexToRgba(userColor, 0.08) }]}>
            <Text style={[txv.summaryLabel, { color: userColor }]}>Net</Text>
            <Text style={[txv.summaryAmt, { color: userColor }]}>{fmtMoney(monthIncome - monthExpense)}</Text>
          </View>
        </View>

        <GlassCard style={txv.list}>
          {transactions.length === 0
            ? <View style={txv.empty}><Ionicons name="receipt-outline" size={36} color={appColors.labelTertiary} /><Text style={[txv.emptyText, { color: appColors.labelTertiary }]}>No transactions</Text></View>
            : transactions.map(t => <TxnRow key={t.id} txn={t} onPress={() => setSelTxn(t)} />)
          }
        </GlassCard>
      </ScrollView>
    );
  }
  const txv = StyleSheet.create({
    banner:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: 10, borderRadius: radius.md, borderWidth: 1 },
    bannerText: { flex: 1, ...typography.subhead },
    monthRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
    monthLabel: { ...typography.bodyEmphasis },
    summaryRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
    summaryChip:{ flex: 1, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
    summaryLabel:{ fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
    summaryAmt: { fontSize: 14, fontWeight: '800', marginTop: 2 },
    list:       { marginHorizontal: spacing.lg, overflow: 'hidden' },
    empty:      { alignItems: 'center', padding: spacing.xxl, gap: spacing.sm },
    emptyText:  { ...typography.body },
  });

  // ── Budget (Envelope) ─────────────────────────────────────────────────────────
  function BudgetTab() {
    const totalAllocated = budgetSummary.reduce((s, b) => s + b.allocated, 0);
    const totalSpent     = budgetSummary.reduce((s, b) => s + b.spent, 0);
    const remaining      = totalAllocated - totalSpent;
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100, paddingTop: spacing.md }}>
        {/* Envelope header */}
        <GlassCard style={bv.summaryCard}>
          <View style={bv.summaryRow}>
            <View style={bv.summaryItem}>
              <Text style={[bv.summaryVal, { color: appColors.label }]}>{fmtMoney(totalAllocated)}</Text>
              <Text style={[bv.summaryKey, { color: appColors.labelTertiary }]}>Budgeted</Text>
            </View>
            <View style={bv.summaryDivider} />
            <View style={bv.summaryItem}>
              <Text style={[bv.summaryVal, { color: '#EF4444' }]}>{fmtMoney(totalSpent)}</Text>
              <Text style={[bv.summaryKey, { color: appColors.labelTertiary }]}>Spent</Text>
            </View>
            <View style={bv.summaryDivider} />
            <View style={bv.summaryItem}>
              <Text style={[bv.summaryVal, { color: remaining >= 0 ? '#22C55E' : '#EF4444' }]}>{fmtMoney(Math.abs(remaining))}</Text>
              <Text style={[bv.summaryKey, { color: appColors.labelTertiary }]}>{remaining >= 0 ? 'Left' : 'Over'}</Text>
            </View>
          </View>
          {/* Full-width progress bar */}
          <View style={[bv.totalTrack, { backgroundColor: hexToRgba(userColor, 0.1) }]}>
            <View style={[bv.totalFill, { width: `${Math.min(100, totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0)}%`, backgroundColor: totalSpent > totalAllocated ? '#EF4444' : userColor }]} />
          </View>
        </GlassCard>

        <Text style={[bv.sectionLabel, { color: appColors.labelSecondary }]}>ENVELOPES  ·  {format(month, 'MMM yyyy')}</Text>

        {budgetLoading ? (
          <ActivityIndicator color={userColor} style={{ marginTop: spacing.xl }} />
        ) : budgetSummary.length === 0 ? (
          <View style={{ alignItems: 'center', padding: spacing.xxl, gap: spacing.sm }}>
            <Ionicons name="albums-outline" size={40} color={appColors.labelTertiary} />
            <Text style={{ ...typography.body, color: appColors.labelTertiary, textAlign: 'center' }}>
              No budget envelopes yet.{'\n'}Add budget goals to your categories.
            </Text>
          </View>
        ) : (
          <GlassCard style={bv.envelopesCard}>
            {budgetSummary.map((b, i) => (
              <View key={b.category_id}>
                {i > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }} />}
                <BudgetBar
                  label={b.category.name} icon={b.category.icon}
                  color={b.category.color} spent={b.spent} allocated={b.allocated + b.rollover}
                />
              </View>
            ))}
          </GlassCard>
        )}
      </ScrollView>
    );
  }
  const bv = StyleSheet.create({
    summaryCard:   { marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.md + 4 },
    summaryRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
    summaryItem:   { flex: 1, alignItems: 'center' },
    summaryDivider:{ width: StyleSheet.hairlineWidth, height: 32, backgroundColor: colors.separator },
    summaryVal:    { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
    summaryKey:    { ...typography.caption, marginTop: 2 },
    totalTrack:    { height: 6, borderRadius: 3, overflow: 'hidden' },
    totalFill:     { height: '100%', borderRadius: 3 },
    sectionLabel:  { ...typography.caption, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginHorizontal: spacing.lg, marginBottom: spacing.sm },
    envelopesCard: { marginHorizontal: spacing.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  });

  // ── Accounts ─────────────────────────────────────────────────────────────────
  function AccountsTab() {
    const checking = accounts.filter(a => a.type === 'checking' || a.type === 'savings' || a.type === 'cash');
    const credit   = accounts.filter(a => a.type === 'credit');
    const invest   = accounts.filter(a => a.type === 'investment');
    function Group({ title, items }: { title: string; items: FinanceAccount[] }) {
      if (!items.length) return null;
      const total = items.reduce((s, a) => s + (a.type === 'credit' ? -a.balance : a.balance), 0);
      return (
        <>
          <View style={av.groupHeader}>
            <Text style={[av.groupTitle, { color: appColors.labelSecondary }]}>{title.toUpperCase()}</Text>
            <Text style={[av.groupTotal, { color: total < 0 ? '#EF4444' : appColors.labelSecondary }]}>{fmtMoney(total)}</Text>
          </View>
          <GlassCard style={av.groupCard}>
            {items.map((a, i) => {
              const isCredit = a.type === 'credit';
              return (
                <View key={a.id}>
                  {i > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }} />}
                  <View style={av.row}>
                    <View style={[av.icon, { backgroundColor: hexToRgba(a.color, 0.12) }]}>
                      <Ionicons name={(a.icon || 'wallet-outline') as any} size={18} color={a.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[av.name, { color: appColors.label }]}>{a.name}</Text>
                      <Text style={[av.type, { color: appColors.labelTertiary }]}>
                        {a.type.charAt(0).toUpperCase() + a.type.slice(1)}
                      </Text>
                    </View>
                    <Text style={[av.bal, { color: isCredit ? '#EF4444' : a.color }]}>
                      {isCredit ? '-' : ''}{fmtMoney(Math.abs(a.balance))}
                    </Text>
                  </View>
                </View>
              );
            })}
          </GlassCard>
        </>
      );
    }
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100, paddingTop: spacing.md }}>
        {/* Net worth hero */}
        <GlassCard style={[av.nwCard, { borderColor: hexToRgba(userColor, 0.25) }]}>
          <LinearGradient colors={[hexToRgba(userColor, 0.06), 'transparent']} style={StyleSheet.absoluteFill} />
          <Text style={[av.nwLabel, { color: appColors.labelSecondary }]}>Net Worth</Text>
          <Text style={[av.nwVal, { color: netWorth >= 0 ? userColor : '#EF4444' }]}>{fmtMoney(netWorth)}</Text>
        </GlassCard>
        <Group title="Cash & Savings" items={checking} />
        <Group title="Credit Cards"   items={credit} />
        <Group title="Investments"    items={invest} />
        {accounts.length === 0 && (
          <View style={{ alignItems: 'center', padding: spacing.xxl, gap: spacing.sm }}>
            <Ionicons name="wallet-outline" size={40} color={appColors.labelTertiary} />
            <Text style={{ ...typography.body, color: appColors.labelTertiary }}>No accounts yet</Text>
          </View>
        )}
      </ScrollView>
    );
  }
  const av = StyleSheet.create({
    nwCard:     { marginHorizontal: spacing.lg, marginBottom: spacing.lg, padding: spacing.lg, alignItems: 'center', borderWidth: 1, overflow: 'hidden' },
    nwLabel:    { ...typography.caption, letterSpacing: 0.5 },
    nwVal:      { fontSize: 34, fontWeight: '800', letterSpacing: -1, marginTop: 4 },
    groupHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.xs, marginTop: spacing.sm },
    groupTitle: { ...typography.caption, fontWeight: '700', letterSpacing: 0.6 },
    groupTotal: { ...typography.subhead },
    groupCard:  { marginHorizontal: spacing.lg, marginBottom: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
    row:        { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 10 },
    icon:       { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    name:       { fontSize: 14, fontWeight: '600' },
    type:       { ...typography.caption, marginTop: 1 },
    bal:        { fontSize: 15, fontWeight: '800' },
  });

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: appColors.surface }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: appColors.surface }]}>
        <View style={s.headerLeft}>
          <LinearGradient colors={[userColor, userColor + 'BB']} style={s.badge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="wallet" size={17} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={[s.headerTitle, { color: appColors.label }]}>Finance</Text>
            <Text style={[s.headerSub, { color: appColors.labelTertiary }]}>{format(month, 'MMMM yyyy')}</Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <Pressable onPress={() => setShowCSV(true)} style={s.iconBtn} hitSlop={8}>
            <Ionicons name="cloud-upload-outline" size={19} color={appColors.labelSecondary} />
          </Pressable>
          <Pressable onPress={() => setShowAdd(true)} style={[s.addBtn, { backgroundColor: userColor }]} hitSlop={8}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={s.addBtnText}>Add</Text>
          </Pressable>
        </View>
      </View>

      <InnerTabs active={activeTab} onChange={setActiveTab} color={userColor} />

      <View style={[s.content, { backgroundColor: appColors.background }]}>
        {isLoading
          ? <View style={s.loader}><ActivityIndicator color={userColor} size="large" /></View>
          : <>
              {activeTab === 'overview'     && <OverviewTab />}
              {activeTab === 'transactions' && <TransactionsTab />}
              {activeTab === 'budget'       && <BudgetTab />}
              {activeTab === 'accounts'     && <AccountsTab />}
            </>
        }
      </View>

      <TxnDetailModal txn={selTxn} categories={categories} onClose={() => setSelTxn(null)} onCategorize={handleCategorize} onDelete={handleDelete} />
      <DayModal dateStr={dayModal} transactions={transactions} onClose={() => setDayModal(null)} onPressTxn={t => setSelTxn(t)} />
      <UncategorizedModal visible={showUncat} transactions={transactions} categories={categories} onClose={() => setShowUncat(false)} onCategorize={handleCategorize} />
      <AddTransactionModal visible={showAdd} onClose={() => setShowAdd(false)} onAdd={addTransaction} accounts={accounts} categories={categories} userColor={userColor} />
      <CSVImportModal visible={showCSV} onClose={() => setShowCSV(false)} accounts={accounts} categories={categories} userId={userId} userColor={userColor} onImported={refreshTxns} />
    </SafeAreaView>
  );
}

const ov = StyleSheet.create({
  hero:       { marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: radius.xl, padding: spacing.xl, overflow: 'hidden' },
  heroLabel:  { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  heroValue:  { color: '#fff', fontSize: 36, fontWeight: '800', letterSpacing: -1.2, marginBottom: spacing.md },
  heroRow:    { flexDirection: 'row', alignItems: 'center' },
  heroStat:   { flex: 1, alignItems: 'center', gap: 2 },
  heroDivider:{ width: StyleSheet.hairlineWidth, height: 28, backgroundColor: 'rgba(255,255,255,0.3)' },
  heroStatText:{ color: '#fff', fontSize: 13, fontWeight: '700' },
  heroStatLabel:{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '600' },
  card:       { marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  cardHeader2:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.xs },
  cardTitle:  { ...typography.caption, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase' },
  cardSub:    { ...typography.caption },
  legend:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...typography.caption, marginRight: 6 },
  catRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  catIcon:    { width: 28, height: 28, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  catName:    { flex: 1, fontSize: 13, fontWeight: '600' },
  catAmt:     { fontSize: 13, fontWeight: '700' },
  seeAll:     { ...typography.subhead },
  empty:      { ...typography.body, textAlign: 'center', padding: spacing.xl },
});

const s = StyleSheet.create({
  safe:        { flex: 1 },
  content:     { flex: 1 },
  loader:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge:       { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSub:   { ...typography.caption, marginTop: 1 },
  iconBtn:     { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  addBtn:      { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: spacing.sm + 2, paddingVertical: 6, borderRadius: radius.full },
  addBtnText:  { fontSize: 13, fontWeight: '700', color: '#fff' },
});
