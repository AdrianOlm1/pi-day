import React from 'react';
import { View, ScrollView, StyleSheet, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { format } from 'date-fns';
import { isSameDay } from '@/utils/date';
import type { EventOccurrence } from '@/types';
import { typography, radius, spacing } from '@/theme';
import { useAppColors } from '@/contexts/ThemeContext';
import { DayItinerary } from '@/components/calendar/DayItinerary';

interface SelectedDayListProps {
  selectedDate: Date;
  events: EventOccurrence[];
  accentColor?: string;
  onEventPress?: (ev: EventOccurrence) => void;
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

export function SelectedDayList({ selectedDate, events, accentColor: accentProp, onEventPress, onScroll }: SelectedDayListProps) {
  const appColors = useAppColors();
  const accentColor = accentProp ?? appColors.gradientFrom;
  const today = new Date();
  const isToday = isSameDay(selectedDate, today);

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
        </View>
        {isToday && (
          <View style={[styles.todayBadge, { backgroundColor: accentColor }]}>
            <Text style={styles.todayText}>Today</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>
        {events.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.empty, { color: appColors.labelSecondary }]}>No events</Text>
            <Text style={[styles.emptySub, { color: appColors.labelTertiary }]}>Enjoy your free time</Text>
          </View>
        ) : (
          <DayItinerary events={events} selectedDate={selectedDate} accentColor={accentColor} onEventPress={onEventPress} />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, minHeight: 120 },
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
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100, flexGrow: 1 },
  emptyWrap: { alignItems: 'center', paddingTop: 40 },
  empty: { ...typography.callout },
  emptySub: { ...typography.body, marginTop: spacing.xs },
});
