import React, { useMemo, useRef, memo } from 'react';
import { View, Pressable, StyleSheet, Animated } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { getMonthGrid, isSameDay, isSameMonth, formatDate } from '@/utils/date';
import { ColorDot } from '@/components/ui/ColorDot';
import type { EventOccurrence } from '@/types';
import { typography, colors, radius, spacing } from '@/theme';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface MonthViewProps {
  month: Date;
  selectedDate: Date;
  occurrencesByDate: Record<string, EventOccurrence[]>;
  onSelectDate: (date: Date) => void;
  accentColor?: string;
  /** When false, only the grid is rendered (no Sun Mon Tue row). Default true. */
  showWeekdayHeader?: boolean;
}

export const WEEKDAY_LABELS_EXPORT = WEEKDAY_LABELS;

export function MonthView({ month, selectedDate, occurrencesByDate, onSelectDate, accentColor = '#3B82F6', showWeekdayHeader = true }: MonthViewProps) {
  const days = useMemo(() => getMonthGrid(month), [month]);
  const today = new Date();

  return (
    <View style={styles.container}>
      {showWeekdayHeader && (
        <View style={styles.headerRow}>
          {WEEKDAY_LABELS.map((d, i) => (
            <Text key={i} style={[styles.weekday, (i === 0 || i === 6) && styles.weekdayWeekend]}>{d}</Text>
          ))}
        </View>
      )}

      {/* Grid */}
      <View style={[styles.grid, !showWeekdayHeader && styles.gridNoHeader]}>
        {days.map((day, idx) => {
          const key = formatDate(day);
          const events = occurrencesByDate[key] ?? [];
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDate);
          const inMonth = isSameMonth(day, month);
          return (
            <DayCell
              key={idx}
              day={day}
              isToday={isToday}
              isSelected={isSelected}
              inMonth={inMonth}
              events={events}
              accentColor={accentColor}
              onSelectDate={onSelectDate}
            />
          );
        })}
      </View>
    </View>
  );
}

function DayCellInner({ day, isToday, isSelected, inMonth, events, accentColor, onSelectDate }: {
  day: Date; isToday: boolean; isSelected: boolean; inMonth: boolean;
  events: EventOccurrence[]; accentColor: string; onSelectDate: (d: Date) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, damping: 20, stiffness: 400 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 300 }).start();

  return (
    <Pressable onPress={() => onSelectDate(day)} onPressIn={onPressIn} onPressOut={onPressOut} style={styles.dayCell}>
      <Animated.View style={[
        styles.dayInner,
        isSelected && { backgroundColor: accentColor + '16' },
        { transform: [{ scale }] },
      ]}>
        <View style={[
          styles.dayCircle,
          isToday && { backgroundColor: accentColor },
          isSelected && !isToday && { borderWidth: 1.5, borderColor: accentColor },
        ]}>
          <Text style={[
            styles.dayText,
            !inMonth && styles.dayTextFaded,
            isToday && styles.dayTextToday,
            isSelected && !isToday && { color: accentColor, fontWeight: '700' },
          ]}>
            {day.getDate()}
          </Text>
        </View>
        {events.length > 0 ? (
          <View style={styles.dots}>
            {events.slice(0, 3).map((ev, i) => (
              <ColorDot key={i} color={isSelected ? accentColor : ev.color} size={4} />
            ))}
          </View>
        ) : <View style={styles.dotsEmpty} />}
      </Animated.View>
    </Pressable>
  );
}

export const DayCell = memo(DayCellInner, (prev, next) =>
  prev.day.getTime() === next.day.getTime() &&
  prev.isSelected === next.isSelected &&
  prev.isToday === next.isToday &&
  prev.inMonth === next.inMonth &&
  prev.events === next.events &&
  prev.accentColor === next.accentColor
);

const styles = StyleSheet.create({
  container: { backgroundColor: colors.surface },
  headerRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  weekday: {
    flex: 1, textAlign: 'center',
    fontSize: 11, fontWeight: '600',
    color: colors.labelTertiary, letterSpacing: 0.3,
  },
  weekdayWeekend: { color: colors.labelTertiary + 'BB' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xs, paddingTop: spacing.xs },
  gridNoHeader: { paddingTop: spacing.xxs },
  dayCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 2 },
  dayInner: { alignItems: 'center', borderRadius: radius.sm, paddingVertical: 3, width: '100%' },
  dayCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 14, fontWeight: '400', color: colors.label },
  dayTextFaded: { color: colors.labelQuaternary },
  dayTextToday: { color: '#fff', fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 2, marginTop: 3, height: 5, alignItems: 'center' },
  dotsEmpty: { height: 5 + 3 },
});
