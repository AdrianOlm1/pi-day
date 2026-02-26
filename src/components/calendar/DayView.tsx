import React from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { format } from 'date-fns';
import { isSameDay } from '@/utils/date';
import type { EventOccurrence, Goal, Order } from '@/types';
import { typography, radius, spacing } from '@/theme';
import { useAppColors } from '@/contexts/ThemeContext';
import { DayItinerary } from '@/components/calendar/DayItinerary';
import { DayGoalsSection } from '@/components/calendar/DayGoalsSection';
import { DayOrdersSection } from '@/components/calendar/DayOrdersSection';
import { useEmptyStateMessage } from '@/hooks/useEmptyStateMessage';
import { EMPTY_CALENDAR } from '@/utils/emptyStateMessages';
import { EmptyStateIllustration } from '@/components/ui/EmptyStateIllustration';

function DaySummaryLine({
  eventCount,
  goalCount,
  orderCount,
  appColors,
}: {
  eventCount: number;
  goalCount: number;
  orderCount: number;
  appColors: ReturnType<typeof useAppColors>;
}) {
  const parts: string[] = [];
  if (eventCount > 0) parts.push(`${eventCount} event${eventCount !== 1 ? 's' : ''}`);
  if (goalCount > 0) parts.push(`${goalCount} goal${goalCount !== 1 ? 's' : ''}`);
  if (orderCount > 0) parts.push(`${orderCount} order${orderCount !== 1 ? 's' : ''}`);
  const text = parts.length === 0 ? 'Nothing scheduled' : parts.join(' · ');
  return (
    <Text style={[styles.summaryLine, { color: appColors.labelTertiary }]} numberOfLines={1}>
      {text}
    </Text>
  );
}

interface DayViewProps {
  selectedDate: Date;
  occurrencesByDate: Record<string, EventOccurrence[]>;
  goals?: Goal[];
  orders?: Order[];
  accentColor?: string;
  onEventPress?: (ev: EventOccurrence) => void;
  onScroll?: (e: { nativeEvent: { contentOffset: { y: number } } }) => void;
  /** When provided and day has no events, tapping the empty area calls this (e.g. to expand the week strip). */
  onRequestExpandStrip?: () => void;
  isCheckedInForDate?: (goal: Goal, dateStr: string) => boolean;
  onCheckIn?: (goal: Goal) => Promise<void>;
  onUncheck?: (goal: Goal) => void;
  onOrderPress?: (order: Order) => void;
  /** iOS-style edit mode: long-press header to enter; move/resize timed events. */
  editMode?: boolean;
  onEditModeChange?: (value: boolean) => void;
  onUpdateEventTime?: (ev: EventOccurrence, newStartAt: string, newEndAt: string) => Promise<void>;
  onDeleteEvent?: (ev: EventOccurrence) => void;
}

export function DayView({
  selectedDate,
  occurrencesByDate,
  goals = [],
  orders = [],
  accentColor: accentProp,
  onEventPress,
  onScroll,
  onRequestExpandStrip,
  isCheckedInForDate,
  onCheckIn,
  onUncheck,
  onOrderPress,
  editMode = false,
  onEditModeChange,
  onUpdateEventTime,
  onDeleteEvent,
}: DayViewProps) {
  const appColors = useAppColors();
  const accentColor = accentProp ?? appColors.gradientFrom;
  const key = format(selectedDate, 'yyyy-MM-dd');
  const events = occurrencesByDate[key] ?? [];
  const isToday = isSameDay(selectedDate, new Date());
  const emptyMsg = useEmptyStateMessage(EMPTY_CALENDAR);
  const hasGoals = goals.length > 0 && isCheckedInForDate != null && onCheckIn != null && onUncheck != null;
  const hasOrders = orders.length > 0 && onOrderPress != null;

  return (
    <View style={styles.dayPage}>
      <Pressable
        style={[
          styles.dateHeader,
          { backgroundColor: appColors.surface, borderBottomColor: appColors.separator },
          isToday && { borderBottomColor: accentColor + '30' },
          editMode && { borderBottomColor: accentColor + '50' },
        ]}
        onPress={events.length === 0 && !hasGoals && !hasOrders && !editMode ? onRequestExpandStrip : undefined}
      >
        <View style={styles.dateLeft}>
          <Text style={[styles.dayName, { color: appColors.label }, isToday && { color: accentColor }]}>
            {format(selectedDate, 'EEEE')}
          </Text>
          <Text style={[styles.dateNum, { color: appColors.labelSecondary }]}>{format(selectedDate, 'MMMM d, yyyy')}</Text>
          <DaySummaryLine eventCount={events.length} goalCount={goals.length} orderCount={orders.length} appColors={appColors} />
        </View>
        {editMode && onEditModeChange ? (
          <Pressable
            onPress={() => onEditModeChange(false)}
            style={[styles.doneBtn, { backgroundColor: accentColor }]}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        ) : isToday ? (
          <View style={[styles.todayBadge, { backgroundColor: accentColor }]}>
            <Text style={styles.todayText}>Today</Text>
          </View>
        ) : null}
      </Pressable>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {events.length > 0 ? (
          <View style={styles.section}>
            <DayItinerary
              events={events}
              selectedDate={selectedDate}
              accentColor={accentColor}
              onEventPress={editMode ? undefined : onEventPress}
              editMode={editMode}
              onEditModeChange={onEditModeChange}
              onUpdateEventTime={onUpdateEventTime}
              onDeleteEvent={onDeleteEvent}
            />
          </View>
        ) : (
          <Pressable style={styles.emptyContainer} onPress={onRequestExpandStrip}>
            <View style={styles.emptyWrap}>
              <EmptyStateIllustration variant="window" size={56} />
              <Text style={[styles.empty, { color: appColors.labelSecondary }]}>{emptyMsg.title}</Text>
              <Text style={[styles.emptySub, { color: appColors.labelTertiary }]}>
                {emptyMsg.subtitle || (onRequestExpandStrip ? 'Tap to show week' : 'Enjoy your free time')}
              </Text>
            </View>
          </Pressable>
        )}

        {hasGoals && isCheckedInForDate && onCheckIn && onUncheck && (
          <View style={[styles.section, events.length === 0 && styles.sectionAfterEmpty]}>
            <DayGoalsSection
              goals={goals}
              selectedDate={selectedDate}
              isToday={isToday}
              accentColor={accentColor}
              isCheckedInForDate={isCheckedInForDate}
              onCheckIn={onCheckIn}
              onUncheck={onUncheck}
              entranceDelay={60}
            />
          </View>
        )}

        {hasOrders && onOrderPress && (
          <View
            style={[
              styles.section,
              events.length === 0 && !hasGoals && styles.sectionAfterEmpty,
            ]}
          >
            <DayOrdersSection
              orders={orders}
              selectedDate={selectedDate}
              accentColor={accentColor}
              onOrderPress={onOrderPress}
              entranceDelay={hasGoals ? 120 : 60}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  dayPage: { flex: 1 },
  dateHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderBottomWidth: 1.5,
  },
  dateLeft: { gap: 2 },
  dayName: { ...typography.title3 },
  dateNum: { ...typography.subhead, fontWeight: '400' },
  summaryLine: { ...typography.caption, marginTop: 2 },
  todayBadge: { borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  todayText: { fontSize: 12, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
  doneBtn: { borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  doneBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: 100, flexGrow: 1 },
  section: { marginBottom: spacing.lg },
  sectionAfterEmpty: { marginTop: spacing.xl },
  emptyContainer: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    maxWidth: 260,
    paddingHorizontal: spacing.lg,
  },
  empty: { ...typography.callout, textAlign: 'center' },
  emptySub: { ...typography.body, marginTop: spacing.xs, textAlign: 'center' },
});
