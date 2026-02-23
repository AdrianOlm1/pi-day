import React, { useMemo, useRef, useState, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, ActivityIndicator, Animated, Pressable, Modal,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserMode } from '@/contexts/UserModeContext';
import { useAppColors } from '@/contexts/ThemeContext';
import { useEvents } from '@/hooks/useEvents';
import { useTodos } from '@/hooks/useTodos';
import { useOrders } from '@/hooks/useOrders';
import { TodayEvents } from '@/components/today/TodayEvents';
import { TodoSection } from '@/components/todo/TodoSection';
import { UserToggle } from '@/components/ui/UserToggle';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { SettingsSheet } from '@/components/settings/SettingsSheet';
import { ACBackgroundStatic } from '@/components/ui/ACBackground';
import { formatDisplayDate, formatDate } from '@/utils/date';
import { playMenuOpen, playMenuClose, playCheck } from '@/utils/sounds';
import { startOfDay, endOfDay, differenceInCalendarDays, parseISO } from 'date-fns';
import { spacing, typography, colors, radius, shadows } from '@/theme';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 84 : 64;
const ORDERS_ACCENT = '#6366F1';

function getOrderDaysLeft(dueDateStr: string, today: Date): number {
  try {
    const due = startOfDay(parseISO(dueDateStr));
    return differenceInCalendarDays(due, today);
  } catch {
    return 0;
  }
}

function getOrderDaysLabel(daysLeft: number): string {
  if (daysLeft < 0) return `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} overdue`;
  if (daysLeft === 0) return 'Due today';
  return `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'night owl';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { userId, userColor, userName } = useUserMode();
  const appColors = useAppColors();
  const router = useRouter();
  const { getOccurrencesByRange, loading: evLoading, refresh: refreshEvents } = useEvents();
  const { todos, addTodo, toggle, remove, refresh: refreshTodos } = useTodos();
  const { orders, refresh: refreshOrders } = useOrders();

  const [showSettings, setShowSettings] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState(() => new Date());
  const [newTaskDueTime, setNewTaskDueTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    React.useCallback(() => {
      refreshEvents();
      refreshTodos();
      refreshOrders();
      Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      return () => { headerAnim.setValue(0); };
    }, [])
  );

  const today = new Date();
  const todayKey = formatDate(today);

  const dailyTasks = useMemo(
    () => todos.filter((t) => (t.owner === userId || t.owner === 'shared') && t.due_date === todayKey),
    [todos, userId, todayKey],
  );

  async function handleAddTask() {
    const title = newTaskTitle.trim();
    if (!title) return;
    const dueDateKey = formatDate(newTaskDueDate);
    const dueTimeFormatted = newTaskDueTime
      ? `${String(newTaskDueTime.getHours()).padStart(2, '0')}:${String(newTaskDueTime.getMinutes()).padStart(2, '0')}:00`
      : null;
    try {
      await addTodo(userId, title, dueDateKey, dueTimeFormatted);
      setNewTaskTitle('');
      setNewTaskDueDate(new Date());
      setNewTaskDueTime(null);
      setShowAddTaskModal(false);
    } catch (e: any) {
      const message = e?.message ?? 'Could not add task';
      Alert.alert('Error', message);
    }
  }

  function openAddTaskModal() {
    setNewTaskDueDate(new Date());
    setNewTaskDueTime(null);
    setShowAddTaskModal(true);
  }
  const todayOccurrences = useMemo(() => {
    const byDate = getOccurrencesByRange(startOfDay(today), endOfDay(today));
    const all = byDate[todayKey] ?? [];
    // Only show schedule for current user and shared events
    return all.filter(
      (ev) => ev.user_id === userId || ev.type === 'shared',
    );
  }, [getOccurrencesByRange, todayKey, userId]);

  const upcomingOrders = useMemo(() => {
    const active = orders.filter((o) => !o.archived && o.due_date);
    return active
      .map((o) => ({ order: o, daysLeft: getOrderDaysLeft(o.due_date!, today) }))
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 8);
  }, [orders, today]);

  const headerOpacity = headerAnim;
  const headerTranslate = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: appColors.background }]} edges={['top']}>
      {/* AC tiled background texture */}
      <ACBackgroundStatic />

      {/* Settings Sheet */}
      <SettingsSheet visible={showSettings} onClose={() => { playMenuClose(); setShowSettings(false); }} />

      {/* Header */}
      <Animated.View style={[s.header, { backgroundColor: appColors.surface, opacity: headerOpacity, transform: [{ translateY: headerTranslate }] }]}>
        <View style={s.headerLeft}>
          <View style={[s.avatarCircle, { backgroundColor: userColor + '18' }]}>
            <Ionicons name="sunny" size={18} color={userColor} />
          </View>
          <View>
            <Text style={s.greeting}>Good {getGreeting()}</Text>
            <Text style={[s.userName, { color: userColor }]}>{userName}</Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <Pressable onPress={() => { playMenuOpen(); setShowSettings(true); }} hitSlop={8} style={s.settingsBtn}>
            <Ionicons name="settings-outline" size={20} color={appColors.labelSecondary} />
          </Pressable>
          <UserToggle />
        </View>
      </Animated.View>

      {/* Date strip */}
      <View style={s.dateBanner}>
        <Text style={s.dateText}>{formatDisplayDate(today)}</Text>
        <View style={[s.dateAccent, { backgroundColor: userColor }]} />
      </View>

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* Today's tasks */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardIconBadge, { backgroundColor: userColor + '14' }]}>
              <Ionicons name="checkbox" size={16} color={userColor} />
            </View>
            <Text style={[s.cardTitle, { color: userColor }]}>Today's tasks</Text>
          </View>
          <TodoSection
            owner={userId}
            label="Today"
            color={userColor}
            todos={dailyTasks}
            onAdd={(title) => addTodo(userId, title, todayKey)}
            onToggle={(id, done) => { playCheck(); toggle(id, done); }}
            onRemove={remove}
            showAddInput={false}
          />
        </View>

        {/* Today's schedule */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardIconBadge, { backgroundColor: userColor + '14' }]}>
              <Ionicons name="calendar" size={16} color={userColor} />
            </View>
            <Text style={[s.cardTitle, { color: userColor }]}>Today's schedule</Text>
            {evLoading && <ActivityIndicator size="small" color={userColor} style={{ marginLeft: 'auto' }} />}
          </View>
          <TodayEvents events={todayOccurrences} />
        </View>

        {/* Upcoming orders */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardIconBadge, { backgroundColor: ORDERS_ACCENT + '14' }]}>
              <Ionicons name="reader-outline" size={16} color={ORDERS_ACCENT} />
            </View>
            <Text style={[s.cardTitle, { color: ORDERS_ACCENT }]}>Orders</Text>
            {upcomingOrders.length > 0 ? (
              <Pressable onPress={() => router.push('/(tabs)/orders')} style={s.seeAllBtn}>
                <Text style={[s.seeAllText, { color: ORDERS_ACCENT }]}>See all</Text>
                <Ionicons name="chevron-forward" size={14} color={ORDERS_ACCENT} />
              </Pressable>
            ) : null}
          </View>
          {upcomingOrders.length === 0 ? (
            <Text style={s.placeholderText}>No upcoming orders. Add them in the Orders tab.</Text>
          ) : (
            <View style={s.ordersList}>
              {upcomingOrders.map(({ order, daysLeft }) => (
                <Pressable
                  key={order.id}
                  onPress={() => router.push('/(tabs)/orders')}
                  style={[s.orderRow, { borderBottomColor: colors.separator }]}
                >
                  <View style={s.orderInfo}>
                    <Text style={[s.orderCustomer, { color: appColors.label }]} numberOfLines={1}>
                      {order.customer_name}
                    </Text>
                    <Text style={[s.orderDesc, { color: appColors.labelTertiary }]} numberOfLines={1}>
                      {order.description}
                    </Text>
                  </View>
                  <Text
                    style={[
                      s.orderDays,
                      daysLeft < 0 && { color: '#DC2626' },
                      daysLeft === 0 && { color: ORDERS_ACCENT },
                      daysLeft > 0 && { color: appColors.labelSecondary },
                    ]}
                  >
                    {getOrderDaysLabel(daysLeft)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB — add task for today */}
      <Pressable
        onPress={openAddTaskModal}
        style={[s.fab, { backgroundColor: userColor, bottom: 20 }]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      {/* Add task modal */}
      <Modal visible={showAddTaskModal} transparent animationType="fade" onRequestClose={() => setShowAddTaskModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowAddTaskModal(false)} />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.modalScrollContent}
            style={s.modalScrollView}
          >
            <View style={s.modalBox}>
              <Text style={s.modalTitle}>New task</Text>
              <TextInput
                label="Task"
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                placeholder="What do you need to do?"
                accentColor={userColor}
              />
              <Text style={s.modalLabel}>Due date</Text>
              <Pressable onPress={() => setShowDatePicker(true)} style={[s.pickerRow, { borderColor: colors.separator }]}>
                <Ionicons name="calendar-outline" size={20} color={userColor} />
                <Text style={[s.pickerRowText, { color: colors.label }]}>{formatDisplayDate(newTaskDueDate)}</Text>
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={newTaskDueDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, date) => {
                    if (date) setNewTaskDueDate(date);
                    if (Platform.OS === 'android') setShowDatePicker(false);
                  }}
                  textColor={appColors.label}
                  themeVariant="light"
                  style={Platform.OS === 'android' ? s.timePickerAndroid : undefined}
                />
              )}

              <Text style={s.modalLabel}>Due time (optional)</Text>
              <Pressable
                onPress={() => setShowTimePicker(true)}
                style={[s.pickerRow, { borderColor: colors.separator }]}
              >
                <Ionicons name="time-outline" size={20} color={userColor} />
                <Text style={[s.pickerRowText, { color: colors.label }]}>
                  {newTaskDueTime
                    ? `${String(newTaskDueTime.getHours()).padStart(2, '0')}:${String(newTaskDueTime.getMinutes()).padStart(2, '0')}`
                    : 'Not set'}
                </Text>
                {newTaskDueTime ? (
                  <Pressable onPress={() => setNewTaskDueTime(null)} hitSlop={8}>
                    <Ionicons name="close-circle" size={20} color={colors.labelTertiary} />
                  </Pressable>
                ) : null}
              </Pressable>
              {showTimePicker && (
                <DateTimePicker
                  value={newTaskDueTime ?? new Date()}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, date) => {
                    if (date) setNewTaskDueTime(date);
                    if (Platform.OS === 'android') setShowTimePicker(false);
                  }}
                  textColor={appColors.label}
                  themeVariant="light"
                  style={Platform.OS === 'android' ? s.timePickerAndroid : undefined}
                />
              )}

              <View style={s.modalActions}>
                <Button title="Cancel" onPress={() => { setShowAddTaskModal(false); setNewTaskTitle(''); }} variant="ghost" color={colors.labelSecondary} size="md" style={{ flex: 1 }} />
                <Button title="Add" onPress={handleAddTask} color={userColor} size="md" style={{ flex: 1 }} disabled={!newTaskTitle.trim()} />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator,
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  settingsBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  greeting: { fontSize: 12, color: colors.labelSecondary, fontWeight: '500' },
  userName: { ...typography.title3, letterSpacing: -0.3 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 'auto' },
  seeAllText: { ...typography.footnote, fontWeight: '600' },
  ordersList: { gap: 0 },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  orderInfo: { flex: 1, minWidth: 0, marginRight: spacing.sm },
  orderCustomer: { ...typography.bodyEmphasis },
  orderDesc: { ...typography.footnote, marginTop: 2 },
  orderDays: { ...typography.footnote, fontWeight: '600' },

  dateBanner: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator,
  },
  dateText: { ...typography.body, color: colors.labelSecondary },
  dateAccent: { width: 32, height: 2, borderRadius: 1, marginTop: spacing.xs },

  scroll: { flex: 1 },
  scrollContent: { paddingTop: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  placeholderText: { ...typography.footnote, color: colors.labelTertiary, fontStyle: 'italic' },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.xl, marginBottom: spacing.lg,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator,
  },
  cardIconBadge: { width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...typography.subhead, letterSpacing: 0.3, textTransform: 'uppercase' },

  fab: {
    position: 'absolute',
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.40)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    width: '100%',
    minWidth: 320,
    maxWidth: 460,
    minHeight: 420,
    ...shadows.lg,
  },
  modalTitle: { ...typography.title3, color: colors.label, marginBottom: spacing.lg, textAlign: 'center' },
  modalLabel: { ...typography.footnote, color: colors.labelSecondary, marginBottom: spacing.sm, marginTop: spacing.md },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  pickerRowText: { ...typography.body, flex: 1 },
  modalScrollView: { flex: 1, width: '100%' },
  modalScrollContent: { padding: spacing.xxl, flexGrow: 1, justifyContent: 'center' },
  timePickerAndroid: { width: '100%' },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
});
