import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { Ionicons } from '@expo/vector-icons';
import { formatTime } from '@/utils/date';
import { useCategories } from '@/hooks/useCategories';
import { USER_NAMES } from '@/utils/colors';
import type { EventOccurrence } from '@/types';
import { spacing, typography, colors, radius } from '@/theme';

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

  if (events.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Nothing scheduled today</Text>
        <Text style={styles.emptySubtext}>Enjoy your free time</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {events.map((ev, idx) => {
        const key = eventOccurrenceKey(ev);
        const completed = checkable && completedKeys?.has(key);
        return (
          <View key={key} style={[styles.card, idx < events.length - 1 && styles.cardBorder]}>
            {checkable && (
              <Pressable
                style={[styles.checkbox, completed && styles.checkboxChecked]}
                onPress={() => onToggle?.(key)}
                hitSlop={8}
              >
                {completed ? (
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                ) : (
                  <Ionicons name="ellipse-outline" size={24} color={colors.labelTertiary} />
                )}
              </Pressable>
            )}
            {/* Color accent stripe */}
            <View style={[styles.stripe, { backgroundColor: ev.color }]} />

            <View style={styles.timeCol}>
              {ev.all_day ? (
                <Text style={[styles.allDay, completed && styles.textStrike]}>{'All\n'}day</Text>
              ) : (
                <>
                  <Text style={[styles.timeStart, completed && styles.textStrike]}>{formatTime(ev.start_at)}</Text>
                  <View style={styles.timeLine} />
                  <Text style={[styles.timeEnd, completed && styles.textStrike]}>{formatTime(ev.end_at)}</Text>
                </>
              )}
            </View>

            <View style={styles.contentCol}>
              <View style={[styles.typePill, { backgroundColor: ev.color + '18' }]}>
                <Text style={[styles.typeText, { color: ev.color }]}>{getCategoryById(ev.category_id ?? null)?.name ?? ev.type}</Text>
              </View>
              <Text style={[styles.title, completed && styles.textStrike]} numberOfLines={2}>{ev.title}</Text>
              <Text style={[styles.who, completed && styles.textStrike]}>{USER_NAMES[ev.user_id]}</Text>
              {ev.notes ? (
                <Text style={[styles.notes, completed && styles.textStrike]} numberOfLines={1}>{ev.notes}</Text>
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
  emptyText: { ...typography.callout, color: colors.labelSecondary, marginBottom: spacing.xs },
  emptySubtext: { ...typography.body, color: colors.labelTertiary },
  checkbox: { justifyContent: 'center', paddingRight: spacing.xs },
  checkboxChecked: {},
  textStrike: { textDecorationLine: 'line-through', opacity: 0.7 },
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  cardBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  stripe: {
    width: 3,
    borderRadius: 2,
    minHeight: 48,
  },
  timeCol: {
    width: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  timeStart: { ...typography.footnote, fontWeight: '600', color: colors.label },
  timeEnd: { ...typography.footnote, color: colors.labelTertiary },
  timeLine: { width: 1, height: 8, backgroundColor: colors.separator },
  allDay: { ...typography.caption, color: colors.labelTertiary, textAlign: 'center', lineHeight: 16 },
  contentCol: { flex: 1, justifyContent: 'center', gap: 3 },
  typePill: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: 2,
  },
  typeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  title: { ...typography.bodyEmphasis, color: colors.label, lineHeight: 20 },
  who: { ...typography.caption, color: colors.labelTertiary, marginTop: 1 },
  notes: { ...typography.footnote, color: colors.labelSecondary, marginTop: 2 },
});
