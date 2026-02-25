import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { Ionicons } from '@expo/vector-icons';
import { formatTime } from '@/utils/date';
import { useCategories } from '@/hooks/useCategories';
import { USER_NAMES } from '@/utils/colors';
import type { EventOccurrence } from '@/types';
import { spacing, typography, radius } from '@/theme';
import { useAppColors } from '@/contexts/ThemeContext';

export function eventOccurrenceKey(ev: EventOccurrence): string {
  return `${ev.id}_${ev.occurrence_date}`;
}

interface TodayEventsProps {
  events: EventOccurrence[];
  checkable?: boolean;
  completedKeys?: Set<string>;
  onToggle?: (key: string) => void;
}

export function TodayEvents({ events, checkable, completedKeys, onToggle }: TodayEventsProps) {
  const { getCategoryById } = useCategories();
  const appColors = useAppColors();

  if (events.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: appColors.labelSecondary }]}>Nothing scheduled today</Text>
        <Text style={[styles.emptySubtext, { color: appColors.labelTertiary }]}>Enjoy your free time</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {events.map((ev, idx) => {
        const key = eventOccurrenceKey(ev);
        const completed = checkable && completedKeys?.has(key);
        const category = getCategoryById(ev.category_id ?? null);
        const color = category?.color ?? ev.color;
        return (
          <View key={key} style={[styles.card, idx < events.length - 1 && [styles.cardBorder, { borderBottomColor: appColors.separator }]]}>
            {checkable && (
              <Pressable
                style={[styles.checkbox, completed && styles.checkboxChecked]}
                onPress={() => onToggle?.(key)}
                hitSlop={8}
              >
                {completed ? (
                  <Ionicons name="checkmark-circle" size={24} color={appColors.gradientFrom} />
                ) : (
                  <Ionicons name="ellipse-outline" size={24} color={appColors.labelTertiary} />
                )}
              </Pressable>
            )}
            <View style={[styles.stripe, { backgroundColor: color }]} />

            <View style={styles.timeCol}>
              {ev.all_day ? (
                <Text style={[styles.allDay, { color: appColors.labelTertiary }, completed && styles.textStrike]}>{'All\n'}day</Text>
              ) : (
                <>
                  <Text style={[styles.timeStart, { color: appColors.label }, completed && styles.textStrike]}>{formatTime(ev.start_at)}</Text>
                  <View style={[styles.timeLine, { backgroundColor: appColors.separator }]} />
                  <Text style={[styles.timeEnd, { color: appColors.labelTertiary }, completed && styles.textStrike]}>{formatTime(ev.end_at)}</Text>
                </>
              )}
            </View>

            <View style={styles.contentCol}>
              <View style={[styles.typePill, { backgroundColor: color + '18' }]}>
                <Text style={[styles.typeText, { color }]}>{category?.name ?? ev.type}</Text>
              </View>
              <Text style={[styles.title, { color: appColors.label }, completed && styles.textStrike]} numberOfLines={2}>{ev.title}</Text>
              <Text style={[styles.who, { color: appColors.labelTertiary }, completed && styles.textStrike]}>{USER_NAMES[ev.user_id]}</Text>
              {ev.notes ? (
                <Text style={[styles.notes, { color: appColors.labelSecondary }, completed && styles.textStrike]} numberOfLines={1}>{ev.notes}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  empty: { alignItems: 'center', paddingVertical: spacing.xxxl },
  emptyText: { ...typography.callout, marginBottom: spacing.xs },
  emptySubtext: { ...typography.body },
  checkbox: { justifyContent: 'center', paddingRight: spacing.xs },
  checkboxChecked: {},
  textStrike: { textDecorationLine: 'line-through', opacity: 0.7 },
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  cardBorder: { borderBottomWidth: StyleSheet.hairlineWidth },
  stripe: { width: 3, borderRadius: 2, minHeight: 48 },
  timeCol: { width: 58, alignItems: 'center', justifyContent: 'center', gap: 3 },
  timeStart: { ...typography.footnote, fontWeight: '600' },
  timeEnd: { ...typography.footnote },
  timeLine: { width: 1, height: 8 },
  allDay: { ...typography.caption, textAlign: 'center', lineHeight: 16 },
  contentCol: { flex: 1, justifyContent: 'center', gap: 3 },
  typePill: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: 2,
  },
  typeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  title: { ...typography.bodyEmphasis, lineHeight: 20 },
  who: { ...typography.caption, marginTop: 1 },
  notes: { ...typography.footnote, marginTop: 2 },
});
