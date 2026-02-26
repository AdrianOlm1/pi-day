import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, ActivityIndicator, Animated, Pressable, Modal,
  Platform, Alert, Keyboard, LayoutAnimation, useWindowDimensions,
} from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserMode } from '@/contexts/UserModeContext';
import { useAppColors } from '@/contexts/ThemeContext';
import { useEvents } from '@/hooks/useEvents';
import { useGoals } from '@/hooks/useGoals';
import { useOrders } from '@/hooks/useOrders';
import { useWeather, weatherCodeToIcon } from '@/hooks/useWeather';
import { TodayEvents } from '@/components/today/TodayEvents';
import { TodoSection, type DailyItem } from '@/components/todo/TodoSection';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { SettingsSheet } from '@/components/settings/SettingsSheet';
import { OrderDetailSheet } from '@/components/orders/OrderDetailSheet';
import { ACBackgroundBreathing } from '@/components/ui/ACBackground';
import { BlurView } from 'expo-blur';
import { formatDisplayDate, formatDate } from '@/utils/date';
import { hapticLight, hapticMedium } from '@/utils/haptics';
import { playTrash } from '@/utils/sounds';
import { playCheck, playAllHabitComplete } from '@/utils/sounds';
import { startOfDay, endOfDay, differenceInCalendarDays, parseISO, format as dateFnsFormat } from 'date-fns';
import AnimatedReanimated, { FadeInDown } from 'react-native-reanimated';
import { spacing, typography, radius, shadows } from '@/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { useEmptyStateMessage } from '@/hooks/useEmptyStateMessage';
import { EMPTY_ORDERS_HOME } from '@/utils/emptyStateMessages';
import { getGreetingLabel, getGreetingSubtitle, getMomentIconName, getComfortLine } from '@/utils/greetings';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 84 : 64;

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


function OrdersEmptyMessage({ appColors }: { appColors: ReturnType<typeof useAppColors> }) {
  const msg = useEmptyStateMessage(EMPTY_ORDERS_HOME);
  return (
    <View style={s.ordersEmptyWrap}>
      <Text style={[s.placeholderText, { color: appColors.labelTertiary }]}>{msg.title}</Text>
      {msg.subtitle ? <Text style={[s.placeholderSubtext, { color: appColors.labelQuaternary }]}>{msg.subtitle}</Text> : null}
    </View>
  );
}


function WeatherIconWithBounce({ code, color, temp }: { code: number; color: string; temp: number }) {
  const bounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(bounce, { toValue: 1, useNativeDriver: true, damping: 8, stiffness: 120 }).start();
  }, [bounce]);
  const translateY = bounce.interpolate({ inputRange: [0, 1], outputRange: [4, 0] });
  return (
    <Animated.View style={[s.weatherRow, { transform: [{ translateY }] }]} renderToHardwareTextureAndroid>
      <Ionicons name={weatherCodeToIcon(code) as any} size={30} color={color} />
      <Text style={[s.weatherTemp, { color }]} allowFontScaling={false}>{temp}°</Text>
    </Animated.View>
  );
}

/** Small icon next to the moment line with a subtle bounce — cozy character. */
function MomentLineIcon({ iconName, color }: { iconName: string; color: string }) {
  const bounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(220),
      Animated.spring(bounce, { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 140 }),
    ]).start();
  }, [bounce]);
  const scale = bounce.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const translateY = bounce.interpolate({ inputRange: [0, 1], outputRange: [6, 0] });
  return (
    <Animated.View style={[s.momentIconWrap, { transform: [{ scale }, { translateY }] }]}>
      <Ionicons name={iconName as any} size={16} color={color} />
    </Animated.View>
  );
}

const BURST_DOTS = 8;
const BURST_RADIUS = 52;

type BurstAnim = { scale: Animated.Value; opacity: Animated.Value };

function AllDoneCelebrationBurst({ userColor }: { userColor: string }) {
  const anims = useRef<BurstAnim[]>(
    Array.from({ length: BURST_DOTS }, () => ({ scale: new Animated.Value(0), opacity: new Animated.Value(0.8) }))
  ).current;
  useEffect(() => {
    Animated.parallel(
      anims.map((a: BurstAnim, i: number) =>
        Animated.sequence([
          Animated.delay(i * 40),
          Animated.parallel([
            Animated.timing(a.scale, { toValue: 1, duration: 380, useNativeDriver: true }),
            Animated.timing(a.opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
          ]),
        ])
      )
    ).start();
  }, [anims]);
  return (
    <View style={s.burstWrap} pointerEvents="none">
      {anims.map((a: BurstAnim, i: number) => {
        const angle = (i / BURST_DOTS) * 2 * Math.PI;
        const dx = Math.cos(angle) * BURST_RADIUS;
        const dy = Math.sin(angle) * BURST_RADIUS;
        return (
          <Animated.View
            key={i}
            style={[
              s.burstDot,
              {
                backgroundColor: userColor,
                opacity: a.opacity,
                transform: [
                  { translateX: a.scale.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
                  { translateY: a.scale.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
                  { scale: a.scale },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

interface AddDailyGoalModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (title: string, dueDateKey: string, dueTimeFormatted: string | null) => Promise<void>;
  userColor: string;
  appColors: ReturnType<typeof useAppColors>;
}

const KEYBOARD_ANIM_DURATION = 250;
/** Max pixels the modal moves up when keyboard opens — keep small so it barely nudges. */
const KEYBOARD_SHIFT_UP = 80;

const MODAL_HEIGHT_FRACTION = 0.88;

function AddDailyGoalModal({ visible, onClose, onAdd, userColor, appColors }: AddDailyGoalModalProps) {
  const { height: windowHeight } = useWindowDimensions();
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(() => new Date());
  const [dueTime, setDueTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.92)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const modalContentHeight = Math.min(windowHeight * MODAL_HEIGHT_FRACTION, 640);

  useEffect(() => {
    if (visible) {
      modalOpacity.setValue(0);
      modalScale.setValue(0.92);
      Animated.parallel([
        Animated.timing(modalOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(modalScale, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 280 }),
      ]).start();
    } else {
      modalScale.setValue(0.92);
      modalOpacity.setValue(0);
    }
  }, [visible, modalScale, modalOpacity]);

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
        <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.28)', opacity: modalOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[s.modalAnimatedWrap, { transform: [{ translateY }, { scale: modalScale }], opacity: modalOpacity }]}>
          <View style={[s.modalBox, { backgroundColor: appColors.surface, minHeight: modalContentHeight }]}>
            <Text style={[s.modalTitle, { color: appColors.label }]}>New daily goal</Text>
            <TextInput
              label="Daily goal"
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
  const {
    goals,
    dailyGoalsForDate,
    addGoal,
    checkIn,
    uncheck,
    remove: removeGoal,
    isCheckedIn,
    refresh: refreshGoals,
  } = useGoals(userId as import('@/types').UserId);
  const { orders, refresh: refreshOrders, changeStatus, remove: removeOrder, archiveOrder } = useOrders();
  const { temp, weatherCode, loading: weatherLoading } = useWeather();
  const [showSettings, setShowSettings] = useState(false);
  const [showAddDailyGoalModal, setShowAddDailyGoalModal] = useState(false);
  const [showAllDoneCelebration, setShowAllDoneCelebration] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<import('@/types').Order | null>(null);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const card1Anim = useRef(new Animated.Value(0)).current;
  const card2Anim = useRef(new Animated.Value(0)).current;
  const dateAccentAnim = useRef(new Animated.Value(0)).current;
  const dateAccentBreath = useRef(new Animated.Value(0)).current;
  const fabFloat = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const weatherIdle = useRef(new Animated.Value(0)).current;
  const lastRefreshedRef = useRef(0);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    React.useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });

      const now = Date.now();
      // Throttle heavier data refreshes so rapid tab switching doesn't spam Supabase
      if (now - lastRefreshedRef.current > 10000) {
        lastRefreshedRef.current = now;
        refreshEvents();
        refreshGoals(true);
        refreshOrders();
      }
      Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      dateAccentAnim.setValue(0);
      Animated.timing(dateAccentAnim, {
        toValue: 1,
        duration: 420,
        delay: 180,
        useNativeDriver: true,
      }).start();
      card1Anim.setValue(0);
      card2Anim.setValue(0);
      Animated.stagger(80, [
        Animated.spring(card1Anim, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 180 }),
        Animated.spring(card2Anim, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 180 }),
      ]).start();
      return () => {
        headerAnim.setValue(0);
        card1Anim.setValue(0);
        card2Anim.setValue(0);
        dateAccentAnim.setValue(0);
      };
    }, [refreshEvents, refreshGoals, refreshOrders, headerAnim, card1Anim, card2Anim, dateAccentAnim])
  );

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fabFloat, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(fabFloat, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [fabFloat]);

  // Subtle breathing pulse on the date accent bar (cozy, living feel)
  useEffect(() => {
    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(dateAccentBreath, {
          toValue: 1,
          duration: 2400,
          useNativeDriver: true,
        }),
        Animated.timing(dateAccentBreath, {
          toValue: 0,
          duration: 2400,
          useNativeDriver: true,
        }),
      ])
    );
    breathLoop.start();
    return () => breathLoop.stop();
  }, [dateAccentBreath]);

  // Weather block: gentle idle float so the right corner feels alive (not jarring)
  useEffect(() => {
    const idleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(weatherIdle, { toValue: 1, duration: 2800, useNativeDriver: true }),
        Animated.timing(weatherIdle, { toValue: 0, duration: 2800, useNativeDriver: true }),
      ])
    );
    idleLoop.start();
    return () => idleLoop.stop();
  }, [weatherIdle]);

  const card1Style = useMemo(() => ({
    opacity: card1Anim,
    transform: [
      { translateY: card1Anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
      { scale: card1Anim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
    ],
  }), [card1Anim]);
  const card2Style = useMemo(() => ({
    opacity: card2Anim,
    transform: [
      { translateY: card2Anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
      { scale: card2Anim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
    ],
  }), [card2Anim]);
  const fabFloatStyle = useMemo(() => ({
    transform: [{ translateY: fabFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
  }), [fabFloat]);
  const weatherIdleStyle = useMemo(() => ({
    transform: [
      { translateY: weatherIdle.interpolate({ inputRange: [0, 1], outputRange: [0, -2.5] }) },
    ],
  }), [weatherIdle]);

  const today = new Date();
  const todayKey = formatDate(today);

  const dailyGoals = useMemo(() => dailyGoalsForDate(todayKey), [dailyGoalsForDate, todayKey]);

  /** Display order of goal ids for today (incomplete first, then completed; user can drag to reorder). */
  const [dailyGoalOrder, setDailyGoalOrder] = useState<string[]>([]);

  // Keep dailyGoalOrder in sync with dailyGoals: preserve order for existing ids, append new goal ids.
  useEffect(() => {
    const ids = new Set(dailyGoals.map((g) => g.id));
    setDailyGoalOrder((prev) => {
      const kept = prev.filter((id) => ids.has(id));
      const added = dailyGoals.filter((g) => !prev.includes(g.id)).map((g) => g.id);
      if (added.length === 0 && kept.length === prev.length) return prev;
      return [...kept, ...added];
    });
  }, [dailyGoals]);

  /** Goals sorted: incomplete first, then completed; within each group by dailyGoalOrder. */
  const sortedDailyGoals = useMemo(() => {
    const order = dailyGoalOrder.filter((id) => dailyGoals.some((g) => g.id === id));
    const appended = dailyGoals.filter((g) => !order.includes(g.id)).map((g) => g.id);
    const fullOrder = [...order, ...appended];
    return [...dailyGoals].sort((a, b) => {
      const aDone = isCheckedIn(a.id, userId as import('@/types').UserId, a);
      const bDone = isCheckedIn(b.id, userId as import('@/types').UserId, b);
      if (aDone !== bDone) return aDone ? 1 : -1;
      return fullOrder.indexOf(a.id) - fullOrder.indexOf(b.id);
    });
  }, [dailyGoals, dailyGoalOrder, userId, isCheckedIn]);

  const dailyItems = useMemo((): DailyItem[] => {
    return sortedDailyGoals.map((g) => ({
      id: g.id,
      title: g.title,
      done: isCheckedIn(g.id, userId as import('@/types').UserId, g),
      due_time: g.due_time ?? null,
      onToggle: async () => {
        if (isCheckedIn(g.id, userId as import('@/types').UserId, g)) {
          uncheck(g);
        } else {
          LayoutAnimation.configureNext(
            Platform.OS === 'android'
              ? LayoutAnimation.Presets.easeInEaseOut
              : { duration: 280, update: { type: LayoutAnimation.Types.easeInEaseOut } },
          );
          const remainingBefore = dailyGoals.filter((x) => !isCheckedIn(x.id, userId as import('@/types').UserId, x)).length;
          hapticMedium();
          playCheck();
          try {
            await checkIn(g);
            if (remainingBefore === 1 && dailyGoals.length > 0) {
              playAllHabitComplete();
              setShowAllDoneCelebration(true);
            }
          } catch (_) {
            // error handled elsewhere
          }
        }
      },
      onRemove: () => {
        Alert.alert('Delete task', `Remove "${g.title}"?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => { playTrash(); removeGoal(g.id); } },
        ]);
      },
    }));
  }, [sortedDailyGoals, dailyGoals, userId, isCheckedIn, checkIn, uncheck, removeGoal]);

  const handleReorderDailyGoals = useCallback((orderedItems: DailyItem[]) => {
    setDailyGoalOrder(orderedItems.map((item) => item.id));
  }, []);

  const handleAddDailyGoal = useCallback(
    async (title: string, dueDateKey: string, dueTimeFormatted: string | null) => {
      try {
        await addGoal({
          owner: userId as import('@/types').UserId,
          title,
          period_type: 'daily',
          repeating: false,
          due_date: dueDateKey,
          due_time: dueTimeFormatted,
          reminder_enabled: false,
          emoji: '',
          stake: null,
        });
      } catch (e: any) {
        const message = e?.message ?? 'Could not add task';
        Alert.alert('Error', message);
        throw e;
      }
    },
    [userId, addGoal],
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
      <SettingsSheet
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Header — cozy: larger avatar with ring, greeting with name */}
      <Animated.View style={[s.header, { backgroundColor: appColors.surface, borderBottomColor: appColors.separator, opacity: headerOpacity, transform: [{ translateY: headerTranslate }] }]}>
        <View style={s.headerLeft}>
          <View style={[s.avatarRing, { borderColor: userColor + '50' }]}>
            <View style={[s.avatarCircle, { backgroundColor: userColor + '22' }]}>
              <Ionicons name={getMomentIconName(weatherCode ?? null) as any} size={22} color={userColor} />
            </View>
          </View>
          <View>
            <Text style={[s.greetingLabel, { color: appColors.label }]}>{getGreetingLabel(userName, todayKey)}</Text>
            <Text style={[s.greetingSubtitle, { color: appColors.labelTertiary }]}>{getGreetingSubtitle(todayKey)}</Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <Pressable
            onPress={() => {
              hapticLight();
              setShowSettings(true);
            }}
            hitSlop={8}
            style={s.settingsBtn}
          >
            <Ionicons name="settings-outline" size={20} color={appColors.labelSecondary} />
          </Pressable>
        </View>
      </Animated.View>

      {/* Main content — background so island/header stay surface */}
      <View style={[s.contentWrap, { backgroundColor: appColors.background }]}>
        <ACBackgroundBreathing />
        {/* Date strip — thick top line, date left / weather right, moment line */}
        <View style={[s.dateBanner, { backgroundColor: appColors.surface, borderTopColor: appColors.separator, borderBottomColor: appColors.separator }]}>
          <View style={s.dateBannerLeft}>
            <View>
              <Text style={[s.dateWeekday, { color: userColor }]}>{dateFnsFormat(today, 'EEEE')}</Text>
              <Text style={[s.dateMonthDay, { color: appColors.labelSecondary }]}>{dateFnsFormat(today, 'MMMM d')}</Text>
            </View>
            <Animated.View
              style={[
                s.dateAccent,
                { backgroundColor: userColor },
                {
                  transform: [{ scaleX: dateAccentAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }],
                  opacity: Animated.multiply(
                    dateAccentAnim,
                    dateAccentBreath.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }),
                  ),
                },
              ]}
            />
            <View style={s.dateComfortRow}>
              <Text style={[s.dateComfort, { color: appColors.labelTertiary }]}>{getComfortLine(todayKey)}</Text>
            </View>
          </View>
          <Animated.View style={[s.weatherPill, { backgroundColor: (appColors.gradientFrom ?? userColor) + '14' }, weatherIdleStyle]}>
            {weatherLoading ? (
              <>
                <ActivityIndicator size="small" color={appColors.labelTertiary} />
                <Text style={[s.weatherPillTemp, { color: appColors.labelTertiary }]}>—°</Text>
              </>
            ) : temp != null && weatherCode != null ? (
              <WeatherIconWithBounce code={weatherCode} color={appColors.labelSecondary} temp={Math.round(temp)} />
            ) : (
              <View style={s.weatherRow}>
                <Ionicons name="partly-sunny-outline" size={30} color={appColors.labelTertiary} />
                <Text style={[s.weatherPillTemp, { color: appColors.labelTertiary }]}>—°</Text>
              </View>
            )}
          </Animated.View>
        </View>

      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* Today's schedule — glass; icon/title use userColor, card glow uses theme so no red hue */}
        <Animated.View style={[s.cardWrap, card1Style]}>
        <GlassCard style={s.card} accentColor={appColors.gradientFrom}>
          <View style={[s.cardHeader, { borderBottomColor: appColors.separator }]}>
            <View style={[s.cardIconBadge, { backgroundColor: userColor + '14' }]}>
              <Ionicons name="calendar" size={16} color={userColor} />
            </View>
            <Text style={[s.cardTitle, { color: userColor }]}>Today's schedule</Text>
            {evLoading && <ActivityIndicator size="small" color={userColor} style={{ marginLeft: 'auto' }} />}
          </View>
          <TodayEvents events={todayOccurrences} />
          {/* Today's list: daily goals only (repeating goals + one-off daily goals for today) */}
          {dailyItems.length > 0 && (
            <>
              <View style={[s.dailyGoalsDivider, { borderTopColor: appColors.separator }]} />
              <Text style={[s.dailyGoalsSubtitle, { color: appColors.labelSecondary }]}>Today</Text>
              <TodoSection
                owner={userId as import('@/types').TodoOwner}
                label="Today"
                color={userColor}
                items={dailyItems}
                onAdd={(title) => handleAddDailyGoal(title, todayKey, null)}
                onToggle={() => {}}
                onRemove={() => {}}
                showAddInput={false}
                hideSectionHeader
                onReorder={handleReorderDailyGoals}
              />
            </>
          )}
        </GlassCard>
        </Animated.View>

        {/* Upcoming orders — glass; icon/title use userColor, card glow uses theme so no red hue */}
        <Animated.View style={[s.cardWrap, card2Style]}>
        <GlassCard style={s.card} accentColor={appColors.gradientFrom}>
          <View style={[s.cardHeader, { borderBottomColor: appColors.separator }]}>
            <View style={[s.cardIconBadge, { backgroundColor: userColor + '14' }]}>
              <Ionicons name="reader-outline" size={16} color={userColor} />
            </View>
            <Text style={[s.cardTitle, { color: userColor }]}>Orders</Text>
            {upcomingOrders.length > 0 ? (
              <Pressable onPress={() => router.push('/(tabs)/orders')} style={s.seeAllBtn}>
                <Text style={[s.seeAllText, { color: userColor }]}>See all</Text>
                <Ionicons name="chevron-forward" size={14} color={userColor} />
              </Pressable>
            ) : null}
          </View>
          {upcomingOrders.length === 0 ? (
            <OrdersEmptyMessage appColors={appColors} />
          ) : (
            <View style={s.ordersList}>
              {upcomingOrders.map(({ order, daysLeft }, idx) => (
                <AnimatedReanimated.View key={order.id} entering={FadeInDown.delay(idx * 50).duration(260)}>
                  <Pressable
                    onPress={() => {
                      hapticLight();
                      setSelectedOrder(order);
                    }}
                    style={({ pressed }) => [
                      s.orderRow,
                      { borderBottomColor: appColors.separator, opacity: pressed ? 0.85 : 1 },
                    ]}
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
                        daysLeft < 0 && { color: appColors.destructive },
                        daysLeft === 0 && { color: userColor },
                        daysLeft > 0 && { color: appColors.labelSecondary },
                      ]}
                    >
                      {getOrderDaysLabel(daysLeft)}
                    </Text>
                  </Pressable>
                </AnimatedReanimated.View>
              ))}
            </View>
          )}
        </GlassCard>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB — add task for today, float + glow + press scale */}
      <Animated.View style={[s.fabWrap, fabFloatStyle]}>
        <Pressable
          onPressIn={() => Animated.spring(fabScale, { toValue: 0.92, useNativeDriver: true, damping: 18, stiffness: 400 }).start()}
          onPressOut={() => Animated.spring(fabScale, { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 300 }).start()}
          onPress={() => {
            hapticMedium();
            scrollRef.current?.scrollToEnd({ animated: true });
            const openModal = () => setShowAddDailyGoalModal(true);
            if (Platform.OS === 'ios') {
              requestAnimationFrame(() => {
                setTimeout(openModal, 320);
              });
            } else {
              setTimeout(openModal, 320);
            }
          }}
          style={[s.fab, { backgroundColor: userColor, shadowColor: userColor, shadowOpacity: 0.35 }]}
        >
          <Animated.View style={{ transform: [{ scale: fabScale }] }}>
            <Ionicons name="add" size={28} color="#fff" />
          </Animated.View>
        </Pressable>
      </Animated.View>

      <AddDailyGoalModal
        visible={showAddDailyGoalModal}
        onClose={() => setShowAddDailyGoalModal(false)}
        onAdd={handleAddDailyGoal}
        userColor={userColor}
        appColors={appColors}
      />

      {selectedOrder ? (
        <OrderDetailSheet
          order={selectedOrder}
          visible={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onEdit={(order) => {
            setSelectedOrder(null);
            router.push(`/(tabs)/orders?orderId=${order.id}`);
          }}
          onDelete={removeOrder}
          onChangeStatus={changeStatus}
          onArchive={archiveOrder}
          isArchived={!!selectedOrder?.archived}
        />
      ) : null}

      {/* All done today celebration — burst + card */}
      <Modal visible={showAllDoneCelebration} transparent animationType="fade" onRequestClose={() => setShowAllDoneCelebration(false)}>
        <Pressable style={s.allDoneOverlay} onPress={() => setShowAllDoneCelebration(false)}>
          <AllDoneCelebrationBurst userColor={userColor} />
          <View style={[s.allDoneCard, { backgroundColor: appColors.surface, borderColor: userColor + '40' }]}>
            <Text style={s.allDoneEmoji}>🎉</Text>
            <Text style={[s.allDoneTitle, { color: userColor }]}>All done today!</Text>
            <Text style={[s.allDoneDesc, { color: appColors.labelSecondary }]}>You completed every goal. Nice work.</Text>
            <Button title="Awesome!" onPress={() => setShowAllDoneCelebration(false)} color={userColor} size="md" style={{ marginTop: spacing.md }} />
          </View>
        </Pressable>
      </Modal>
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
  avatarRing: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  greeting: { fontSize: 12, fontWeight: '500' },
  greetingLabel: { ...typography.title3, letterSpacing: -0.2 },
  greetingSubtitle: { ...typography.footnote, marginTop: 2 },
  userName: { ...typography.title3, letterSpacing: -0.3 },
  cardWrap: {},
  dateMomentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  momentIconWrap: {},
  dateMoment: { ...typography.footnote, fontStyle: 'italic', maxWidth: 220, flex: 1 },
  dateComfortRow: { marginTop: spacing.sm },
  dateComfort: { ...typography.footnote, fontStyle: 'italic', maxWidth: 260 },
  weatherRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
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
  weatherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  weatherPillTemp: { ...typography.title3, fontWeight: '700' },
  dateWeekday: { ...typography.subhead, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  dateMonthDay: { ...typography.title3, letterSpacing: -0.2 },
  dateAccent: { width: 40, height: 3, borderRadius: 2, marginTop: spacing.sm },
  weatherTemp: { ...typography.title3, fontWeight: '600' },

  scroll: { flex: 1 },
  scrollContent: { paddingTop: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  ordersEmptyWrap: { paddingVertical: spacing.sm, alignSelf: 'center', maxWidth: 320 },
  placeholderText: { ...typography.footnote, fontStyle: 'italic', textAlign: 'center' },
  placeholderSubtext: { ...typography.footnote, marginTop: 2, textAlign: 'center' },

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
  dailyGoalsDivider: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.md, paddingTop: spacing.md },
  dailyGoalsSubtitle: { ...typography.footnote, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: spacing.sm },

  fabWrap: {
    position: 'absolute',
    right: spacing.xl,
    bottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 8,
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
  timePickerAndroid: { width: '100%' },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  allDoneOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  burstWrap: { position: 'absolute', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  burstDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  allDoneCard: { borderRadius: radius.xxl, padding: spacing.xxl, alignItems: 'center', maxWidth: 320, borderWidth: 2, ...shadows.lg },
  allDoneEmoji: { fontSize: 48, marginBottom: spacing.sm },
  allDoneTitle: { ...typography.title2, marginBottom: spacing.xs },
  allDoneDesc: { ...typography.body, textAlign: 'center' },
});
