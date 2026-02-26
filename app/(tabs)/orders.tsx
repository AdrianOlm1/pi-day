import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  View, ScrollView, StyleSheet, ActivityIndicator, Pressable, Animated, TextInput, Platform,
} from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOrders } from '@/hooks/useOrders';
import { useOrderReminderSettings } from '@/hooks/useOrderReminderSettings';
import { rescheduleAllOrderReminders } from '@/services/notifications';
import { OrderCard } from '@/components/orders/OrderCard';
import { OrderForm } from '@/components/orders/OrderForm';
import { OrderDetailSheet } from '@/components/orders/OrderDetailSheet';
import { OrderStatsSheet } from '@/components/orders/OrderStatsSheet';
import { Sheet } from '@/components/ui/Sheet';
import Reanimated from 'react-native-reanimated';
import { FadeInDown } from 'react-native-reanimated';
import { playMenuOpen } from '@/utils/sounds';
import { hapticMedium } from '@/utils/haptics';
import { EmptyState } from '@/components/ui/EmptyState';
import { EMPTY_ORDERS, EMPTY_ORDERS_ARCHIVED } from '@/utils/emptyStateMessages';
import { getComfortLineForTab } from '@/utils/greetings';
import type { Order } from '@/types';
import { spacing, typography, colors, radius, shadows } from '@/theme';
import { parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

/** Orders tab has its own theme — blue/green/yellow pills, purple accent */
const IN_PROGRESS_COLOR = '#3B82F6';
const COMPLETED_THIS_WEEK_GREEN = '#22C55E';
const COMPLETED_THIS_MONTH_YELLOW = '#EAB308';
const ORDERS_ACCENT = '#6366F1';

type ListMode = 'active' | 'archived';

function StatPill({ label, count, color, labelColor }: { label: string; count: number; color: string; labelColor: string }) {
  return (
    <View style={[pill.wrap, { backgroundColor: color + '10', borderColor: color + '30' }]}>
      <Text style={[pill.count, { color }]}>{count}</Text>
      <Text style={[pill.label, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

const pill = StyleSheet.create({
  wrap: { flex: 1, borderWidth: 1, borderRadius: radius.lg, alignItems: 'center', paddingVertical: spacing.md },
  count: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  label: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});

export default function OrdersScreen() {
  const router = useRouter();
  const { orderId: orderIdParam } = useLocalSearchParams<{ orderId?: string }>();
  const { orders, loading, refresh, addOrder, editOrder, changeStatus, remove, archiveOrder } = useOrders();
  const { settings: orderReminderSettings, loading: orderRemindersLoading } = useOrderReminderSettings();
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [listMode, setListMode] = useState<ListMode>('active');
  const [completedSearch, setCompletedSearch] = useState('');
  const [showOrderStats, setShowOrderStats] = useState(false);
  const fabScale = useRef(new Animated.Value(1)).current;

  useFocusEffect(useCallback(() => { refresh(); }, []));

  // Reschedule order reminders when orders or reminder settings change
  useEffect(() => {
    if (orderRemindersLoading) return;
    rescheduleAllOrderReminders(orders, orderReminderSettings).catch(() => {});
  }, [orders, orderRemindersLoading, orderReminderSettings.dailyReminder, orderReminderSettings.dailyReminderTime, orderReminderSettings.weekAfterCreate, orderReminderSettings.onDueDate, orderReminderSettings.monthlyRecap]);

  // Open order detail when navigated from home with orderId
  useFocusEffect(
    useCallback(() => {
      if (!orderIdParam || !orders.length) return;
      const order = orders.find((o) => o.id === orderIdParam);
      if (order) {
        setSelectedOrder(order);
        router.replace('/(tabs)/orders');
      }
    }, [orderIdParam, orders]),
  );

  const activeOrders = orders.filter((o) => !o.archived);
  const completedOrders = orders.filter((o) => !!o.archived);
  const inProgressCount = activeOrders.filter((o) => o.status === 'In Progress' || o.status === 'Pending').length;

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const completedThisWeek = completedOrders.filter((o) => {
    try {
      const d = parseISO(o.updated_at);
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    } catch {
      return false;
    }
  }).length;
  const completedThisMonth = completedOrders.filter((o) => {
    try {
      const d = parseISO(o.updated_at);
      return isWithinInterval(d, { start: monthStart, end: monthEnd });
    } catch {
      return false;
    }
  }).length;

  const filteredActive = activeOrders.filter((o) => o.status === 'In Progress' || o.status === 'Pending');
  const searchLower = completedSearch.trim().toLowerCase();
  const filteredCompleted = useMemo(
    () =>
      searchLower
        ? completedOrders.filter(
            (o) =>
              o.customer_name.toLowerCase().includes(searchLower) ||
              o.description.toLowerCase().includes(searchLower) ||
              (o.design_notes && o.design_notes.toLowerCase().includes(searchLower)),
          )
        : completedOrders,
    [completedOrders, searchLower],
  );
  const displayList = listMode === 'archived' ? filteredCompleted : filteredActive;

  async function handleSave(data: Omit<Order, 'id' | 'created_at' | 'updated_at'>) {
    if (editingOrder) await editOrder(editingOrder.id, data);
    else await addOrder(data);
    setShowForm(false);
    setEditingOrder(null);
  }

  function openEdit(order: Order) { setEditingOrder(order); setShowForm(true); }
  function handleClose() { setShowForm(false); setEditingOrder(null); }

  const fabPressIn = () => Animated.spring(fabScale, { toValue: 0.90, useNativeDriver: true, damping: 20, stiffness: 400 }).start();
  const fabPressOut = () => Animated.spring(fabScale, { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 280 }).start();

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.surface }]} edges={['top']}>
      <OrderStatsSheet visible={showOrderStats} onClose={() => setShowOrderStats(false)} />

      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
        <View style={s.headerLeft}>
          <View style={[s.iconBadge, { backgroundColor: ORDERS_ACCENT + '14' }]}>
            <Ionicons name="reader" size={20} color={ORDERS_ACCENT} />
          </View>
          <View>
            <Text style={[s.title, { color: colors.label }]}>Orders</Text>
            <Text style={[s.headerComfort, { color: colors.labelTertiary }]}>{getComfortLineForTab('orders', new Date().toISOString().slice(0, 10))}</Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <Pressable onPress={() => { playMenuOpen(); setShowOrderStats(true); }} hitSlop={8} style={s.statsBtn}>
            <Ionicons name="bar-chart-outline" size={20} color={colors.labelSecondary} />
          </Pressable>
        </View>
      </View>

      <View style={[s.contentWrap, { backgroundColor: colors.background }]}>
      <View style={[s.statsWrap, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
        <View style={s.statsRow}>
          <StatPill label="In progress" count={inProgressCount} color={IN_PROGRESS_COLOR} labelColor={colors.labelSecondary} />
          <StatPill label="Completed(Week)" count={completedThisWeek} color={COMPLETED_THIS_WEEK_GREEN} labelColor={colors.labelSecondary} />
          <StatPill label="Completed(Month)" count={completedThisMonth} color={COMPLETED_THIS_MONTH_YELLOW} labelColor={colors.labelSecondary} />
        </View>
      </View>

      <View style={[s.modeRow, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
        {(['active', 'archived'] as ListMode[]).map((mode) => {
          const active = listMode === mode;
          const modeColor = mode === 'active' ? colors.info : COMPLETED_THIS_WEEK_GREEN;
          return (
            <Pressable
              key={mode}
              onPress={() => setListMode(mode)}
              style={[s.modeTab, active && [s.modeTabActive, { borderBottomColor: modeColor }]]}
            >
              <Ionicons
                name={mode === 'active' ? 'list-outline' : 'checkmark-done-outline'}
                size={16}
                color={active ? modeColor : colors.labelTertiary}
              />
              <Text style={[s.modeTabText, active && { color: modeColor, fontWeight: '700' }]}>
                {mode === 'active' ? 'In Progress' : 'Completed'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {listMode === 'archived' && (
        <View style={[s.searchRow, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
          <View style={[s.searchWrap, { backgroundColor: colors.fillSecondary, borderColor: colors.separator }]}>
            <Ionicons name="search-outline" size={18} color={colors.labelTertiary} />
            <TextInput
              style={[s.searchInput, { color: colors.label }]}
              placeholder="Search completed orders..."
              placeholderTextColor={colors.labelTertiary}
              value={completedSearch}
              onChangeText={setCompletedSearch}
              returnKeyType="search"
            />
            {completedSearch.length > 0 && (
              <Pressable onPress={() => setCompletedSearch('')} hitSlop={8} style={s.clearSearch}>
                <Ionicons name="close-circle" size={18} color={colors.labelTertiary} />
              </Pressable>
            )}
          </View>
        </View>
      )}

      {loading ? (
        <View style={s.loadingBox}><ActivityIndicator color={ORDERS_ACCENT} /></View>
      ) : displayList.length === 0 ? (
        <EmptyState
          icon={listMode === 'archived' ? 'archive-outline' : 'reader-outline'}
          {...(listMode === 'archived' && completedSearch.trim()
            ? { title: 'No matches', subtitle: 'Try a different search.' }
            : listMode === 'archived'
              ? { messages: EMPTY_ORDERS_ARCHIVED }
              : { messages: EMPTY_ORDERS }
          )}
          showComfortLine
          color={ORDERS_ACCENT}
        />
      ) : (
        <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
          {displayList.map((order, idx) => (
            <Reanimated.View key={order.id} entering={FadeInDown.delay(idx * 50).duration(260)}>
              <OrderCard
                order={order}
                onSelect={setSelectedOrder}
                onChangeStatus={changeStatus}
                onDelete={remove}
                onEdit={openEdit}
                onArchive={archiveOrder}
                isArchived={listMode === 'archived'}
              />
            </Reanimated.View>
          ))}
          <View style={{ height: 110 }} />
        </ScrollView>
      )}

      {/* FAB */}
      {listMode === 'active' && (
        <Pressable
          onPressIn={fabPressIn}
          onPressOut={fabPressOut}
          onPress={() => {
            hapticMedium();
            setShowForm(true);
          }}
          style={[s.fabWrap, { bottom: 20 }]}
        >
          <Animated.View style={[s.fab, { backgroundColor: ORDERS_ACCENT, transform: [{ scale: fabScale }] }]}>
            <Ionicons name="add" size={28} color="#fff" />
          </Animated.View>
        </Pressable>
      )}

      <Sheet visible={showForm} onClose={handleClose} heightFraction={0.92}>
        <OrderForm initial={editingOrder ?? undefined} onSave={handleSave} onCancel={handleClose} accentColor={ORDERS_ACCENT} />
      </Sheet>

      {selectedOrder ? (
        <OrderDetailSheet
          order={orders.find((o) => o.id === selectedOrder.id) ?? selectedOrder}
          visible={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onEdit={(order) => { setSelectedOrder(null); openEdit(order); }}
          onDelete={remove}
          onChangeStatus={changeStatus}
          onArchive={archiveOrder}
          isArchived={listMode === 'archived'}
        />
      ) : null}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  contentWrap: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBadge: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title3, color: colors.label },
  headerComfort: { ...typography.caption, fontStyle: 'italic', marginTop: 2 },
  statsWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statsBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  modeRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modeTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    paddingVertical: spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  modeTabActive: {},
  modeTabText: { ...typography.subhead, color: colors.labelTertiary },
  searchRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    paddingVertical: 4,
  },
  clearSearch: { padding: 2 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  list: { padding: spacing.lg },
  fabWrap: { position: 'absolute', right: spacing.xl },
  fab: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22, shadowRadius: 16, elevation: 10,
  },
});
