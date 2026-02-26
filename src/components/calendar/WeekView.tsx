import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet, ScrollView } from 'react-native';
import AnimatedReanimated, { FadeInDown } from 'react-native-reanimated';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { getWeekDays, isSameDay, formatDate, formatTime } from '@/utils/date';
import type { EventOccurrence } from '@/types';
import { format } from 'date-fns';
import { typography, radius, spacing } from '@/theme';
import { useAppColors } from '@/contexts/ThemeContext';
import { useEmptyStateMessage } from '@/hooks/useEmptyStateMessage';
import { EMPTY_CALENDAR_WEEK } from '@/utils/emptyStateMessages';

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
  accentColor: accentProp,
}: WeekViewProps) {
  const appColors = useAppColors();
  const accentColor = accentProp ?? appColors.gradientFrom;
  const emptyMsg = useEmptyStateMessage(EMPTY_CALENDAR_WEEK);
  const days = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const today = new Date();
  const key = formatDate(selectedDate);
  const events = occurrencesByDate[key] ?? [];

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { backgroundColor: appColors.surface, borderBottomColor: appColors.separator }]}>
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDate);
          return (
            <Pressable
              key={i}
              style={styles.headerCell}
              onPress={() => onSelectDate(day)}
            >
              <Text style={[styles.dowLabel, { color: appColors.labelTertiary }]}>{format(day, 'EEE')}</Text>
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
                    { color: appColors.label },
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
          <View style={styles.emptyWrap}>
            <Text style={[styles.noEvents, { color: appColors.labelTertiary }]}>{emptyMsg.title}</Text>
            {emptyMsg.subtitle ? <Text style={[styles.emptySub, { color: appColors.labelQuaternary }]}>{emptyMsg.subtitle}</Text> : null}
          </View>
        ) : (
          events.map((ev, idx) => (
            <AnimatedReanimated.View key={ev.id + ev.occurrence_date} entering={FadeInDown.delay(idx * 45).duration(260)}>
              <View style={[styles.eventRow, { borderLeftColor: ev.color, backgroundColor: appColors.fillSecondary }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.eventTitle, { color: appColors.label }]}>{ev.title}</Text>
                  {!ev.all_day ? (
                    <Text style={[styles.eventTime, { color: appColors.labelSecondary }]}>
                      {formatTime(ev.start_at)} – {formatTime(ev.end_at)}
                    </Text>
                  ) : (
                    <Text style={[styles.eventTime, { color: appColors.labelSecondary }]}>All day</Text>
                  )}
                </View>
                <View style={[styles.colorBar, { backgroundColor: ev.color }]} />
              </View>
            </AnimatedReanimated.View>
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
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCell: { flex: 1, alignItems: 'center' },
  dowLabel: { ...typography.caption, marginBottom: spacing.xs },
  dateCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateNumber: { ...typography.subhead },
  todayText: { color: '#fff', fontWeight: '700' },
  eventsArea: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  emptyWrap: { alignItems: 'center', marginTop: 40 },
  noEvents: { textAlign: 'center', ...typography.body },
  emptySub: { marginTop: spacing.xs, ...typography.footnote, textAlign: 'center' },
  eventRow: {
    borderLeftWidth: 4,
    paddingLeft: spacing.md,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventTitle: { ...typography.subhead },
  eventTime: { ...typography.footnote, marginTop: 2 },
  colorBar: { width: 4, height: 36, borderRadius: 2, marginLeft: spacing.sm },
});
