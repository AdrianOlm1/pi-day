import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  View, ScrollView, StyleSheet, ActivityIndicator, Pressable, Animated, TextInput, Platform,
} from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '@/contexts/ThemeContext';
import { useOrders } from '@/hooks/useOrders';
import { useOrderReminderSettings } from '@/hooks/useOrderReminderSettings';
import { rescheduleAllOrderReminders } from '@/services/notifications';
import { OrderCard } from '@/components/orders/OrderCard';
import { OrderForm } from '@/components/orders/OrderForm';
import { OrderDetailSheet } from '@/components/orders/OrderDetailSheet';
import { OrderStatsSheet } from '@/components/orders/OrderStatsSheet';
import { Sheet } from '@/components/ui/Sheet';
import { playMenuOpen } from '@/utils/sounds';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Order, OrderStatus } from '@/types';
import { spacing, typography, colors, radius, shadows } from '@/theme';

type FilterStatus = 'All' | OrderStatus;
const FILTERS: FilterStatus[] = ['All', 'Pending', 'In Progress', 'Complete'];

/** Distinct colors for order status (stat pills + filter chips). Matches OrderDetailSheet / OrderForm. */
const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  Pending:       '#F59E0B', // amber
  'In Progress': '#3B82F6', // blue
  Complete:      '#22C55E', // green
};

type ListMode = 'active' | 'archived';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 84 : 64;

function getStatusColor(status: FilterStatus): string {
  if (status === 'All') return colors.info;
  return ORDER_STATUS_COLORS[status];
}

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
  const appColors = useAppColors();
  const router = useRouter();
  const { orderId: orderIdParam } = useLocalSearchParams<{ orderId?: string }>();
  const { orders, loading, refresh, addOrder, editOrder, changeStatus, remove, archiveOrder } = useOrders();
  const { settings: orderReminderSettings, loading: orderRemindersLoading } = useOrderReminderSettings();
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [listMode, setListMode] = useState<ListMode>('active');
  const [filter, setFilter] = useState<FilterStatus>('All');
  const [archivedSearch, setArchivedSearch] = useState('');
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
  const archivedOrders = orders.filter((o) => !!o.archived);
  const pending    = activeOrders.filter((o) => o.status === 'Pending').length;
  const inProgress = activeOrders.filter((o) => o.status === 'In Progress').length;
  const complete   = activeOrders.filter((o) => o.status === 'Complete').length;

  const filteredActive = filter === 'All' ? activeOrders : activeOrders.filter((o) => o.status === filter);
  const searchLower = archivedSearch.trim().toLowerCase();
  const filteredArchived = useMemo(
    () =>
      searchLower
        ? archivedOrders.filter(
            (o) =>
              o.customer_name.toLowerCase().includes(searchLower) ||
              o.description.toLowerCase().includes(searchLower) ||
              (o.design_notes && o.design_notes.toLowerCase().includes(searchLower)),
          )
        : archivedOrders,
    [archivedOrders, searchLower],
  );
  const displayList = listMode === 'archived' ? filteredArchived : filteredActive;

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

      {/* Order banner — only themed area */}
      <View style={[s.header, { backgroundColor: appColors.surface, borderBottomColor: appColors.separator }]}>
        <View style={s.headerLeft}>
          <View style={[s.iconBadge, { backgroundColor: appColors.gradientFrom + '14' }]}>
            <Ionicons name="reader" size={20} color={appColors.gradientFrom} />
          </View>
          <Text style={[s.title, { color: appColors.label }]}>Orders</Text>
        </View>
        <View style={s.headerRight}>
          <Pressable onPress={() => { playMenuOpen(); setShowOrderStats(true); }} hitSlop={8} style={s.statsBtn}>
            <Ionicons name="bar-chart-outline" size={20} color={colors.labelSecondary} />
          </Pressable>
        </View>
      </View>

      <View style={[s.contentWrap, { backgroundColor: colors.background }]}>
      {/* Stats */}
      <View style={[s.statsRow, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
        <StatPill label="Pending"     count={pending}    color={getStatusColor('Pending')}     labelColor={colors.labelSecondary} />
        <StatPill label="In Progress" count={inProgress} color={getStatusColor('In Progress')} labelColor={colors.labelSecondary} />
        <StatPill label="Complete"    count={complete}   color={getStatusColor('Complete')}    labelColor={colors.labelSecondary} />
      </View>

      {/* Mode tabs */}
      <View style={[s.modeRow, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
        {(['active', 'archived'] as ListMode[]).map((mode) => {
          const active = listMode === mode;
          const modeColor = mode === 'active' ? colors.info : colors.labelSecondary;
          return (
            <Pressable
              key={mode}
              onPress={() => setListMode(mode)}
              style={[s.modeTab, active && [s.modeTabActive, { borderBottomColor: modeColor }]]}
            >
              <Ionicons
                name={mode === 'active' ? 'list-outline' : 'archive-outline'}
                size={16}
                color={active ? modeColor : colors.labelTertiary}
              />
              <Text style={[s.modeTabText, active && { color: modeColor, fontWeight: '700' }]}>
                {mode === 'active' ? 'Active' : 'Archived'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Filter pills (Active) or Search (Archived) */}
      {listMode === 'active' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[s.filterScroll, { backgroundColor: colors.surface }]}
          contentContainerStyle={[s.filterContent, { borderBottomColor: colors.separator }]}
        >
          {FILTERS.map((f) => {
            const active = filter === f;
            const fColor = getStatusColor(f);
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[
                  s.filterChip,
                  { backgroundColor: colors.fillSecondary, borderColor: colors.separator },
                  active && { backgroundColor: fColor + '14', borderColor: fColor },
                ]}
              >
                <Text style={[s.filterText, active && { color: fColor, fontWeight: '700' }]}>{f}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      {listMode === 'archived' && (
        <View style={[s.searchRow, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
          <View style={[s.searchWrap, { backgroundColor: colors.fillSecondary, borderColor: colors.separator }]}>
            <Ionicons name="search-outline" size={18} color={colors.labelTertiary} />
            <TextInput
              style={[s.searchInput, { color: colors.label }]}
              placeholder="Search archived orders..."
              placeholderTextColor={colors.labelTertiary}
              value={archivedSearch}
              onChangeText={setArchivedSearch}
              returnKeyType="search"
            />
            {archivedSearch.length > 0 && (
              <Pressable onPress={() => setArchivedSearch('')} hitSlop={8} style={s.clearSearch}>
                <Ionicons name="close-circle" size={18} color={colors.labelTertiary} />
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={s.loadingBox}><ActivityIndicator color={colors.info} /></View>
      ) : displayList.length === 0 ? (
        <EmptyState
          icon={listMode === 'archived' ? 'archive-outline' : 'reader-outline'}
          title={
            listMode === 'archived' && archivedSearch.trim()
              ? 'No matches'
              : listMode === 'archived'
                ? 'No archived orders'
                : 'No orders yet'
          }
          subtitle={
            listMode === 'archived' && archivedSearch.trim()
              ? 'Try a different search.'
              : listMode === 'archived'
                ? 'Archive completed orders to see them here.'
                : 'Tap + to add your first order.'
          }
          color={colors.info}
        />
      ) : (
        <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
          {displayList.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onSelect={setSelectedOrder}
              onChangeStatus={changeStatus}
              onDelete={remove}
              onEdit={openEdit}
              onArchive={archiveOrder}
              isArchived={listMode === 'archived'}
            />
          ))}
          <View style={{ height: 110 }} />
        </ScrollView>
      )}

      {/* FAB */}
      {listMode === 'active' && (
        <Pressable onPressIn={fabPressIn} onPressOut={fabPressOut} onPress={() => setShowForm(true)} style={[s.fabWrap, { bottom: 20 }]}>
          <Animated.View style={[s.fab, { backgroundColor: colors.info, transform: [{ scale: fabScale }] }]}>
            <Ionicons name="add" size={28} color="#fff" />
          </Animated.View>
        </Pressable>
      )}

      <Sheet visible={showForm} onClose={handleClose} heightFraction={0.92}>
        <OrderForm initial={editingOrder ?? undefined} onSave={handleSave} onCancel={handleClose} accentColor={colors.info} />
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
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  filterScroll: { maxHeight: 48 },
  filterContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  filterText: { ...typography.subhead, color: colors.labelSecondary },
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
