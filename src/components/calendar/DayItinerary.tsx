import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { format } from 'date-fns';
import { formatTime } from '@/utils/date';
import { useCategories } from '@/hooks/useCategories';
import { useEmptyStateMessage } from '@/hooks/useEmptyStateMessage';
import { EMPTY_DAY_ITINERARY } from '@/utils/emptyStateMessages';
import type { EventOccurrence, UserId } from '@/types';
import { USER_COLORS } from '@/utils/colors';
import { typography, radius, spacing, shadows } from '@/theme';
import { useAppColors } from '@/contexts/ThemeContext';
import { hapticLight, hapticMedium } from '@/utils/haptics';

const USER_DISPLAY_NAMES: Record<UserId, string> = {
  adrian: "Adrian's",
  sarah: "Sarah's",
};

const DEFAULT_START_HOUR = 6;
const END_HOUR = 24;
const MINUTES_PER_DAY = 24 * 60;
const PIXELS_PER_HOUR = 38;
const MIN_EVENT_HEIGHT_PX = 28;

/** Minutes from midnight (0–1440) for an ISO datetime on the given date. */
function getMinutesInDay(iso: string, dateStr: string): number {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const isoDay = `${y}-${m}-${day}`;
  if (isoDay < dateStr) return 0;
  if (isoDay > dateStr) return MINUTES_PER_DAY;
  return d.getHours() * 60 + d.getMinutes();
}

/** Hour label for ruler: 0 -> "12 AM", 6 -> "6 AM", 12 -> "12 PM". */
function formatHourLabel(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

/** Sort: all-day first, then by start time. */
function sortEvents(events: EventOccurrence[]): EventOccurrence[] {
  return [...events].sort((a, b) => {
    if (a.all_day && !b.all_day) return -1;
    if (!a.all_day && b.all_day) return 1;
    if (a.all_day && b.all_day) return a.title.localeCompare(b.title);
    return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
  });
}

interface EventBlockProps {
  ev: EventOccurrence;
  onPress?: (ev: EventOccurrence) => void;
  onLongPress?: () => void;
  categoryLabel: string;
  color: string;
  timelineHeight?: number;
  appColors: { surface: string; label: string; labelSecondary: string; labelTertiary: string };
  /** When provided (e.g. during drag), show these instead of ev.start_at/ev.end_at */
  displayStartAt?: string;
  displayEndAt?: string;
}

function EventBlock({ ev, onPress, onLongPress, categoryLabel, color, timelineHeight, appColors, displayStartAt, displayEndAt }: EventBlockProps) {
  const startAt = displayStartAt ?? ev.start_at;
  const endAt = displayEndAt ?? ev.end_at;
  return (
    <Pressable
      style={[styles.block, { backgroundColor: appColors.surface }, timelineHeight != null && { minHeight: timelineHeight }]}
      onPress={() => onPress?.(ev)}
      onLongPress={onLongPress}
    >
      <View style={[styles.blockStripe, { backgroundColor: color }]} />
      <View style={styles.blockBody}>
        <View style={[styles.typePill, { backgroundColor: color + '18' }]}>
          <Text style={[styles.typeText, { color }]}>{categoryLabel}</Text>
        </View>
        <Text style={[styles.blockTitle, { color: appColors.label }]} numberOfLines={timelineHeight != null ? 3 : 2}>{ev.title}</Text>
        <Text style={[styles.blockTime, { color: appColors.labelSecondary }]}>
          {ev.all_day ? 'All day' : `${formatTime(startAt)} – ${formatTime(endAt)}`}
        </Text>
        {ev.notes && timelineHeight == null ? (
          <Text style={[styles.blockNotes, { color: appColors.labelTertiary }]} numberOfLines={2}>{ev.notes}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const SNAP_MINUTES = 15;
const MIN_DURATION_MINUTES = 15;

function snapToMinutes(m: number): number {
  return Math.round(m / SNAP_MINUTES) * SNAP_MINUTES;
}

/** Build ISO string for the given day at minutes-from-midnight (0–1440). */
function minutesToIso(selectedDate: Date, minutes: number): string {
  const d = new Date(selectedDate);
  d.setHours(0, 0, 0, 0);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d.toISOString();
}

interface EditableTimedEventBlockProps {
  ev: EventOccurrence;
  topPx: number;
  heightPx: number;
  dateStr: string;
  dayStartMinutes: number;
  totalDayMinutes: number;
  timelineHeightPx: number;
  selectedDate: Date;
  categoryLabel: string;
  color: string;
  appColors: { surface: string; label: string; labelSecondary: string; labelTertiary: string };
  onUpdateEventTime: (ev: EventOccurrence, newStartAt: string, newEndAt: string) => Promise<void>;
  /** When true, use full-width shared block styling (e.g. shared overlay row). */
  sharedBlock?: boolean;
  onDeleteEvent?: (ev: EventOccurrence) => void;
}

const SNAP = 15;

function EditableTimedEventBlock({
  ev,
  topPx,
  heightPx,
  dateStr,
  dayStartMinutes,
  totalDayMinutes,
  timelineHeightPx,
  selectedDate,
  categoryLabel,
  color,
  appColors,
  onUpdateEventTime,
  sharedBlock = false,
  onDeleteEvent,
}: EditableTimedEventBlockProps) {
  const startM = getMinutesInDay(ev.start_at, dateStr);
  const endM = getMinutesInDay(ev.end_at, dateStr);
  const durationM = Math.max(MIN_DURATION_MINUTES, endM - startM);
  const minutesPerPx = totalDayMinutes / timelineHeightPx;
  const pxPerMin = timelineHeightPx / totalDayMinutes;

  const translateY = useSharedValue(0);
  const resizeDelta = useSharedValue(0);
  const lastSnappedStartM = useSharedValue(startM);
  const lastSnappedEndM = useSharedValue(endM);

  const [liveStartAt, setLiveStartAt] = useState<string | null>(null);
  const [liveEndAt, setLiveEndAt] = useState<string | null>(null);

  useEffect(() => {
    translateY.value = 0;
    resizeDelta.value = 0;
    lastSnappedStartM.value = startM;
    lastSnappedEndM.value = endM;
    setLiveStartAt(null);
    setLiveEndAt(null);
  }, [ev.start_at, ev.end_at]);

  const handleMoveEnd = useCallback(
    (deltaPx: number) => {
      hapticLight();
      const deltaM = deltaPx * minutesPerPx;
      let newStartM = snapToMinutes(startM + deltaM);
      newStartM = Math.max(0, Math.min(1440 - durationM, newStartM));
      const newEndM = newStartM + durationM;
      const newStartAt = minutesToIso(selectedDate, newStartM);
      const newEndAt = minutesToIso(selectedDate, newEndM);
      setLiveStartAt(newStartAt);
      setLiveEndAt(newEndAt);
      onUpdateEventTime(ev, newStartAt, newEndAt);
    },
    [ev, startM, durationM, minutesPerPx, selectedDate, onUpdateEventTime]
  );

  const handleResizeEnd = useCallback(
    (deltaPx: number) => {
      hapticLight();
      const deltaM = deltaPx * minutesPerPx;
      let newEndM = snapToMinutes(endM + deltaM);
      newEndM = Math.max(startM + MIN_DURATION_MINUTES, Math.min(1440, newEndM));
      const newEndAt = minutesToIso(selectedDate, newEndM);
      setLiveEndAt(newEndAt);
      onUpdateEventTime(ev, ev.start_at, newEndAt);
    },
    [ev, startM, endM, minutesPerPx, selectedDate, onUpdateEventTime]
  );

  const updateLiveMove = useCallback(
    (snappedStartM: number, snappedEndM: number) => {
      setLiveStartAt(minutesToIso(selectedDate, snappedStartM));
      setLiveEndAt(minutesToIso(selectedDate, snappedEndM));
    },
    [selectedDate]
  );

  const updateLiveResize = useCallback(
    (snappedEndM: number) => {
      setLiveEndAt(minutesToIso(selectedDate, snappedEndM));
    },
    [selectedDate]
  );

  const moveGesture = Gesture.Pan()
    .activeOffsetY([-5, 5])
    .failOffsetX([-25, 25])
    .onStart(() => {
      runOnJS(updateLiveMove)(startM, endM);
    })
    .onUpdate((e) => {
      'worklet';
      const deltaM = e.translationY * minutesPerPx;
      let snappedStartM = Math.round((startM + deltaM) / SNAP) * SNAP;
      snappedStartM = Math.max(0, Math.min(1440 - durationM, snappedStartM));
      const snappedOffsetPx = (snappedStartM - startM) * pxPerMin;
      translateY.value = snappedOffsetPx;
      if (snappedStartM !== lastSnappedStartM.value) {
        lastSnappedStartM.value = snappedStartM;
        runOnJS(hapticLight)();
        runOnJS(updateLiveMove)(snappedStartM, snappedStartM + durationM);
      }
    })
    .onEnd((e) => {
      const deltaM = e.translationY * minutesPerPx;
      let snappedStartM = Math.round((startM + deltaM) / SNAP) * SNAP;
      snappedStartM = Math.max(0, Math.min(1440 - durationM, snappedStartM));
      runOnJS(handleMoveEnd)((snappedStartM - startM) * pxPerMin);
    });

  const resizeGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onStart(() => {
      runOnJS(updateLiveResize)(endM);
    })
    .onUpdate((e) => {
      'worklet';
      const deltaM = e.translationY * minutesPerPx;
      let snappedEndM = Math.round((endM + deltaM) / SNAP) * SNAP;
      snappedEndM = Math.max(startM + MIN_DURATION_MINUTES, Math.min(1440, snappedEndM));
      const deltaPx = (snappedEndM - endM) * pxPerMin;
      resizeDelta.value = deltaPx;
      if (snappedEndM !== lastSnappedEndM.value) {
        lastSnappedEndM.value = snappedEndM;
        runOnJS(hapticLight)();
        runOnJS(updateLiveResize)(snappedEndM);
      }
    })
    .onEnd((e) => {
      const deltaM = e.translationY * minutesPerPx;
      let snappedEndM = Math.round((endM + deltaM) / SNAP) * SNAP;
      snappedEndM = Math.max(startM + MIN_DURATION_MINUTES, Math.min(1440, snappedEndM));
      runOnJS(handleResizeEnd)((snappedEndM - endM) * pxPerMin);
    });

  const resizeHandleHeight = 16;

  const animatedContainerStyle = useAnimatedStyle(() => {
    'worklet';
    const height = Math.max(MIN_EVENT_HEIGHT_PX, heightPx + resizeDelta.value);
    return { top: topPx, height };
  });

  const animatedMoveStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const displayStartAt = liveStartAt ?? undefined;
  const displayEndAt = liveEndAt ?? undefined;

  const liveHeightPx =
    liveEndAt != null
      ? (getMinutesInDay(liveEndAt, dateStr) - (liveStartAt != null ? getMinutesInDay(liveStartAt, dateStr) : startM)) * pxPerMin
      : null;
  const eventBlockHeight =
    (liveHeightPx != null ? liveHeightPx : heightPx) - resizeHandleHeight;

  const blockContainerStyle = sharedBlock ? styles.sharedTimedBlock : styles.timelineBlock;

  return (
    <Animated.View style={[blockContainerStyle, animatedContainerStyle, animatedMoveStyle]}>
      <View style={styles.editableBlockWrap}>
        <GestureDetector gesture={moveGesture}>
          <View style={styles.editableBlockBody}>
            <EventBlock
              ev={ev}
              categoryLabel={categoryLabel}
              color={color}
              timelineHeight={eventBlockHeight}
              appColors={appColors}
              displayStartAt={displayStartAt}
              displayEndAt={displayEndAt}
            />
          </View>
        </GestureDetector>
        <GestureDetector gesture={resizeGesture}>
          <View style={[styles.resizeHandle, { backgroundColor: color + '40' }]}>
            <View style={[styles.resizeHandleLine, { backgroundColor: color }]} />
          </View>
        </GestureDetector>
      </View>
      {onDeleteEvent ? (
        <Pressable
          style={[styles.deleteEventBtn, { backgroundColor: appColors.surface }]}
          onPress={() => {
            hapticLight();
            onDeleteEvent(ev);
          }}
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={18} color={appColors.labelSecondary} />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

type TimedEventPlacement = { ev: EventOccurrence; topPx: number; heightPx: number };

interface DayItineraryProps {
  events: EventOccurrence[];
  selectedDate: Date;
  accentColor?: string;
  onEventPress?: (ev: EventOccurrence) => void;
  showHeaders?: boolean;
  editMode?: boolean;
  onEditModeChange?: (value: boolean) => void;
  onUpdateEventTime?: (ev: EventOccurrence, newStartAt: string, newEndAt: string) => Promise<void>;
  onDeleteEvent?: (ev: EventOccurrence) => void;
}

export function DayItinerary({
  events,
  selectedDate,
  accentColor: accentColorProp,
  onEventPress,
  showHeaders = true,
  editMode = false,
  onEditModeChange,
  onUpdateEventTime,
  onDeleteEvent,
}: DayItineraryProps) {
  const { getCategoryById } = useCategories();
  const appColors = useAppColors();
  const accentColor = accentColorProp ?? appColors.gradientFrom;
  const emptyMsg = useEmptyStateMessage(EMPTY_DAY_ITINERARY);

  const {
    dateStr,
    dayStartMinutes,
    totalDayMinutes,
    timelineHeightPx,
    hourLabels,
    allDayAdrian,
    allDaySarah,
    allDayShared,
    timedAdrian,
    timedSarah,
    timedShared,
  } = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const adrian: EventOccurrence[] = [];
    const sarah: EventOccurrence[] = [];
    const shared: EventOccurrence[] = [];
    for (const ev of events) {
      if (ev.type === 'shared') {
        shared.push(ev);
      } else if (ev.user_id === 'adrian') {
        adrian.push(ev);
      } else {
        sarah.push(ev);
      }
    }
    const allDayAdrian = sortEvents(adrian.filter((e) => e.all_day));
    const allDaySarah = sortEvents(sarah.filter((e) => e.all_day));
    const allDayShared = sortEvents(shared.filter((e) => e.all_day));
    const timedAdrianList = adrian.filter((e) => !e.all_day);
    const timedSarahList = sarah.filter((e) => !e.all_day);
    const timedSharedList = shared.filter((e) => !e.all_day);

    let dayStartMinutes = DEFAULT_START_HOUR * 60;
    for (const ev of [...timedAdrianList, ...timedSarahList, ...timedSharedList]) {
      const m = getMinutesInDay(ev.start_at, dateStr);
      if (m < dayStartMinutes) dayStartMinutes = Math.max(0, Math.floor(m / 60) * 60);
    }
    const dayEndMinutes = END_HOUR * 60;
    const totalDayMinutes = dayEndMinutes - dayStartMinutes;
    const timelineHeightPx = (totalDayMinutes / 60) * PIXELS_PER_HOUR;

    const hourLabels: number[] = [];
    for (let h = Math.floor(dayStartMinutes / 60); h < END_HOUR; h++) hourLabels.push(h);

    const place = (ev: EventOccurrence): TimedEventPlacement => {
      const startM = getMinutesInDay(ev.start_at, dateStr);
      const endM = getMinutesInDay(ev.end_at, dateStr);
      const startClamp = Math.max(dayStartMinutes, Math.min(dayEndMinutes, startM));
      const endClamp = Math.max(dayStartMinutes, Math.min(dayEndMinutes, endM));
      const durationM = Math.max(1, endClamp - startClamp);
      const topPx = ((startClamp - dayStartMinutes) / totalDayMinutes) * timelineHeightPx;
      const heightPx = Math.max(MIN_EVENT_HEIGHT_PX, (durationM / totalDayMinutes) * timelineHeightPx);
      return { ev, topPx, heightPx };
    };

    const timedAdrian: TimedEventPlacement[] = timedAdrianList.map(place);
    const timedSarah: TimedEventPlacement[] = timedSarahList.map(place);
    const timedShared: TimedEventPlacement[] = timedSharedList.map(place);

    return {
      dateStr,
      dayStartMinutes,
      totalDayMinutes,
      timelineHeightPx,
      hourLabels,
      allDayAdrian,
      allDaySarah,
      allDayShared,
      timedAdrian,
      timedSarah,
      timedShared,
    };
  }, [events, selectedDate]);

  const hasAllDay = allDayAdrian.length > 0 || allDaySarah.length > 0 || allDayShared.length > 0;
  const hasTimed = timedAdrian.length > 0 || timedSarah.length > 0 || timedShared.length > 0;

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const nowTopPx =
    isToday && hasTimed
      ? (() => {
          const now = new Date();
          const nowMinutes = now.getHours() * 60 + now.getMinutes();
          if (nowMinutes < dayStartMinutes || nowMinutes >= END_HOUR * 60) return null;
          return ((nowMinutes - dayStartMinutes) / totalDayMinutes) * timelineHeightPx;
        })()
      : null;

  const enterEditMode = useCallback(() => {
    if (onEditModeChange && !editMode) {
      hapticMedium();
      onEditModeChange(true);
    }
  }, [onEditModeChange, editMode]);

  const renderTimelineColumn = (userId: UserId, placements: TimedEventPlacement[]) => (
    <View key={userId} style={[styles.timelineColumn, { height: timelineHeightPx }]}>
      {placements.map(({ ev, topPx, heightPx }) => {
        const canEdit =
          editMode && onUpdateEventTime && !ev.recurrence_id && ev.user_id === 'adrian';

        if (canEdit) {
          return (
            <EditableTimedEventBlock
              key={ev.id + ev.occurrence_date}
              ev={ev}
              topPx={topPx}
              heightPx={heightPx}
              dateStr={dateStr}
              dayStartMinutes={dayStartMinutes}
              totalDayMinutes={totalDayMinutes}
              timelineHeightPx={timelineHeightPx}
              selectedDate={selectedDate}
              categoryLabel={getCategoryById(ev.category_id ?? null)?.name ?? ev.type}
              color={getCategoryById(ev.category_id ?? null)?.color ?? ev.color}
              appColors={appColors}
              onUpdateEventTime={onUpdateEventTime}
              onDeleteEvent={onDeleteEvent}
            />
          );
        }

        return (
          <View
            key={ev.id + ev.occurrence_date}
            style={[styles.timelineBlock, { top: topPx, height: heightPx }]}
          >
            <EventBlock
              ev={ev}
              onPress={onEventPress}
              onLongPress={enterEditMode}
              categoryLabel={getCategoryById(ev.category_id ?? null)?.name ?? ev.type}
              color={getCategoryById(ev.category_id ?? null)?.color ?? ev.color}
              timelineHeight={heightPx}
              appColors={appColors}
            />
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={styles.wrapper}>
      {showHeaders && (
        <>
          <View style={styles.row}>
            <View style={styles.timeRulerHeader} />
            <View style={[styles.columnHeader, { backgroundColor: appColors.surface, borderBottomColor: USER_COLORS.adrian + '40' }]}>
              <View style={[styles.columnDot, { backgroundColor: USER_COLORS.adrian }]} />
              <Text style={[styles.columnTitle, { color: USER_COLORS.adrian }]}>{USER_DISPLAY_NAMES.adrian}</Text>
            </View>
            <View style={[styles.columnHeader, { backgroundColor: appColors.surface, borderBottomColor: USER_COLORS.sarah + '40' }]}>
              <View style={[styles.columnDot, { backgroundColor: USER_COLORS.sarah }]} />
              <Text style={[styles.columnTitle, { color: USER_COLORS.sarah }]}>{USER_DISPLAY_NAMES.sarah}</Text>
            </View>
          </View>
        </>
      )}

      {hasAllDay && (
        <>
          <View style={[styles.allDayRow, { borderBottomColor: appColors.separator }]}>
            <View style={styles.timeRulerCell}>
              <Text style={[styles.timeLabel, { color: appColors.labelTertiary }]}>All day</Text>
            </View>
            <View style={styles.allDayColumn}>
              {allDayAdrian.map((ev) => (
                <EventBlock
                  key={ev.id + ev.occurrence_date}
                  ev={ev}
                  onPress={onEventPress}
                  onLongPress={enterEditMode}
                  categoryLabel={getCategoryById(ev.category_id ?? null)?.name ?? ev.type}
                  color={getCategoryById(ev.category_id ?? null)?.color ?? ev.color}
                  appColors={appColors}
                />
              ))}
            </View>
            <View style={[styles.columnDivider, { backgroundColor: appColors.separator }]} />
            <View style={styles.allDayColumn}>
              {allDaySarah.map((ev) => (
                <EventBlock
                  key={ev.id + ev.occurrence_date}
                  ev={ev}
                  onPress={onEventPress}
                  onLongPress={enterEditMode}
                  categoryLabel={getCategoryById(ev.category_id ?? null)?.name ?? ev.type}
                  color={getCategoryById(ev.category_id ?? null)?.color ?? ev.color}
                  appColors={appColors}
                />
              ))}
            </View>
          </View>
          {allDayShared.length > 0 && (
            <View style={[styles.allDayRow, styles.sharedAllDayRow, { borderBottomColor: appColors.separator }]}>
              <View style={styles.timeRulerCell}>
                <Text style={[styles.timeLabel, { color: appColors.labelTertiary }]}>All day</Text>
              </View>
              <View style={styles.sharedAllDayColumn}>
                {allDayShared.map((ev) => (
                  <EventBlock
                    key={ev.id + ev.occurrence_date}
                    ev={ev}
                    onPress={onEventPress}
                    onLongPress={enterEditMode}
                    categoryLabel={getCategoryById(ev.category_id ?? null)?.name ?? ev.type}
                    color={getCategoryById(ev.category_id ?? null)?.color ?? ev.color}
                    appColors={appColors}
                  />
                ))}
              </View>
            </View>
          )}
        </>
      )}

      {hasTimed ? (
        <ScrollView
          style={styles.timelineScroll}
          showsVerticalScrollIndicator={true}
          scrollEnabled={!editMode}
        >
          <View style={[styles.timelineRow, { height: timelineHeightPx }]}>
            {/* Hour separator lines (behind content) */}
            {hourLabels.map((h) => (
              <View
                key={`hr-${h}`}
                style={[
                  styles.hourLine,
                  { top: (h * 60 - dayStartMinutes) / totalDayMinutes * timelineHeightPx, backgroundColor: appColors.separator },
                ]}
              />
            ))}
            {/* Current time line - user theme color, only when viewing today */}
            {nowTopPx != null && (
              <View
                style={[styles.nowLine, { top: nowTopPx, backgroundColor: accentColor }]}
                pointerEvents="none"
              />
            )}
            <View style={[styles.timeRuler, { height: timelineHeightPx }]}>
              {hourLabels.map((h) => (
                <View key={h} style={[styles.timeRulerTick, { top: Math.max(0, (h * 60 - dayStartMinutes) / totalDayMinutes * timelineHeightPx - 6) }]}>
                  <Text style={[styles.timeLabel, { color: appColors.labelTertiary }]}>{formatHourLabel(h)}</Text>
                </View>
              ))}
            </View>
            <View style={styles.timelineColumnsWrapper}>
              {renderTimelineColumn('adrian', timedAdrian)}
              <View style={[styles.columnDivider, { backgroundColor: appColors.separator }]} />
              {renderTimelineColumn('sarah', timedSarah)}
              {timedShared.length > 0 && (
                <View style={[styles.sharedTimedOverlay, { height: timelineHeightPx }]} pointerEvents="box-none">
                  {timedShared.map(({ ev, topPx, heightPx }) =>
                    editMode && onUpdateEventTime && !ev.recurrence_id ? (
                      <EditableTimedEventBlock
                        key={ev.id + ev.occurrence_date}
                        ev={ev}
                        topPx={topPx}
                        heightPx={heightPx}
                        dateStr={dateStr}
                        dayStartMinutes={dayStartMinutes}
                        totalDayMinutes={totalDayMinutes}
                        timelineHeightPx={timelineHeightPx}
                        selectedDate={selectedDate}
                        categoryLabel={getCategoryById(ev.category_id ?? null)?.name ?? ev.type}
                        color={getCategoryById(ev.category_id ?? null)?.color ?? ev.color}
                        appColors={appColors}
                        onUpdateEventTime={onUpdateEventTime}
                        onDeleteEvent={onDeleteEvent}
                        sharedBlock
                      />
                    ) : (
                      <View
                        key={ev.id + ev.occurrence_date}
                        style={[styles.sharedTimedBlock, { top: topPx, height: heightPx }]}
                      >
                        <EventBlock
                          ev={ev}
                          onPress={onEventPress}
                          categoryLabel={getCategoryById(ev.category_id ?? null)?.name ?? ev.type}
                          color={getCategoryById(ev.category_id ?? null)?.color ?? ev.color}
                          timelineHeight={heightPx}
                          appColors={appColors}
                        />
                      </View>
                    )
                  )}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      ) : !hasAllDay ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyColumnText, { color: appColors.labelTertiary }]}>{emptyMsg.title}</Text>
        </View>
      ) : null}
    </View>
  );
}

const TIME_RULER_WIDTH = 44;

const styles = StyleSheet.create({
  wrapper: { flex: 1, minHeight: 120 },
  row: { flexDirection: 'row', alignItems: 'center' },
  timeRulerHeader: { width: TIME_RULER_WIDTH },
  columnHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingTop: 2,
    paddingBottom: 2,
    borderBottomWidth: 2,
  },
  columnDot: { width: 6, height: 6, borderRadius: 3 },
  columnTitle: { ...typography.caption, fontWeight: '700' },
  allDayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  timeRulerCell: { width: TIME_RULER_WIDTH, paddingTop: 2 },
  timeLabel: { ...typography.caption, fontWeight: '600' },
  allDayColumn: { flex: 1, gap: spacing.sm },
  sharedAllDayRow: { paddingVertical: spacing.xs },
  sharedAllDayColumn: { flex: 1, gap: spacing.sm, marginLeft: spacing.xs },
  columnDivider: { width: StyleSheet.hairlineWidth },
  timelineScroll: { flex: 1 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', position: 'relative' as const },
  timelineColumnsWrapper: { flex: 1, flexDirection: 'row', position: 'relative' as const },
  sharedTimedOverlay: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: spacing.xs,
    zIndex: 5,
  },
  sharedTimedBlock: {
    position: 'absolute' as const,
    left: spacing.xs,
    right: spacing.xs,
    borderRadius: radius.md,
    overflow: 'hidden' as const,
  },
  hourLine: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  nowLine: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    height: 2,
    zIndex: 10,
  },
  timeRuler: {
    width: TIME_RULER_WIDTH,
    position: 'relative' as const,
    paddingHorizontal: spacing.xs,
  },
  timeRulerTick: { position: 'absolute' as const, left: 0 },
  timelineColumn: {
    flex: 1,
    position: 'relative' as const,
    paddingHorizontal: spacing.xs,
  },
  timelineBlock: {
    position: 'absolute' as const,
    left: spacing.xs,
    right: spacing.xs,
    borderRadius: radius.md,
    overflow: 'hidden' as const,
  },
  editableBlockWrap: { flex: 1, flexDirection: 'column' as const },
  editableBlockBody: { flex: 1, minHeight: MIN_EVENT_HEIGHT_PX, overflow: 'hidden' as const, borderRadius: radius.md },
  deleteEventBtn: {
    position: 'absolute' as const,
    top: spacing.xs,
    right: spacing.xs,
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    zIndex: 10,
    ...shadows.sm,
  },
  resizeHandle: {
    height: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  resizeHandleLine: {
    width: 24,
    height: 3,
    borderRadius: 2,
  },
  emptyState: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyColumnText: { ...typography.footnote },
  block: {
    flexDirection: 'row',
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  blockStripe: { width: 3 },
  blockBody: { flex: 1, padding: spacing.xs, gap: 1 },
  typePill: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  typeText: { fontSize: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  blockTitle: { ...typography.caption, fontWeight: '600' },
  blockTime: { fontSize: 10 },
  blockNotes: { fontSize: 9, marginTop: 1 },
});
