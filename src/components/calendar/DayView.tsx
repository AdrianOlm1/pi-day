import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { format } from 'date-fns';
import { isSameDay } from '@/utils/date';
import type { EventOccurrence } from '@/types';
import { typography, colors, radius, spacing } from '@/theme';
import { DayItinerary } from '@/components/calendar/DayItinerary';

interface DayViewProps {
  selectedDate: Date;
  occurrencesByDate: Record<string, EventOccurrence[]>;
  accentColor?: string;
  onEventPress?: (ev: EventOccurrence) => void;
  onScroll?: (e: { nativeEvent: { contentOffset: { y: number } } }) => void;
}

export function DayView({
  selectedDate,
  occurrencesByDate,
  accentColor = '#3B82F6',
  onEventPress,
  onScroll,
}: DayViewProps) {
  const key = format(selectedDate, 'yyyy-MM-dd');
  const events = occurrencesByDate[key] ?? [];
  const isToday = isSameDay(selectedDate, new Date());

  return (
    <View style={styles.dayPage}>
      <View style={[styles.dateHeader, isToday && { borderBottomColor: accentColor + '30' }]}>
        <View style={styles.dateLeft}>
          <Text style={[styles.dayName, isToday && { color: accentColor }]}>
            {format(selectedDate, 'EEEE')}
          </Text>
          <Text style={styles.dateNum}>{format(selectedDate, 'MMMM d, yyyy')}</Text>
        </View>
        {isToday && (
          <View style={[styles.todayBadge, { backgroundColor: accentColor }]}>
            <Text style={styles.todayText}>Today</Text>
          </View>
        )}
      </View>

      <View style={styles.eventsList}>
        {events.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.empty}>No events</Text>
            <Text style={styles.emptySub}>Enjoy your free time</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.itineraryScroll}
            contentContainerStyle={styles.itineraryScrollContent}
            showsVerticalScrollIndicator={true}
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            <DayItinerary
              events={events}
              selectedDate={selectedDate}
              accentColor={accentColor}
              onEventPress={onEventPress}
            />
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dayPage: { flex: 1 },
  dateHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1.5, borderBottomColor: colors.separator,
  },
  dateLeft: { gap: 2 },
  dayName: { ...typography.title3, color: colors.label },
  dateNum: { ...typography.subhead, color: colors.labelSecondary, fontWeight: '400' },
  todayBadge: { borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  todayText: { fontSize: 12, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
  eventsList: { padding: spacing.lg, flex: 1 },
  itineraryScroll: { flex: 1 },
  itineraryScrollContent: { flexGrow: 1, paddingBottom: spacing.xl },
  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  empty: { ...typography.callout, color: colors.labelSecondary },
  emptySub: { ...typography.body, color: colors.labelTertiary, marginTop: spacing.xs },
});
