import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet, ScrollView } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { getWeekDays, isSameDay, formatDate, formatTime } from '@/utils/date';
import type { EventOccurrence } from '@/types';
import { format } from 'date-fns';
import { typography, colors, radius, spacing } from '@/theme';

interface WeekViewProps {
  currentDate: Date;
  selectedDate: Date;
  occurrencesByDate: Record<string, EventOccurrence[]>;
  onSelectDate: (date: Date) => void;
  accentColor?: string;
}

export function WeekView({
  currentDate,
  selectedDate,
  occurrencesByDate,
  onSelectDate,
  accentColor = '#3B82F6',
}: WeekViewProps) {
  const days = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const today = new Date();
  const key = formatDate(selectedDate);
  const events = occurrencesByDate[key] ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDate);
          return (
            <Pressable
              key={i}
              style={styles.headerCell}
              onPress={() => onSelectDate(day)}
            >
              <Text style={styles.dowLabel}>{format(day, 'EEE')}</Text>
              <View
                style={[
                  styles.dateCircle,
                  isToday && { backgroundColor: accentColor },
                  isSelected && !isToday && { borderWidth: 2, borderColor: accentColor },
                ]}
              >
                <Text
                  style={[
                    styles.dateNumber,
                    isToday && styles.todayText,
                    isSelected && !isToday && { color: accentColor, fontWeight: '600' },
                  ]}
                >
                  {day.getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <ScrollView style={styles.eventsArea} showsVerticalScrollIndicator={false}>
        {events.length === 0 ? (
          <Text style={styles.noEvents}>No events today</Text>
        ) : (
          events.map((ev) => (
            <View key={ev.id + ev.occurrence_date} style={[styles.eventRow, { borderLeftColor: ev.color }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.eventTitle}>{ev.title}</Text>
                {!ev.all_day ? (
                  <Text style={styles.eventTime}>
                    {formatTime(ev.start_at)} – {formatTime(ev.end_at)}
                  </Text>
                ) : (
                  <Text style={styles.eventTime}>All day</Text>
                )}
              </View>
              <View style={[styles.colorBar, { backgroundColor: ev.color }]} />
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  headerCell: { flex: 1, alignItems: 'center' },
  dowLabel: {
    ...typography.caption,
    color: colors.labelTertiary,
    marginBottom: spacing.xs,
  },
  dateCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateNumber: { ...typography.subhead, color: colors.label },
  todayText: { color: '#fff', fontWeight: '700' },
  eventsArea: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  noEvents: {
    textAlign: 'center',
    color: colors.labelTertiary,
    marginTop: 40,
    ...typography.body,
  },
  eventRow: {
    borderLeftWidth: 4,
    paddingLeft: spacing.md,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.fillSecondary,
    borderRadius: radius.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventTitle: { ...typography.subhead, color: colors.label },
  eventTime: { ...typography.footnote, color: colors.labelSecondary, marginTop: 2 },
  colorBar: { width: 4, height: 36, borderRadius: 2, marginLeft: spacing.sm },
});
