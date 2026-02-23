import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { formatTime } from '@/utils/date';
import { useCategories } from '@/hooks/useCategories';
import type { EventOccurrence, UserId } from '@/types';
import { USER_COLORS } from '@/utils/colors';
import { typography, colors, radius, spacing, shadows } from '@/theme';

const USER_DISPLAY_NAMES: Record<UserId, string> = {
  adrian: "Adrian's",
  sarah: "Sarah's",
};

const DEFAULT_START_HOUR = 6;
const END_HOUR = 24;
const MINUTES_PER_DAY = 24 * 60;
const PIXELS_PER_HOUR = 52;
const MIN_EVENT_HEIGHT_PX = 36;

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
  categoryLabel: string;
  /** When set, render as a timeline block with fixed height (one block per event, height = duration). */
  timelineHeight?: number;
}

function EventBlock({ ev, onPress, categoryLabel, timelineHeight }: EventBlockProps) {
  return (
    <Pressable
      style={[styles.block, timelineHeight != null && { minHeight: timelineHeight }]}
      onPress={() => onPress?.(ev)}
    >
      <View style={[styles.blockStripe, { backgroundColor: ev.color }]} />
      <View style={styles.blockBody}>
        <View style={[styles.typePill, { backgroundColor: ev.color + '18' }]}>
          <Text style={[styles.typeText, { color: ev.color }]}>{categoryLabel}</Text>
        </View>
        <Text style={styles.blockTitle} numberOfLines={timelineHeight != null ? 3 : 2}>{ev.title}</Text>
        <Text style={styles.blockTime}>
          {ev.all_day ? 'All day' : `${formatTime(ev.start_at)} – ${formatTime(ev.end_at)}`}
        </Text>
        {ev.notes && timelineHeight == null ? (
          <Text style={styles.blockNotes} numberOfLines={2}>{ev.notes}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

type TimedEventPlacement = { ev: EventOccurrence; topPx: number; heightPx: number };

interface DayItineraryProps {
  events: EventOccurrence[];
  selectedDate: Date;
  accentColor?: string;
  onEventPress?: (ev: EventOccurrence) => void;
  showHeaders?: boolean;
}

export function DayItinerary({
  events,
  selectedDate,
  accentColor = '#3B82F6',
  onEventPress,
  showHeaders = true,
}: DayItineraryProps) {
  const { getCategoryById } = useCategories();

  const {
    dateStr,
    dayStartMinutes,
    totalDayMinutes,
    timelineHeightPx,
    hourLabels,
    allDayAdrian,
    allDaySarah,
    timedAdrian,
    timedSarah,
  } = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const adrian: EventOccurrence[] = [];
    const sarah: EventOccurrence[] = [];
    for (const ev of events) {
      if (ev.user_id === 'adrian') adrian.push(ev);
      else sarah.push(ev);
    }
    const allDayAdrian = sortEvents(adrian.filter((e) => e.all_day));
    const allDaySarah = sortEvents(sarah.filter((e) => e.all_day));
    const timedAdrianList = adrian.filter((e) => !e.all_day);
    const timedSarahList = sarah.filter((e) => !e.all_day);

    let dayStartMinutes = DEFAULT_START_HOUR * 60;
    for (const ev of [...timedAdrianList, ...timedSarahList]) {
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

    return {
      dateStr,
      dayStartMinutes,
      totalDayMinutes,
      timelineHeightPx,
      hourLabels,
      allDayAdrian,
      allDaySarah,
      timedAdrian,
      timedSarah,
    };
  }, [events, selectedDate]);

  const hasAllDay = allDayAdrian.length > 0 || allDaySarah.length > 0;
  const hasTimed = timedAdrian.length > 0 || timedSarah.length > 0;

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

  const renderTimelineColumn = (userId: UserId, placements: TimedEventPlacement[]) => (
    <View key={userId} style={[styles.timelineColumn, { height: timelineHeightPx }]}>
      {placements.map(({ ev, topPx, heightPx }) => (
        <View
          key={ev.id + ev.occurrence_date}
          style={[styles.timelineBlock, { top: topPx, height: heightPx }]}
        >
          <EventBlock
            ev={ev}
            onPress={onEventPress}
            categoryLabel={getCategoryById(ev.category_id ?? null)?.name ?? ev.type}
            timelineHeight={heightPx}
          />
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.wrapper}>
      {showHeaders && (
        <View style={styles.row}>
          <View style={styles.timeRulerHeader} />
          <View style={[styles.columnHeader, { borderBottomColor: USER_COLORS.adrian + '40' }]}>
            <View style={[styles.columnDot, { backgroundColor: USER_COLORS.adrian }]} />
            <Text style={[styles.columnTitle, { color: USER_COLORS.adrian }]}>{USER_DISPLAY_NAMES.adrian}</Text>
          </View>
          <View style={[styles.columnHeader, { borderBottomColor: USER_COLORS.sarah + '40' }]}>
            <View style={[styles.columnDot, { backgroundColor: USER_COLORS.sarah }]} />
            <Text style={[styles.columnTitle, { color: USER_COLORS.sarah }]}>{USER_DISPLAY_NAMES.sarah}</Text>
          </View>
        </View>
      )}

      {hasAllDay && (
        <View style={styles.allDayRow}>
          <View style={styles.timeRulerCell}>
            <Text style={styles.timeLabel}>All day</Text>
          </View>
          <View style={styles.allDayColumn}>
            {allDayAdrian.map((ev) => (
              <EventBlock
                key={ev.id + ev.occurrence_date}
                ev={ev}
                onPress={onEventPress}
                categoryLabel={getCategoryById(ev.category_id ?? null)?.name ?? ev.type}
              />
            ))}
          </View>
          <View style={styles.columnDivider} />
          <View style={styles.allDayColumn}>
            {allDaySarah.map((ev) => (
              <EventBlock
                key={ev.id + ev.occurrence_date}
                ev={ev}
                onPress={onEventPress}
                categoryLabel={getCategoryById(ev.category_id ?? null)?.name ?? ev.type}
              />
            ))}
          </View>
        </View>
      )}

      {hasTimed ? (
        <ScrollView style={styles.timelineScroll} showsVerticalScrollIndicator={true}>
          <View style={[styles.timelineRow, { height: timelineHeightPx }]}>
            {/* Hour separator lines (behind content) */}
            {hourLabels.map((h) => (
              <View
                key={`hr-${h}`}
                style={[
                  styles.hourLine,
                  { top: (h * 60 - dayStartMinutes) / totalDayMinutes * timelineHeightPx },
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
                  <Text style={styles.timeLabel}>{formatHourLabel(h)}</Text>
                </View>
              ))}
            </View>
            {renderTimelineColumn('adrian', timedAdrian)}
            <View style={styles.columnDivider} />
            {renderTimelineColumn('sarah', timedSarah)}
          </View>
        </ScrollView>
      ) : !hasAllDay ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyColumnText}>Nothing scheduled</Text>
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
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    backgroundColor: colors.surface,
  },
  columnDot: { width: 8, height: 8, borderRadius: 4 },
  columnTitle: { ...typography.subhead, fontWeight: '700' },
  allDayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
    gap: spacing.sm,
  },
  timeRulerCell: { width: TIME_RULER_WIDTH, paddingTop: 2 },
  timeLabel: { ...typography.caption, color: colors.labelTertiary, fontWeight: '600' },
  allDayColumn: { flex: 1, gap: spacing.sm },
  columnDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.separator },
  timelineScroll: { flex: 1 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', position: 'relative' as const },
  hourLine: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
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
  timeRulerTick: {
    position: 'absolute' as const,
    left: 0,
  },
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
  emptyState: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyColumnText: { ...typography.footnote, color: colors.labelTertiary },
  block: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  blockStripe: { width: 4 },
  blockBody: { flex: 1, padding: spacing.sm, gap: 2 },
  typePill: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  typeText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  blockTitle: { ...typography.footnote, fontWeight: '600', color: colors.label },
  blockTime: { fontSize: 11, color: colors.labelSecondary },
  blockNotes: { fontSize: 10, color: colors.labelTertiary, marginTop: 2 },
});
