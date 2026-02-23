import React, { useMemo, useState } from 'react';
import { View, Pressable, StyleSheet, ScrollView } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { Ionicons } from '@expo/vector-icons';
import { addMonths, subMonths, startOfMonth, isSameDay, isSameMonth, isBefore, startOfDay } from 'date-fns';
import { getMonthGrid, formatDate } from '@/utils/date';
import { typography, colors, radius, spacing } from '@/theme';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Single date selection (e.g. "ends on" for weekly recurrence) */
export interface DatePickerCalendarSingleProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  minDate?: Date;
  accentColor?: string;
}

/** Multi date selection (e.g. custom recurrence dates) */
export interface DatePickerCalendarMultiProps {
  selectedDates: string[];
  onSelectDates: (dates: string[]) => void;
  accentColor?: string;
}

type Props = DatePickerCalendarSingleProps | DatePickerCalendarMultiProps;

function isSingleProps(p: Props): p is DatePickerCalendarSingleProps {
  return 'selectedDate' in p && 'onSelectDate' in p;
}

export function DatePickerCalendar(props: Props) {
  const accentColor = props.accentColor ?? '#3B82F6';
  const [viewMonth, setViewMonth] = useState(() => {
    if (isSingleProps(props) && props.selectedDate) return startOfMonth(props.selectedDate);
    return startOfMonth(new Date());
  });

  const days = useMemo(() => getMonthGrid(viewMonth), [viewMonth]);
  const today = startOfDay(new Date());

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Pressable onPress={() => setViewMonth((m) => subMonths(m, 1))} style={styles.navBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={colors.label} />
        </Pressable>
        <Text style={styles.monthLabel}>{viewMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</Text>
        <Pressable onPress={() => setViewMonth((m) => addMonths(m, 1))} style={styles.navBtn} hitSlop={8}>
          <Ionicons name="chevron-forward" size={20} color={colors.label} />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((d, i) => (
          <Text key={i} style={[styles.weekday, (i === 0 || i === 6) && styles.weekdayWeekend]}>{d}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day, idx) => {
          const key = formatDate(day);
          const isToday = isSameDay(day, today);
          const inMonth = isSameMonth(day, viewMonth);

          let selected = false;
          if (isSingleProps(props)) {
            selected = props.selectedDate ? isSameDay(day, props.selectedDate) : false;
          } else {
            selected = props.selectedDates.includes(key);
          }

          const disabled = isSingleProps(props) && props.minDate && isBefore(day, props.minDate);

          return (
            <Pressable
              key={idx}
              onPress={() => {
                if (disabled) return;
                if (isSingleProps(props)) {
                  props.onSelectDate(day);
                } else {
                  const next = selected ? props.selectedDates.filter((d) => d !== key) : [...props.selectedDates, key].sort();
                  props.onSelectDates(next);
                }
              }}
              style={[styles.dayCell, disabled && styles.dayCellDisabled]}
            >
              <View style={[
                styles.dayCircle,
                isToday && { backgroundColor: accentColor },
                selected && !isToday && { borderWidth: 2, borderColor: accentColor, backgroundColor: accentColor + '20' },
                !inMonth && styles.dayFaded,
              ]}>
                <Text style={[
                  styles.dayText,
                  !inMonth && styles.dayTextFaded,
                  isToday && selected && styles.dayTextToday,
                  selected && !isToday && { color: accentColor, fontWeight: '700' },
                ]}>
                  {day.getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  navBtn: { padding: spacing.xs },
  monthLabel: { ...typography.subhead, color: colors.label, fontWeight: '600' },
  weekdayRow: {
    flexDirection: 'row',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  weekday: {
    flex: 1, textAlign: 'center',
    fontSize: 11, fontWeight: '600',
    color: colors.labelTertiary,
  },
  weekdayWeekend: { color: colors.labelTertiary + 'BB' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: spacing.xs },
  dayCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 },
  dayCellDisabled: { opacity: 0.4 },
  dayCircle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  dayText: { fontSize: 14, fontWeight: '500', color: colors.label },
  dayTextFaded: { color: colors.labelQuaternary },
  dayTextToday: { color: '#fff', fontWeight: '700' },
  dayFaded: {},
});
