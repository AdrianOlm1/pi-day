import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, ActivityIndicator, Animated, Pressable, Modal,
  Platform, Alert, Keyboard,
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
import { useWeather, weatherCodeToIcon } from '@/hooks/useWeather';
import { TodayEvents } from '@/components/today/TodayEvents';
import { TodoSection } from '@/components/todo/TodoSection';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { SettingsSheet } from '@/components/settings/SettingsSheet';
import { ACBackgroundStatic } from '@/components/ui/ACBackground';
import { formatDisplayDate, formatDate } from '@/utils/date';
import { playMenuOpen, playMenuClose, playCheck } from '@/utils/sounds';
import { startOfDay, endOfDay, differenceInCalendarDays, parseISO, format as dateFnsFormat } from 'date-fns';
import { spacing, typography, radius, shadows } from '@/theme';
import { GlassCard } from '@/components/ui/GlassCard';

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

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (title: string, dueDateKey: string, dueTimeFormatted: string | null) => Promise<void>;
  userColor: string;
  appColors: ReturnType<typeof useAppColors>;
}

const KEYBOARD_ANIM_DURATION = 250;
/** Max pixels the modal moves up when keyboard opens — keep small so it barely nudges. */
const KEYBOARD_SHIFT_UP = 80;

function AddTaskModal({ visible, onClose, onAdd, userColor, appColors }: AddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(() => new Date());
  const [dueTime, setDueTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      keyboardOffset.setValue(0);
      return;
    }
    keyboardOffset.setValue(0);
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        Animated.timing(keyboardOffset, {
          toValue: KEYBOARD_SHIFT_UP,
          duration: Platform.OS === 'ios' ? (e.duration ?? KEYBOARD_ANIM_DURATION) : KEYBOARD_ANIM_DURATION,
          useNativeDriver: true,
        }).start();
      },
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        Animated.timing(keyboardOffset, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? (e.duration ?? KEYBOARD_ANIM_DURATION) : KEYBOARD_ANIM_DURATION,
          useNativeDriver: true,
        }).start();
      },
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible, keyboardOffset]);

  const handleAdd = useCallback(async () => {
    const t = title.trim();
    if (!t) return;
    const dueDateKey = formatDate(dueDate);
    const dueTimeFormatted = dueTime
      ? `${String(dueTime.getHours()).padStart(2, '0')}:${String(dueTime.getMinutes()).padStart(2, '0')}:00`
      : null;
    try {
      await onAdd(t, dueDateKey, dueTimeFormatted);
      setTitle('');
      setDueDate(new Date());
      setDueTime(null);
      onClose();
    } catch (_) {
      // caller shows alert
    }
  }, [title, dueDate, dueTime, onAdd, onClose]);

  if (!visible) return null;

  const translateY = keyboardOffset.interpolate({
    inputRange: [0, KEYBOARD_SHIFT_UP],
    outputRange: [0, -KEYBOARD_SHIFT_UP],
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[s.modalAnimatedWrap, { transform: [{ translateY }] }]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.modalScrollContent}
            style={s.modalScrollView}
            scrollEventThrottle={16}
          >
            <View style={[s.modalBox, { backgroundColor: appColors.surface }]}>
            <Text style={[s.modalTitle, { color: appColors.label }]}>New task</Text>
            <TextInput
              label="Task"
              value={title}
              onChangeText={setTitle}
              placeholder="What do you need to do?"
              accentColor={userColor}
            />
            <Text style={s.modalLabel}>Due date</Text>
            <Pressable onPress={() => setShowDatePicker(true)} style={[s.pickerRow, { borderColor: appColors.separator }]}>
              <Ionicons name="calendar-outline" size={20} color={userColor} />
              <Text style={[s.pickerRowText, { color: appColors.label }]}>{formatDisplayDate(dueDate)}</Text>
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={dueDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  if (date) setDueDate(date);
                  if (Platform.OS === 'android') setShowDatePicker(false);
                }}
                textColor={appColors.label}
                themeVariant="light"
                style={Platform.OS === 'android' ? s.timePickerAndroid : undefined}
              />
            )}

            <Text style={[s.modalLabel, { color: appColors.labelSecondary }]}>Due time (optional)</Text>
            <Pressable
              onPress={() => setShowTimePicker(true)}
              style={[s.pickerRow, { borderColor: appColors.separator }]}
            >
              <Ionicons name="time-outline" size={20} color={userColor} />
              <Text style={[s.pickerRowText, { color: appColors.label }]}>
                {dueTime
                  ? `${String(dueTime.getHours()).padStart(2, '0')}:${String(dueTime.getMinutes()).padStart(2, '0')}`
                  : 'Not set'}
              </Text>
              {dueTime ? (
                <Pressable onPress={() => setDueTime(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={appColors.labelTertiary} />
                </Pressable>
              ) : null}
            </Pressable>
            {showTimePicker && (
              <DateTimePicker
                value={dueTime ?? new Date()}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  if (date) setDueTime(date);
                  if (Platform.OS === 'android') setShowTimePicker(false);
                }}
                textColor={appColors.label}
                themeVariant="light"
                style={Platform.OS === 'android' ? s.timePickerAndroid : undefined}
              />
            )}

            <View style={s.modalActions}>
              <Button title="Cancel" onPress={() => { onClose(); setTitle(''); }} variant="ghost" color={appColors.labelSecondary} size="md" style={{ flex: 1 }} />
              <Button title="Add" onPress={handleAdd} color={userColor} size="md" style={{ flex: 1 }} disabled={!title.trim()} />
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
    </Modal>
  );
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { userId, userColor, userName } = useUserMode();
  const appColors = useAppColors();
  const router = useRouter();
  const { getOccurrencesByRange, loading: evLoading, refresh: refreshEvents } = useEvents();
  const { todos, addTodo, toggle, remove, refresh: refreshTodos } = useTodos();
  const { orders, refresh: refreshOrders } = useOrders();
  const { temp, weatherCode, loading: weatherLoading } = useWeather();
  const [showSettings, setShowSettings] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);

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

  const handleAddTask = useCallback(
    async (title: string, dueDateKey: string, dueTimeFormatted: string | null) => {
      try {
        await addTodo(userId, title, dueDateKey, dueTimeFormatted);
      } catch (e: any) {
        const message = e?.message ?? 'Could not add task';
        Alert.alert('Error', message);
        throw e;
      }
    },
    [userId, addTodo],
  );
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
    <SafeAreaView style={[s.safe, { backgroundColor: appColors.surface }]} edges={['top']}>
      {/* Settings sheet — opened by header settings button */}
      <SettingsSheet
        visible={showSettings}
        onClose={() => {
          playMenuClose();
          setShowSettings(false);
        }}
      />

      {/* Header — same color as Dynamic Island / status bar area */}
      <Animated.View style={[s.header, { backgroundColor: appColors.surface, borderBottomColor: appColors.separator, opacity: headerOpacity, transform: [{ translateY: headerTranslate }] }]}>
        <View style={s.headerLeft}>
          <View style={[s.avatarCircle, { backgroundColor: userColor + '18' }]}>
            <Ionicons name="sunny" size={18} color={userColor} />
          </View>
          <View>
            <Text style={[s.greeting, { color: appColors.labelSecondary }]}>Good {getGreeting()}</Text>
            <Text style={[s.userName, { color: userColor }]}>{userName}</Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <Pressable onPress={() => { playMenuOpen(); setShowSettings(true); }} hitSlop={8} style={s.settingsBtn}>
            <Ionicons name="settings-outline" size={20} color={appColors.labelSecondary} />
          </Pressable>
        </View>
      </Animated.View>

      {/* Main content — background so island/header stay surface */}
      <View style={[s.contentWrap, { backgroundColor: appColors.background }]}>
        <ACBackgroundStatic />
        {/* Date strip — thick top line, date left / weather right */}
        <View style={[s.dateBanner, { backgroundColor: appColors.surface, borderTopColor: appColors.separator, borderBottomColor: appColors.separator }]}>
          <View style={s.dateBannerLeft}>
            <Text style={[s.dateWeekday, { color: userColor }]}>{dateFnsFormat(today, 'EEEE')}</Text>
            <Text style={[s.dateMonthDay, { color: appColors.labelSecondary }]}>{dateFnsFormat(today, 'MMMM d')}</Text>
            <View style={[s.dateAccent, { backgroundColor: userColor }]} />
          </View>
          <View style={s.dateBannerRight}>
            {weatherLoading ? (
              <ActivityIndicator size="small" color={appColors.labelTertiary} />
            ) : temp != null && weatherCode != null ? (
              <>
                <Ionicons name={weatherCodeToIcon(weatherCode) as any} size={20} color={appColors.labelSecondary} />
                <Text style={[s.weatherTemp, { color: appColors.labelSecondary }]}>{Math.round(temp)}°</Text>
              </>
            ) : null}
          </View>
        </View>

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* Today's schedule — glass */}
        <GlassCard style={s.card} accentColor={userColor}>
          <View style={[s.cardHeader, { borderBottomColor: appColors.separator }]}>
            <View style={[s.cardIconBadge, { backgroundColor: userColor + '14' }]}>
              <Ionicons name="calendar" size={16} color={userColor} />
            </View>
            <Text style={[s.cardTitle, { color: userColor }]}>Today's schedule</Text>
            {evLoading && <ActivityIndicator size="small" color={userColor} style={{ marginLeft: 'auto' }} />}
          </View>
          <TodayEvents events={todayOccurrences} />
          {/* Today's tasks — below schedule, smaller title, only when there are tasks */}
          {dailyTasks.length > 0 && (
            <>
              <View style={[s.tasksDivider, { borderTopColor: appColors.separator }]} />
              <Text style={[s.tasksSubtitle, { color: appColors.labelSecondary }]}>Today's tasks</Text>
              <TodoSection
                owner={userId}
                label="Today"
                color={userColor}
                todos={dailyTasks}
                onAdd={(title) => addTodo(userId, title, todayKey)}
                onToggle={(id, done) => { playCheck(); toggle(id, done); }}
                onRemove={remove}
                showAddInput={false}
                hideSectionHeader
              />
            </>
          )}
        </GlassCard>

        {/* Upcoming orders — glass */}
        <GlassCard style={s.card} accentColor={appColors.gradientFrom}>
          <View style={[s.cardHeader, { borderBottomColor: appColors.separator }]}>
            <View style={[s.cardIconBadge, { backgroundColor: appColors.gradientFrom + '14' }]}>
              <Ionicons name="reader-outline" size={16} color={appColors.gradientFrom} />
            </View>
            <Text style={[s.cardTitle, { color: appColors.gradientFrom }]}>Orders</Text>
            {upcomingOrders.length > 0 ? (
              <Pressable onPress={() => router.push('/(tabs)/orders')} style={s.seeAllBtn}>
                <Text style={[s.seeAllText, { color: appColors.gradientFrom }]}>See all</Text>
                <Ionicons name="chevron-forward" size={14} color={appColors.gradientFrom} />
              </Pressable>
            ) : null}
          </View>
          {upcomingOrders.length === 0 ? (
            <Text style={[s.placeholderText, { color: appColors.labelTertiary }]}>No upcoming orders. Add them in the Orders tab.</Text>
          ) : (
            <View style={s.ordersList}>
              {upcomingOrders.map(({ order, daysLeft }) => (
                <Pressable
                  key={order.id}
                  onPress={() => router.push(`/(tabs)/orders?orderId=${order.id}`)}
                  style={[s.orderRow, { borderBottomColor: appColors.separator }]}
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
                      daysLeft === 0 && { color: appColors.gradientFrom },
                      daysLeft > 0 && { color: appColors.labelSecondary },
                    ]}
                  >
                    {getOrderDaysLabel(daysLeft)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </GlassCard>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB — add task for today */}
      <Pressable
        onPress={() => setShowAddTaskModal(true)}
        style={[s.fab, { backgroundColor: userColor, bottom: 20 }]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      <AddTaskModal
        visible={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        onAdd={handleAddTask}
        userColor={userColor}
        appColors={appColors}
      />
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  settingsBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  greeting: { fontSize: 12, fontWeight: '500' },
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 3,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dateBannerLeft: { flex: 1 },
  dateBannerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dateWeekday: { ...typography.subhead, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  dateMonthDay: { ...typography.title3, letterSpacing: -0.2 },
  dateAccent: { width: 40, height: 3, borderRadius: 2, marginTop: spacing.sm },
  weatherTemp: { ...typography.subhead, fontWeight: '600' },

  scroll: { flex: 1 },
  scrollContent: { paddingTop: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  placeholderText: { ...typography.footnote, fontStyle: 'italic' },

  card: {
    borderRadius: radius.xl,
    padding: spacing.xl, marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cardIconBadge: { width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...typography.subhead, letterSpacing: 0.3, textTransform: 'uppercase' },
  tasksDivider: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.md, paddingTop: spacing.md },
  tasksSubtitle: { ...typography.footnote, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: spacing.sm },

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
  modalAnimatedWrap: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
  },
  modalBox: {
    borderRadius: radius.xl,
    padding: spacing.xxl,
    width: '100%',
    minWidth: 320,
    maxWidth: 460,
    minHeight: 420,
    ...shadows.lg,
  },
  modalTitle: { ...typography.title3, marginBottom: spacing.lg, textAlign: 'center' },
  modalLabel: { ...typography.footnote, marginBottom: spacing.sm, marginTop: spacing.md },
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
