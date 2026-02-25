import React from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { format } from 'date-fns';
import { isSameDay } from '@/utils/date';
import type { EventOccurrence } from '@/types';
import { typography, radius, spacing } from '@/theme';
import { useAppColors } from '@/contexts/ThemeContext';
import { DayItinerary } from '@/components/calendar/DayItinerary';

interface DayViewProps {
  selectedDate: Date;
  occurrencesByDate: Record<string, EventOccurrence[]>;
  accentColor?: string;
  onEventPress?: (ev: EventOccurrence) => void;
  onScroll?: (e: { nativeEvent: { contentOffset: { y: number } } }) => void;
  /** When provided and day has no events, tapping the empty area calls this (e.g. to expand the week strip). */
  onRequestExpandStrip?: () => void;
}

export function DayView({
  selectedDate,
  occurrencesByDate,
  accentColor: accentProp,
  onEventPress,
  onScroll,
  onRequestExpandStrip,
}: DayViewProps) {
  const appColors = useAppColors();
  const accentColor = accentProp ?? appColors.gradientFrom;
  const key = format(selectedDate, 'yyyy-MM-dd');
  const events = occurrencesByDate[key] ?? [];
  const isToday = isSameDay(selectedDate, new Date());

  return (
    <View style={styles.dayPage}>
      <Pressable
        style={[
          styles.dateHeader,
          { backgroundColor: appColors.surface, borderBottomColor: appColors.separator },
          isToday && { borderBottomColor: accentColor + '30' },
        ]}
        onPress={events.length === 0 ? onRequestExpandStrip : undefined}
      >
        <View style={styles.dateLeft}>
          <Text style={[styles.dayName, { color: appColors.label }, isToday && { color: accentColor }]}>
            {format(selectedDate, 'EEEE')}
          </Text>
          <Text style={[styles.dateNum, { color: appColors.labelSecondary }]}>{format(selectedDate, 'MMMM d, yyyy')}</Text>
        </View>
        {isToday && (
          <View style={[styles.todayBadge, { backgroundColor: accentColor }]}>
            <Text style={styles.todayText}>Today</Text>
          </View>
        )}
      </Pressable>

      <View style={styles.eventsList}>
        {events.length === 0 ? (
          <Pressable
            style={styles.emptyContainer}
            onPress={onRequestExpandStrip}
          >
            <View style={styles.emptyWrap}>
              <Text style={[styles.empty, { color: appColors.labelSecondary }]}>No events</Text>
              <Text style={[styles.emptySub, { color: appColors.labelTertiary }]}>
                {onRequestExpandStrip ? 'Tap to show week' : 'Enjoy your free time'}
              </Text>
            </View>
          </Pressable>
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
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderBottomWidth: 1.5,
  },
  dateLeft: { gap: 2 },
  dayName: { ...typography.title3 },
  dateNum: { ...typography.subhead, fontWeight: '400' },
  todayBadge: { borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  todayText: { fontSize: 12, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
  eventsList: { padding: spacing.lg, flex: 1 },
  itineraryScroll: { flex: 1 },
  itineraryScrollContent: { flexGrow: 1, paddingBottom: spacing.xl },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  empty: { ...typography.callout },
  emptySub: { ...typography.body, marginTop: spacing.xs },
});
