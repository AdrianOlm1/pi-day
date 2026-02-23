import React, { useRef } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Dimensions, Animated } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { format } from 'date-fns';
import { getWeekDays, isSameDay, formatDate } from '@/utils/date';
import type { EventOccurrence } from '@/types';
import { spacing, typography, colors, radius } from '@/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_WIDTH = Math.floor((SCREEN_WIDTH - spacing.lg * 2) / 7);

interface WeekStripProps {
  selectedDate: Date;
  occurrencesByDate: Record<string, EventOccurrence[]>;
  onSelectDate: (date: Date) => void;
  accentColor: string;
}

export function WeekStrip({ selectedDate, occurrencesByDate, onSelectDate, accentColor }: WeekStripProps) {
  const days = getWeekDays(selectedDate);
  const today = new Date();

  return (
    <View style={styles.container}>
      {days.map((day) => {
        const key = formatDate(day);
        const events = occurrencesByDate[key] ?? [];
        const isSelected = isSameDay(day, selectedDate);
        const isToday = isSameDay(day, today);
        return (
          <DayPill
            key={key}
            day={day}
            events={events}
            isSelected={isSelected}
            isToday={isToday}
            accentColor={accentColor}
            onSelectDate={onSelectDate}
          />
        );
      })}
    </View>
  );
}

function DayPill({ day, events, isSelected, isToday, accentColor, onSelectDate }: {
  day: Date; events: EventOccurrence[]; isSelected: boolean; isToday: boolean;
  accentColor: string; onSelectDate: (d: Date) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.90, useNativeDriver: true, damping: 20, stiffness: 400 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 300 }).start();

  return (
    <Pressable onPress={() => onSelectDate(day)} onPressIn={onPressIn} onPressOut={onPressOut} style={{ flex: 1, alignItems: 'center' }}>
      <Animated.View style={[
        styles.pill,
        isSelected && { backgroundColor: accentColor },
        isToday && !isSelected && { backgroundColor: accentColor + '16' },
        { transform: [{ scale }] },
      ]}>
        <Text style={[styles.weekday, isSelected && styles.textSelected, isToday && !isSelected && { color: accentColor, fontWeight: '600' }]}>
          {format(day, 'EEE').toUpperCase()}
        </Text>
        <Text style={[styles.dateNum, isSelected && styles.textSelected, isToday && !isSelected && { color: accentColor, fontWeight: '700' }]}>
          {day.getDate()}
        </Text>
        {events.length > 0 ? (
          <View style={styles.dotRow}>
            {events.slice(0, 3).map((ev, i) => (
              <View key={i} style={[styles.dot, { backgroundColor: isSelected ? 'rgba(255,255,255,0.85)' : ev.color }]} />
            ))}
          </View>
        ) : <View style={{ height: 7 }} />}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  pill: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.sm, paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    width: DAY_WIDTH - 4,
    minHeight: 70,
    gap: 2,
  },
  weekday: { fontSize: 10, fontWeight: '600', color: colors.labelTertiary, letterSpacing: 0.5 },
  dateNum: { ...typography.title3, color: colors.label, marginTop: 1 },
  textSelected: { color: '#fff' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
