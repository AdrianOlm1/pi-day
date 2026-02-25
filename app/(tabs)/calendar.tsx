import React, { useState, useMemo, useCallback, useRef, useEffect, memo } from 'react';
import {
  View, StyleSheet, ActivityIndicator, Alert, Pressable, Animated, PanResponder, LayoutAnimation, Platform, Modal,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AIImportScreen } from '@/components/ai-import/AIImportScreen';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
  addDays, subDays, format,
  eachDayOfInterval, isWithinInterval,
} from 'date-fns';
import { useUserMode } from '@/contexts/UserModeContext';
import { useAppColors } from '@/contexts/ThemeContext';
import { useEvents } from '@/hooks/useEvents';
import { useProfile } from '@/hooks/useProfile';
import { rescheduleEventReminders } from '@/services/notifications';
import { WeekStrip } from '@/components/calendar/WeekStrip';
import { DayCell } from '@/components/calendar/MonthView';
import { formatDate, isSameDay, formatMonthYear, formatTime } from '@/utils/date';
import { DayView } from '@/components/calendar/DayView';
import { useCategories } from '@/hooks/useCategories';
import { SelectedDayList } from '@/components/calendar/SelectedDayList';
import { Sheet } from '@/components/ui/Sheet';
import { EventForm, EventFormData } from '@/components/calendar/EventForm';
import { UserToggle } from '@/components/ui/UserToggle';
import { spacing, typography, radius, shadows } from '@/theme';
import { playTrash } from '@/utils/sounds';
import { USER_NAMES } from '@/utils/colors';
import type { EventOccurrence } from '@/types';

const YEAR_ROW_HEIGHT = 46;
const EMPTY_EVENTS: EventOccurrence[] = [];

function getWeeksForMonth(monthDate: Date): Date[][] {
  const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

type ViewMode = 'week' | 'month';

type YearRowProps = {
  week: Date[];
  selectedDate: Date;
  yearStart: Date;
  yearEnd: Date;
  occurrencesByDate: Record<string, EventOccurrence[]>;
  accentColor: string;
  onSelectDate: (d: Date) => void;
  today: Date;
  appColors: { surface: string; label: string; labelQuaternary: string };
};

const YearRow = memo(function YearRow({
  week,
  selectedDate,
  yearStart,
  yearEnd,
  occurrencesByDate,
  accentColor,
  onSelectDate,
  today,
  appColors,
}: YearRowProps) {
  return (
    <View style={[yearRowStyle, { height: YEAR_ROW_HEIGHT, backgroundColor: appColors.surface }]}>
      {week.map((day) => {
        const key = formatDate(day);
        const events = occurrencesByDate[key] ?? EMPTY_EVENTS;
        return (
          <DayCell
            key={key}
            day={day}
            isToday={isSameDay(day, today)}
            isSelected={isSameDay(day, selectedDate)}
            inMonth={isWithinInterval(day, { start: yearStart, end: yearEnd })}
            events={events}
            accentColor={accentColor}
            onSelectDate={onSelectDate}
            appColors={appColors}
          />
        );
      })}
    </View>
  );
});

const yearRowStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  paddingHorizontal: spacing.xs,
};

const MONTH_BORDER_WIDTH = 2;

type MonthBlockProps = Omit<YearRowProps, 'week'> & {
  weeks: Date[][];
  borderColor: string;
  appColors: { surface: string; label: string; labelQuaternary: string };
};

const MonthBlock = memo(function MonthBlock({
  weeks,
  borderColor,
  selectedDate,
  yearStart,
  yearEnd,
  occurrencesByDate,
  accentColor,
  onSelectDate,
  today,
  appColors,
}: MonthBlockProps) {
  return (
    <View style={[monthBlockStyle, { borderColor, backgroundColor: appColors.surface }]}>
      {weeks.map((week, i) => (
        <YearRow
          key={i}
          week={week}
          selectedDate={selectedDate}
          yearStart={yearStart}
          yearEnd={yearEnd}
          occurrencesByDate={occurrencesByDate}
          accentColor={accentColor}
          onSelectDate={onSelectDate}
          today={today}
          appColors={appColors}
        />
      ))}
    </View>
  );
});

const monthBlockStyle = {
  borderWidth: MONTH_BORDER_WIDTH,
};

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 84 : 64;

function EventDetailSheet({
  event,
  onClose,
  onDelete,
  accentColor,
}: {
  event: EventOccurrence;
  onClose: () => void;
  onDelete: () => void;
  accentColor: string;
}) {
  const appColors = useAppColors();
  const { getCategoryById } = useCategories();
  const categoryName = getCategoryById(event.category_id ?? null)?.name ?? event.type;
  const userName = USER_NAMES[event.user_id];

  function handleDeletePress() {
    Alert.alert('Delete event', `Delete "${event.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { playTrash(); onDelete(); } },
    ]);
  }

  return (
    <View style={[edStyles.wrap, { backgroundColor: appColors.surface }]}>
      {/* Header band with event color */}
      <View style={[edStyles.headerBand, { backgroundColor: event.color }]}>
        <View style={edStyles.headerContent}>
          <View style={[edStyles.categoryPill, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <Text style={edStyles.categoryPillText}>{categoryName}</Text>
          </View>
          <Text style={edStyles.headerTitle} numberOfLines={2}>{event.title}</Text>
          <View style={edStyles.headerMeta}>
            <Ionicons name="person-outline" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={edStyles.headerMetaText}>{userName}</Text>
          </View>
        </View>
      </View>

      <View style={edStyles.body}>
        {/* Time row with icon */}
        <View style={[edStyles.infoRow, { backgroundColor: event.color + '12' }]}>
          <View style={[edStyles.infoIconWrap, { backgroundColor: event.color + '20' }]}>
            <Ionicons name={event.all_day ? 'calendar-outline' : 'time-outline'} size={20} color={event.color} />
          </View>
          <View style={edStyles.infoTextWrap}>
            <Text style={[edStyles.infoLabel, { color: appColors.labelTertiary }]}>When</Text>
            <Text style={[edStyles.infoValue, { color: appColors.label }]}>
              {event.all_day ? 'All day' : `${formatTime(event.start_at)} – ${formatTime(event.end_at)}`}
            </Text>
          </View>
        </View>

        {event.notes ? (
          <View style={[edStyles.infoRow, { backgroundColor: appColors.fillSecondary }]}>
            <View style={[edStyles.infoIconWrap, { backgroundColor: appColors.separator }]}>
              <Ionicons name="document-text-outline" size={18} color={appColors.labelSecondary} />
            </View>
            <View style={edStyles.infoTextWrap}>
              <Text style={[edStyles.infoLabel, { color: appColors.labelTertiary }]}>Notes</Text>
              <Text style={[edStyles.infoValue, edStyles.notesValue, { color: appColors.labelSecondary }]} numberOfLines={4}>
                {event.notes}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={edStyles.actions}>
          <Pressable
            onPress={onClose}
            style={[edStyles.btn, edStyles.btnPrimary, { backgroundColor: accentColor }]}
          >
            <Text style={edStyles.btnTextPrimary}>Done</Text>
          </Pressable>
          <Pressable
            onPress={handleDeletePress}
            style={[edStyles.btn, edStyles.btnDanger]}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <Text style={edStyles.btnTextDanger}>Delete</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
const edStyles = StyleSheet.create({
  wrap: { flex: 1 },
  headerBand: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  headerContent: { gap: spacing.sm },
  categoryPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  categoryPillText: { fontSize: 12, fontWeight: '600', color: '#fff', letterSpacing: 0.3 },
  headerTitle: { ...typography.title2, color: '#fff', letterSpacing: -0.3 },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  headerMetaText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  body: { flex: 1, padding: spacing.xl, gap: spacing.md },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  infoIconWrap: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  infoTextWrap: { flex: 1, gap: 2 },
  infoLabel: { ...typography.caption, textTransform: 'uppercase', letterSpacing: 0.4 },
  infoValue: { ...typography.body, fontWeight: '500' },
  notesValue: { ...typography.footnote },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: 'auto', paddingTop: spacing.xl },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  btnPrimary: {},
  btnTextPrimary: { ...typography.bodyEmphasis, color: '#fff' },
  btnDanger: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA' },
  btnTextDanger: { ...typography.bodyEmphasis, color: '#EF4444' },
});

/** Height of the week strip (day pills) for collapse animation */
const WEEK_STRIP_HEIGHT = 96;
/** Approximate height of the weekday header row (Sun Mon Tue...) */
const WEEKDAY_ROW_HEIGHT = 36;
const SCROLL_COLLAPSE_THRESHOLD = 80;
const SCROLL_EXPAND_THRESHOLD = 30;

export default function CalendarScreen() {
  const { userColor, userId } = useUserMode();
  const { profile } = useProfile(userId);
  const appColors = useAppColors();
  const insets = useSafeAreaInsets();
  const { loading, error, refresh, getOccurrencesByRange, createEvent, createEventWithRecurrence, deleteEvent } = useEvents();

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [displayedMonth, setDisplayedMonth] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventOccurrence | null>(null);
  const [showImport, setShowImport] = useState(false);

  const displayedMonthRef = useRef(displayedMonth);
  displayedMonthRef.current = displayedMonth;
  const today = new Date();
  const fabScale = useRef(new Animated.Value(1)).current;
  const [calendarCollapsed, setCalendarCollapsed] = useState(false);
  const collapseAnim = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);

  const handleContentScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const y = e.nativeEvent.contentOffset.y;
    lastScrollY.current = y;
    if (y >= SCROLL_COLLAPSE_THRESHOLD && !calendarCollapsed) {
      setCalendarCollapsed(true);
      Animated.timing(collapseAnim, { toValue: 1, duration: 220, useNativeDriver: false }).start();
    } else if (y <= SCROLL_EXPAND_THRESHOLD && calendarCollapsed) {
      setCalendarCollapsed(false);
      Animated.timing(collapseAnim, { toValue: 0, duration: 220, useNativeDriver: false }).start();
    }
  }, [calendarCollapsed, collapseAnim]);

  useEffect(() => {
    setCalendarCollapsed(false);
    Animated.timing(collapseAnim, { toValue: 0, duration: 0, useNativeDriver: false }).start();
  }, [viewMode]);

  const fabPressIn = () => Animated.spring(fabScale, { toValue: 0.90, useNativeDriver: true, damping: 20, stiffness: 400 }).start();
  const fabPressOut = () => Animated.spring(fabScale, { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 280 }).start();

  useFocusEffect(
    useCallback(() => {
      refresh();
      rescheduleEventReminders(profile?.notification_category_ids ?? []).catch(() => {});
    }, [profile?.notification_category_ids]),
  );

  const currentMonthWeeks = useMemo(() => getWeeksForMonth(currentDate), [currentDate]);
  const monthBlockHeight = currentMonthWeeks.length * YEAR_ROW_HEIGHT;

  useEffect(() => {
    setDisplayedMonth(currentDate);
  }, [currentDate]);

  const runMonthTransition = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, []);

  const monthSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 20,
        onPanResponderRelease: (_, gestureState) => {
          const { dy } = gestureState;
          if (dy < -40) {
            runMonthTransition();
            const next = addMonths(currentDate, 1);
            setCurrentDate(next);
            setSelectedDate(startOfMonth(next));
            setDisplayedMonth(next);
          } else if (dy > 40) {
            runMonthTransition();
            const prev = subMonths(currentDate, 1);
            setCurrentDate(prev);
            setSelectedDate(startOfMonth(prev));
            setDisplayedMonth(prev);
          }
        },
      }),
    [currentDate, runMonthTransition]
  );

  const weekSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => {
          const dx = Math.abs(g.dx);
          const dy = Math.abs(g.dy);
          return dx > dy && dx > 28;
        },
        onPanResponderTerminationRequest: () => true,
        onPanResponderRelease: (_, gestureState) => {
          const { dx } = gestureState;
          if (dx < -40) setSelectedDate(addDays(selectedDate, 1));
          else if (dx > 40) setSelectedDate(subDays(selectedDate, 1));
        },
      }),
    [selectedDate]
  );

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (viewMode === 'month') {
      return {
        rangeStart: startOfWeek(startOfMonth(subMonths(currentDate, 1)), { weekStartsOn: 0 }),
        rangeEnd: endOfWeek(endOfMonth(addMonths(currentDate, 1)), { weekStartsOn: 0 }),
      };
    }
    return {
      rangeStart: startOfWeek(selectedDate, { weekStartsOn: 0 }),
      rangeEnd: endOfWeek(selectedDate, { weekStartsOn: 0 }),
    };
  }, [viewMode, currentDate, selectedDate]);

  const occurrencesByDate = useMemo(
    () => getOccurrencesByRange(rangeStart, rangeEnd),
    [getOccurrencesByRange, rangeStart, rangeEnd]
  );

  function navigatePrev() {
    if (viewMode === 'month') {
      runMonthTransition();
      const next = subMonths(currentDate, 1);
      setCurrentDate(next);
      setSelectedDate(startOfMonth(next));
    } else setSelectedDate(subDays(selectedDate, 1));
  }
  function navigateNext() {
    if (viewMode === 'month') {
      runMonthTransition();
      const next = addMonths(currentDate, 1);
      setCurrentDate(next);
      setSelectedDate(startOfMonth(next));
    } else setSelectedDate(addDays(selectedDate, 1));
  }
  function goToday() {
    const t = new Date();
    setCurrentDate(t);
    setSelectedDate(t);
  }

  async function handleSaveEvent(data: EventFormData) {
    try {
      const payload = {
        title: data.title,
        type: data.type,
        category_id: data.category_id || null,
        user_id: data.user_id,
        start_at: data.start_at,
        end_at: data.end_at,
        all_day: data.all_day,
        notes: data.notes || null,
        color: data.color,
      };
      if (data.recurrence) {
        await createEventWithRecurrence(payload, {
          rule_type: data.recurrence.rule_type,
          days_of_week: data.recurrence.days_of_week,
          num_weeks: data.recurrence.num_weeks,
          custom_dates: data.recurrence.custom_dates,
        });
      } else {
        await createEvent({ ...payload, recurrence_id: null });
      }
      setShowForm(false);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save event');
    }
  }

  async function handleDeleteEvent(ev: { id: string }) {
    try {
      playTrash();
      await deleteEvent(ev.id);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to delete event');
    }
  }

  const navLabel = viewMode === 'month'
    ? formatMonthYear(displayedMonth)
    : format(selectedDate, 'MMMM d, yyyy');

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: appColors.surface }]} edges={['top']}>
      {/* Header — same color as Dynamic Island / status bar area */}
      <View style={[s.header, { backgroundColor: appColors.surface, borderBottomColor: appColors.separator }]}>
        <View style={s.headerLeft}>
          <View style={[s.iconBadge, { backgroundColor: userColor + '14' }]}>
            <Ionicons name="calendar" size={20} color={userColor} />
          </View>
          <View>
            <Text style={[s.title, { color: appColors.label }]}>Calendar</Text>
            <Pressable onPress={goToday} hitSlop={8}>
              <Text style={[s.todayLink, { color: userColor }]}>
                {format(new Date(), 'EEE, MMM d')} · tap to jump
              </Text>
            </Pressable>
          </View>
        </View>
        <View style={s.headerRight}>
          <Pressable
            onPress={() => setShowImport(true)}
            hitSlop={8}
            style={s.importBtn}
          >
            <Ionicons name="camera-outline" size={20} color={appColors.labelSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Main content — background so island/header stay surface */}
      <View style={[s.contentWrap, { backgroundColor: appColors.background }]}>
      {/* View mode toggle + nav */}
      <View style={[s.controlBar, { backgroundColor: appColors.surface, borderBottomColor: appColors.separator }]}>
        {/* Segmented control */}
        <View style={[s.segmented, { backgroundColor: appColors.fillSecondary }]}>
          {(['week', 'month'] as ViewMode[]).map((mode) => {
            const active = viewMode === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => {
                  if (mode === 'month') {
                    const monthStart = startOfMonth(selectedDate);
                    setCurrentDate(monthStart);
                    setDisplayedMonth(monthStart);
                  }
                  setViewMode(mode);
                }}
                style={[s.segBtn, active && [s.segBtnActive, { backgroundColor: userColor }]]}
              >
                <Ionicons
                  name={mode === 'week' ? 'today-outline' : 'calendar-outline'}
                  size={14}
                  color={active ? '#fff' : appColors.labelSecondary}
                />
                <Text style={[s.segBtnText, { color: appColors.labelSecondary }, active && [s.segBtnTextActive, { color: '#fff' }]]}>
                  {mode === 'week' ? 'Week' : 'Month'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Navigation */}
        <View style={s.navGroup}>
          {viewMode === 'week' && (
            <Pressable onPress={navigatePrev} style={[s.navBtn, { backgroundColor: appColors.fill }]} hitSlop={8}>
              <Ionicons name="chevron-back" size={20} color={appColors.label} />
            </Pressable>
          )}
          <Text
            style={[viewMode === 'month' ? s.navLabelMonth : s.navLabel, { color: appColors.label }]}
            numberOfLines={1}
          >
            {navLabel}
          </Text>
          {viewMode === 'week' && (
            <Pressable onPress={navigateNext} style={[s.navBtn, { backgroundColor: appColors.fill }]} hitSlop={8}>
              <Ionicons name="chevron-forward" size={20} color={appColors.label} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Error */}
      {error ? (
        <View style={s.errorBanner}>
          <Ionicons name="warning-outline" size={16} color="#92400E" />
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Content */}
      {loading ? (
        <View style={s.loadingBox}><ActivityIndicator size="large" color={userColor} /></View>
      ) : (
        <View style={s.content}>
          {viewMode === 'week' && (
            <View style={s.weekViewWrap} {...weekSwipeResponder.panHandlers}>
              <Animated.View style={[s.collapsibleWrap, { maxHeight: collapseAnim.interpolate({ inputRange: [0, 1], outputRange: [WEEK_STRIP_HEIGHT, 0] }) }]}>
                <WeekStrip
                  selectedDate={selectedDate}
                  occurrencesByDate={occurrencesByDate}
                  onSelectDate={setSelectedDate}
                  accentColor={userColor}
                />
              </Animated.View>
              <DayView
                selectedDate={selectedDate}
                occurrencesByDate={occurrencesByDate}
                accentColor={userColor}
                onEventPress={(ev) => setSelectedEvent(ev)}
                onScroll={handleContentScroll}
                onRequestExpandStrip={
                  calendarCollapsed
                    ? () => {
                        setCalendarCollapsed(false);
                        Animated.timing(collapseAnim, { toValue: 0, duration: 220, useNativeDriver: false }).start();
                      }
                    : undefined
                }
              />
            </View>
          )}
          {viewMode === 'month' && (
            <>
              <Animated.View style={[s.collapsibleWrap, { maxHeight: collapseAnim.interpolate({ inputRange: [0, 1], outputRange: [WEEKDAY_ROW_HEIGHT + monthBlockHeight, 0] }) }]}>
                <View style={[s.weekdayRow, { backgroundColor: appColors.surface, borderBottomColor: appColors.separator }]}>
                  {(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const).map((d, i) => (
                    <Text key={d} style={[s.weekdayCell, { color: appColors.labelTertiary }, (i === 0 || i === 6) && { opacity: 0.75 }]}>{d}</Text>
                  ))}
                </View>
                <View
                  style={[s.monthPageWrap, { height: monthBlockHeight }]}
                  {...monthSwipeResponder.panHandlers}
                >
                  <MonthBlock
                    weeks={currentMonthWeeks}
                    borderColor={appColors.separator}
                    selectedDate={selectedDate}
                    yearStart={startOfMonth(currentDate)}
                    yearEnd={endOfMonth(currentDate)}
                    occurrencesByDate={occurrencesByDate}
                    accentColor={userColor}
                    onSelectDate={setSelectedDate}
                    today={today}
                    appColors={appColors}
                  />
                </View>
              </Animated.View>
              <SelectedDayList
                selectedDate={selectedDate}
                events={occurrencesByDate[formatDate(selectedDate)] ?? []}
                accentColor={userColor}
                onEventPress={(ev) => setSelectedEvent(ev)}
                onScroll={handleContentScroll}
              />
            </>
          )}
        </View>
      )}

      {/* FAB */}
      <Pressable
        onPressIn={fabPressIn}
        onPressOut={fabPressOut}
        onPress={() => setShowForm(true)}
        style={[s.fabWrap, { bottom: 20 }]}
      >
        <Animated.View style={[s.fab, { backgroundColor: userColor, transform: [{ scale: fabScale }] }]}>
          <Ionicons name="add" size={28} color="#fff" />
        </Animated.View>
      </Pressable>

      <Sheet visible={showForm} onClose={() => setShowForm(false)} heightFraction={0.92}>
        <EventForm initialDate={selectedDate} onSave={handleSaveEvent} onCancel={() => setShowForm(false)} />
      </Sheet>

      <Sheet visible={!!selectedEvent} onClose={() => setSelectedEvent(null)} heightFraction={0.6}>
        {selectedEvent ? (
          <EventDetailSheet
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onDelete={async () => {
              await handleDeleteEvent(selectedEvent);
              setSelectedEvent(null);
            }}
            accentColor={userColor}
          />
        ) : null}
      </Sheet>

      {/* AI Import — full-screen modal */}
      <Modal
        visible={showImport}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowImport(false)}
      >
        <SafeAreaProvider>
          <AIImportScreen isModal onClose={() => setShowImport(false)} />
        </SafeAreaProvider>
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBadge: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title3 },
  todayLink: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  importBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  controlBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: radius.sm, padding: 2, gap: 2,
  },
  segBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xxs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.xs,
  },
  segBtnActive: {},
  segBtnText: { fontSize: 13, fontWeight: '600' },
  segBtnTextActive: { color: '#fff' },
  navGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, justifyContent: 'flex-end' },
  navBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  navLabel: { ...typography.subhead, minWidth: 80, textAlign: 'center' },
  navLabelMonth: { ...typography.title2, flex: 1, textAlign: 'center' },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: '#FEF3C7', margin: spacing.lg, borderRadius: radius.sm, padding: spacing.md,
  },
  errorText: { flex: 1, color: '#92400E', fontSize: 13 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  collapsibleWrap: { overflow: 'hidden' as const },
  weekViewWrap: { flex: 1 },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  weekdayCell: {
    flex: 1, textAlign: 'center',
    fontSize: 11, fontWeight: '600',
    letterSpacing: 0.3,
  },
  monthScroll: { flex: 1 },
  monthScrollContent: {},
  monthPageWrap: { overflow: 'hidden' as const },
  fabWrap: { position: 'absolute', right: spacing.xl },
  fab: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22, shadowRadius: 16, elevation: 10,
  },
});
