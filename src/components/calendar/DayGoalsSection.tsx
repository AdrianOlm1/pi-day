import React, { useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Animated, LayoutAnimation, Platform } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import type { Goal } from '@/types';
import { typography, radius, spacing } from '@/theme';
import { useAppColors } from '@/contexts/ThemeContext';
import { hapticLight, hapticMedium } from '@/utils/haptics';
import { playCheck } from '@/utils/sounds';

interface DayGoalsSectionProps {
  goals: Goal[];
  selectedDate: Date;
  isToday: boolean;
  accentColor: string;
  isCheckedInForDate: (goal: Goal, dateStr: string) => boolean;
  onCheckIn: (goal: Goal) => Promise<void>;
  onUncheck: (goal: Goal) => void;
  /** Optional entrance animation delay (ms) for stagger */
  entranceDelay?: number;
  /** When true, section starts collapsed (one-line header); tap to expand. Reduces scrolling. */
  defaultCollapsed?: boolean;
}

export function DayGoalsSection({
  goals,
  selectedDate,
  isToday,
  accentColor,
  isCheckedInForDate,
  onCheckIn,
  onUncheck,
  entranceDelay = 0,
  defaultCollapsed = true,
}: DayGoalsSectionProps) {
  const appColors = useAppColors();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayName = format(selectedDate, 'EEEE');
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isPast = dateStr < todayStr;
  const readOnlySummary =
    isPast ? `You had ${goals.length} goal${goals.length !== 1 ? 's' : ''}` : `${goals.length} goal${goals.length !== 1 ? 's' : ''} planned`;
  const fadeAnim = useRef(new Animated.Value(entranceDelay === 0 ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(entranceDelay === 0 ? 0 : 8)).current;

  React.useEffect(() => {
    if (entranceDelay > 0) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          delay: entranceDelay,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          delay: entranceDelay,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [entranceDelay, fadeAnim, translateY]);

  const toggleCollapsed = () => {
    hapticLight();
    if (Platform.OS === 'android') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } else {
      LayoutAnimation.configureNext({ duration: 220, update: { type: LayoutAnimation.Types.easeInEaseOut } });
    }
    setCollapsed((c) => !c);
  };

  if (goals.length === 0) return null;

  return (
    <Animated.View style={[styles.wrap, { opacity: fadeAnim, transform: [{ translateY }] }]}>
      {/* Tappable header: shows count, chevron; tap to expand/collapse */}
      <Pressable
        onPress={toggleCollapsed}
        style={[styles.header, { borderLeftColor: accentColor }]}
        accessibilityLabel={collapsed ? 'Expand goals' : 'Collapse goals'}
      >
        <View style={[styles.iconWrap, { backgroundColor: accentColor + '18' }]}>
          <Ionicons name="leaf-outline" size={16} color={accentColor} />
        </View>
        <Text style={[styles.headerLabel, { color: appColors.labelSecondary }]}>
          Goals for {dayName} ({goals.length})
        </Text>
        <Ionicons
          name={collapsed ? 'chevron-down' : 'chevron-up'}
          size={18}
          color={appColors.labelTertiary}
          style={styles.chevron}
        />
      </Pressable>

      {!collapsed && (
        <View style={[styles.card, { backgroundColor: appColors.fillSecondary }]}>
        {isToday ? (
          goals.map((goal) => {
            const done = isCheckedInForDate(goal, dateStr);
            return (
              <GoalRow
                key={goal.id}
                goal={goal}
                done={done}
                accentColor={accentColor}
                appColors={appColors}
                onToggle={async () => {
                  hapticMedium();
                  if (done) {
                    onUncheck(goal);
                  } else {
                    playCheck();
                    await onCheckIn(goal);
                  }
                }}
              />
            );
          })
        ) : (
          <View style={styles.readOnlyWrap}>
            <Text style={[styles.readOnlySummary, { color: appColors.labelTertiary }]}>
              {readOnlySummary}
            </Text>
            {goals.map((g) => (
              <View key={g.id} style={styles.readOnlyRow}>
                <Text style={styles.emoji}>{g.emoji || '•'}</Text>
                <Text style={[styles.readOnlyTitle, { color: appColors.labelSecondary }]} numberOfLines={1}>
                  {g.title}
                </Text>
              </View>
            ))}
          </View>
        )}
        </View>
      )}
    </Animated.View>
  );
}

function GoalRow({
  goal,
  done,
  accentColor,
  appColors,
  onToggle,
}: {
  goal: Goal;
  done: boolean;
  accentColor: string;
  appColors: ReturnType<typeof useAppColors>;
  onToggle: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const checkScale = useRef(new Animated.Value(done ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.spring(checkScale, {
      toValue: done ? 1 : 0,
      useNativeDriver: true,
      damping: 14,
      stiffness: 300,
    }).start();
  }, [done, checkScale]);

  const handlePressIn = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, damping: 20, stiffness: 400 }).start();
  const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 280 }).start();

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => {
        hapticLight();
        onToggle();
      }}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <View style={[styles.checkbox, { borderColor: appColors.labelTertiary }, done && { backgroundColor: accentColor, borderColor: accentColor }]}>
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </Animated.View>
        </View>
      </Animated.View>
      <Text style={[styles.emoji, styles.emojiInRow]}>{goal.emoji || '•'}</Text>
      <Text
        style={[styles.title, { color: appColors.label }, done && [styles.titleDone, { color: appColors.labelTertiary }]]}
        numberOfLines={2}
      >
        {goal.title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    borderLeftWidth: 3,
    borderRadius: 1,
  },
  chevron: { marginLeft: 'auto' },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: { ...typography.caption, textTransform: 'uppercase', letterSpacing: 0.4 },
  card: {
    borderRadius: radius.lg,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 16 },
  emojiInRow: { width: 22, textAlign: 'center' },
  title: { flex: 1, ...typography.body },
  titleDone: { textDecorationLine: 'line-through', color: undefined },
  readOnlyWrap: { paddingVertical: spacing.sm },
  readOnlySummary: { ...typography.caption, marginBottom: spacing.xs },
  readOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  readOnlyTitle: { flex: 1, ...typography.footnote },
});
