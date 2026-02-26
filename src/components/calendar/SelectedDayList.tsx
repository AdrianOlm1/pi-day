import React from 'react';
import { View, ScrollView, StyleSheet, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
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

interface SelectedDayListProps {
  selectedDate: Date;
  events: EventOccurrence[];
  goals?: Goal[];
  orders?: Order[];
  accentColor?: string;
  onEventPress?: (ev: EventOccurrence) => void;
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  isCheckedInForDate?: (goal: Goal, dateStr: string) => boolean;
  onCheckIn?: (goal: Goal) => Promise<void>;
  onUncheck?: (goal: Goal) => void;
  onOrderPress?: (order: Order) => void;
}

export function SelectedDayList({
  selectedDate,
  events,
  goals = [],
  orders = [],
  accentColor: accentProp,
  onEventPress,
  onScroll,
  isCheckedInForDate,
  onCheckIn,
  onUncheck,
  onOrderPress,
}: SelectedDayListProps) {
  const appColors = useAppColors();
  const accentColor = accentProp ?? appColors.gradientFrom;
  const today = new Date();
  const isToday = isSameDay(selectedDate, today);
  const emptyMsg = useEmptyStateMessage(EMPTY_CALENDAR);
  const hasGoals = goals.length > 0 && isCheckedInForDate != null && onCheckIn != null && onUncheck != null;
  const hasOrders = orders.length > 0 && onOrderPress != null;

  return (
    <View style={styles.wrapper}>
      <View style={[
        styles.dateHeader,
        { backgroundColor: appColors.surface, borderBottomColor: appColors.separator },
        isToday && { borderBottomColor: accentColor + '30' },
      ]}>
        <View style={styles.dateLeft}>
          <Text style={[styles.dayName, { color: appColors.label }, isToday && { color: accentColor }]}>
            {format(selectedDate, 'EEEE')}
          </Text>
          <Text style={[styles.dateNum, { color: appColors.labelSecondary }]}>{format(selectedDate, 'MMMM d, yyyy')}</Text>
          <DaySummaryLine eventCount={events.length} goalCount={goals.length} orderCount={orders.length} appColors={appColors} />
        </View>
        {isToday && (
          <View style={[styles.todayBadge, { backgroundColor: accentColor }]}>
            <Text style={styles.todayText}>Today</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>
        {events.length > 0 ? (
          <DayItinerary events={events} selectedDate={selectedDate} accentColor={accentColor} onEventPress={onEventPress} />
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={[styles.empty, { color: appColors.labelSecondary }]}>{emptyMsg.title}</Text>
            {emptyMsg.subtitle ? <Text style={[styles.emptySub, { color: appColors.labelTertiary }]}>{emptyMsg.subtitle}</Text> : null}
          </View>
        )}

        {hasGoals && isCheckedInForDate && onCheckIn && onUncheck && (
          <View style={styles.goalsOrdersWrap}>
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
          <View style={styles.goalsOrdersWrap}>
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
  wrapper: { flex: 1, minHeight: 120 },
  dateHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    borderBottomWidth: 1.5,
  },
  dateLeft: { gap: 2 },
  dayName: { ...typography.title3 },
  dateNum: { ...typography.subhead, fontWeight: '400' },
  summaryLine: { ...typography.caption, marginTop: 2 },
  todayBadge: { borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  todayText: { fontSize: 12, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100, flexGrow: 1 },
  goalsOrdersWrap: { marginHorizontal: spacing.lg },
  emptyWrap: { alignItems: 'center', paddingTop: 40 },
  empty: { ...typography.callout },
  emptySub: { ...typography.body, marginTop: spacing.xs },
});
