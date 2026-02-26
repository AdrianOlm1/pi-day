import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, Pressable, Modal,
  Alert, KeyboardAvoidingView, Platform, Animated, Easing,
  ActivityIndicator, TextInput as RNTextInput, Keyboard,
  PanResponder,
} from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserMode } from '@/contexts/UserModeContext';
import { useAppColors } from '@/contexts/ThemeContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useProfile } from '@/hooks/useProfile';
import { useGoals } from '@/hooks/useGoals';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  scheduleGoalReminder,
  cancelGoalReminder,
  cancelGoalStreakReminder,
  rescheduleAllGoalReminders,
  schedulePartnerGoalReminders,
  scheduleGoalStreakReminders,
  scheduleEncouragementNotification,
} from '@/services/notifications';
import { splitGoalIntoObjectives } from '@/services/aiGoals';
import { isMilestone, nextMilestone, MILESTONES, getPeriodKey } from '@/services/goals';
import { DatePickerCalendar } from '@/components/calendar/DatePickerCalendar';
import { hapticMedium } from '@/utils/haptics';
import { playTrash } from '@/utils/sounds';
import AnimatedReanimated, { FadeInDown } from 'react-native-reanimated';
import { spacing, typography, colors, radius, shadows } from '@/theme';
import { useEmptyStateMessage } from '@/hooks/useEmptyStateMessage';
import { EMPTY_GOALS } from '@/utils/emptyStateMessages';
import { getGoalsTagline } from '@/utils/goalsTaglines';
import { getComfortLineForTab } from '@/utils/greetings';
import { ACBackgroundBreathing } from '@/components/ui/ACBackground';
import type { GoalPeriodType, Goal, UserId } from '@/types';

// ─── constants ────────────────────────────────────────────────────────────────

const PERIOD_CONFIG: Record<GoalPeriodType, { label: string; shortLabel: string }> = {
  daily:     { label: 'Daily',     shortLabel: 'day' },
  weekly:    { label: 'Weekly',     shortLabel: 'week' },
  long_term: { label: 'Long term',  shortLabel: 'deadline' },
  monthly:   { label: 'Monthly',    shortLabel: 'month' },
  yearly:    { label: 'Yearly',     shortLabel: 'year' },
};

const MILESTONE_LABELS: Record<number, { title: string; desc: string }> = {
  3:   { title: '3-Day Streak!',    desc: "You're building a goal!" },
  7:   { title: 'One Week!',        desc: 'A full week — impressive!' },
  14:  { title: 'Two Weeks!',       desc: "You're on fire!" },
  21:  { title: '21 Days!',         desc: 'Goals take shape in 21 days. You did it!' },
  30:  { title: 'One Month!',       desc: 'A whole month of dedication!' },
  50:  { title: '50-Day Legend!',   desc: 'Half a century of streaks!' },
  75:  { title: '75 Days!',         desc: "You're truly unstoppable." },
  100: { title: '100-Day Club!',    desc: 'Triple digits — legendary!' },
  150: { title: '150 Days!',        desc: "You're a goal master." },
  200: { title: '200-Day Warrior!', desc: 'Incredible consistency!' },
  365: { title: '365 Days!!',       desc: 'A full year! Truly legendary.' },
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#','');
  const r = parseInt(h.slice(0,2),16)||0;
  const g = parseInt(h.slice(2,4),16)||0;
  const b = parseInt(h.slice(4,6),16)||0;
  return `rgba(${r},${g},${b},${a})`;
}

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`;
}

// ─── EmptyGoalsCard — fire + growth character, cozy empty state ─────────────────
function EmptyGoalsCard({
  userColor,
  appColors,
  onAddGoal,
}: {
  userColor: string;
  appColors: ReturnType<typeof useAppColors>;
  onAddGoal: () => void;
}) {
  const msg = useEmptyStateMessage(EMPTY_GOALS);
  return (
    <View style={s.emptyInner}>
      <View style={s.emptyIconRow}>
        <View style={[s.emptyIconWrap, { backgroundColor: hexToRgba(userColor, 0.12) }]}>
          <Ionicons name="flame-outline" size={28} color={userColor} />
        </View>
        <View style={[s.emptyIconWrap, { backgroundColor: hexToRgba(userColor, 0.12) }]}>
          <Ionicons name="leaf" size={28} color={userColor} />
        </View>
      </View>
      <Text style={[s.emptyTitle, { color: appColors.label }]}>{msg.title}</Text>
      <Text style={[s.emptyDesc, { color: appColors.labelSecondary }]}>{msg.subtitle}</Text>
      <Button title="Light your first goal" onPress={onAddGoal} color={userColor} size="md" style={{ marginTop: spacing.md }} />
    </View>
  );
}

// ─── StreakFlame — animated fire icon ────────────────────────────────────────

function StreakFlame({ streak, color, size = 28 }: { streak: number; color: string; size?: number }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (streak > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.12, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 0.95, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    }
  }, [streak]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Ionicons
        name={streak === 0 ? 'leaf-outline' : 'flame'}
        size={size}
        color={color}
      />
    </Animated.View>
  );
}

// ─── CheckInButton ────────────────────────────────────────────────────────────

function CheckInButton({
  done,
  onPress,
  color,
  loading,
  disabled,
}: { done: boolean; onPress: () => void; color: string; loading: boolean; disabled?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  function handlePress() {
    if (disabled || loading) return;
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, damping: 8, stiffness: 500 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 300 }),
    ]).start();
    onPress();
  }
  return (
    <Pressable onPress={handlePress} disabled={loading || disabled} hitSlop={12} style={ci.pressable}>
      <Animated.View
        style={[
          ci.btn,
          done && { backgroundColor: color },
          disabled && !done && { opacity: 0.4 },
          { transform: [{ scale }] },
        ]}
        collapsable={false}
      >
        {loading ? (
          <ActivityIndicator size="small" color={done ? '#fff' : color} />
        ) : done ? (
          <Ionicons name="checkmark" size={16} color="#fff" />
        ) : (
          <View style={[ci.circle, { borderColor: hexToRgba(color, 0.5) }]} />
        )}
      </Animated.View>
    </Pressable>
  );
}
const ci = StyleSheet.create({
  pressable: { minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  btn:    { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  circle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
});

// ─── MilestoneModal ───────────────────────────────────────────────────────────

function MilestoneModal({
  visible,
  streak,
  goalTitle,
  color,
  onClose,
}: { visible: boolean; streak: number; goalTitle: string; color: string; onClose: () => void }) {
  const info = MILESTONE_LABELS[streak] ?? { title: `${streak}-Day Streak!`, desc: 'Keep going!' };
  const bounceAnim = useRef(new Animated.Value(0.5)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(bounceAnim, { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 260, mass: 0.7 }),
        Animated.timing(fadeAnim,   { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      bounceAnim.setValue(0.5);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[mm.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[mm.card, { transform: [{ scale: bounceAnim }] }]}>
          <LinearGradient
            colors={[hexToRgba(color, 0.14), hexToRgba(color, 0.04)]}
            style={[StyleSheet.absoluteFill, { borderRadius: radius.xxl }]}
          />
          <Text style={[mm.title, { color }]}>{info.title}</Text>
          <Text style={mm.goalName}>{goalTitle}</Text>
          <Text style={mm.desc}>{info.desc}</Text>
          <View style={[mm.streakBadge, { backgroundColor: hexToRgba(color, 0.12) }]}>
            <Text style={[mm.streakNum, { color }]}>{streak}</Text>
            <Text style={[mm.streakLabel, { color: hexToRgba(color, 0.7) }]}>day streak</Text>
          </View>
          <Pressable onPress={onClose} style={[mm.btn, { backgroundColor: color }]}>
            <Text style={mm.btnText}>Keep it up!</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
const mm = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card:        { backgroundColor: colors.surface, borderRadius: radius.xxl, padding: spacing.xxl + 4, alignItems: 'center', width: '100%', maxWidth: 340, ...shadows.lg, overflow: 'hidden' },
  title:       { ...typography.title2, textAlign: 'center', marginBottom: spacing.xs },
  goalName:    { ...typography.subhead, color: colors.labelSecondary, marginBottom: spacing.sm },
  desc:        { ...typography.body, color: colors.labelSecondary, textAlign: 'center', marginBottom: spacing.xl },
  streakBadge: { flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.full, marginBottom: spacing.xl },
  streakNum:   { fontSize: 36, fontWeight: '800' },
  streakLabel: { ...typography.callout },
  btn:         { paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, borderRadius: radius.full },
  btnText:     { ...typography.bodyEmphasis, color: '#fff' },
});

// ─── CelebrationModal — accomplishments popup with satisfying animation ─────────

function CelebrationModal({
  visible,
  onClose,
  completedToday,
  totalGoals,
  bestStreak,
  userColor,
  appColors,
}: {
  visible: boolean;
  onClose: () => void;
  completedToday: number;
  totalGoals: number;
  bestStreak: number;
  userColor: string;
  appColors: ReturnType<typeof useAppColors>;
}) {
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 180 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        Animated.timing(confettiAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }).start();
      });
    } else {
      scaleAnim.setValue(0.3);
      fadeAnim.setValue(0);
      confettiAnim.setValue(0);
    }
  }, [visible]);

  const isAllComplete = totalGoals > 0 && completedToday >= totalGoals;
  const confettiColors = [userColor, appColors.warning, appColors.success, appColors.gradientFrom];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl }, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const translateY = confettiAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -90 - (i % 3) * 30] });
          const translateX = confettiAnim.interpolate({ inputRange: [0, 1], outputRange: [0, (i % 2 === 0 ? 1 : -1) * (20 + (i % 4) * 15)] });
          const opacity = confettiAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.9, 1, 0] });
          const scale = confettiAnim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1.1, 0.8] });
          return (
            <Animated.View
              key={i}
              style={[
                celeb.confettiDot,
                {
                  backgroundColor: confettiColors[i % confettiColors.length],
                  left: '50%',
                  top: '42%',
                  marginLeft: -4 + (i % 5) * 12 - 24,
                  opacity,
                  transform: [{ translateX }, { translateY }, { scale }],
                },
              ]}
            />
          );
        })}
        <Animated.View style={[celeb.card, { transform: [{ scale: scaleAnim }] }]} pointerEvents="box-none">
          <LinearGradient
            colors={[hexToRgba(userColor, 0.2), hexToRgba(userColor, 0.06)]}
            style={[StyleSheet.absoluteFill, { borderRadius: radius.xxl }]}
          />
          <View style={[celeb.emojiWrap, { backgroundColor: hexToRgba(userColor, 0.15) }]}>
            <Text style={celeb.emoji}>{isAllComplete ? '🎉' : '✨'}</Text>
          </View>
          <Text style={[celeb.title, { color: userColor }]}>
            {isAllComplete ? "You did it!" : "Nice progress!"}
          </Text>
          <Text style={celeb.desc}>
            {isAllComplete
              ? `All ${totalGoals} goal${totalGoals !== 1 ? 's' : ''} completed for this period.`
              : `${completedToday} of ${totalGoals} goal${totalGoals !== 1 ? 's' : ''} done. Keep going!`}
          </Text>
          <View style={[celeb.metricRow, { backgroundColor: hexToRgba(userColor, 0.1) }]}>
            <View style={celeb.metricBox}>
              <Text style={[celeb.metricNum, { color: userColor }]}>{completedToday}</Text>
              <Text style={celeb.metricLabel}>Done today</Text>
            </View>
            <View style={[celeb.metricDivider, { backgroundColor: hexToRgba(userColor, 0.25) }]} />
            <View style={celeb.metricBox}>
              <Text style={[celeb.metricNum, { color: userColor }]}>{bestStreak}</Text>
              <Text style={celeb.metricLabel}>Best streak</Text>
            </View>
          </View>
          <Pressable onPress={onClose} style={[celeb.btn, { backgroundColor: userColor }]}>
            <Text style={celeb.btnText}>Awesome!</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
const celeb = StyleSheet.create({
  card:       { backgroundColor: colors.surface, borderRadius: radius.xxl, padding: spacing.xxl, alignItems: 'center', width: '100%', maxWidth: 320, ...shadows.lg, overflow: 'visible' },
  confettiDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  emojiWrap:  { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  emoji:      { fontSize: 36 },
  title:      { ...typography.title2, textAlign: 'center', marginBottom: spacing.xs },
  desc:       { ...typography.body, color: colors.labelSecondary, textAlign: 'center', marginBottom: spacing.lg },
  metricRow:  { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', borderRadius: radius.lg, paddingVertical: spacing.md, marginBottom: spacing.xl },
  metricBox:  { flex: 1, alignItems: 'center' },
  metricNum:  { fontSize: 28, fontWeight: '800' },
  metricLabel:{ ...typography.caption, color: colors.labelTertiary, marginTop: 2 },
  metricDivider: { width: 1, height: 32 },
  btn:        { paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, borderRadius: radius.full },
  btnText:    { ...typography.bodyEmphasis, color: '#fff' },
});

// ─── Period progress helper (weekly/monthly/yearly) ───────────────────────────

function getPeriodProgress(
  goal: Goal,
  completions: { habit_id: string; owner: string; date: string }[],
  owner: UserId,
): { done: number; total: number; label: string } | null {
  if (goal.period_type === 'daily' || goal.period_type === 'long_term' || goal.metric_target != null) return null;
  const now = new Date();
  const habitCompletions = completions.filter((c) => c.habit_id === goal.id && c.owner === owner);
  if (goal.period_type === 'weekly') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const keys = new Set<string>();
    for (let i = 0; i < 31; i++) {
      const d = new Date(monthStart);
      d.setDate(d.getDate() + i);
      if (d > now) break;
      keys.add(getPeriodKey(d, 'weekly'));
    }
    const total = keys.size;
    const done = habitCompletions.filter((c) => keys.has(c.date)).length;
    return total > 0 ? { done, total, label: 'weeks' } : null;
  }
  return null;
}

function getEndDateLabel(targetEndDate: string | null): string | null {
  if (!targetEndDate) return null;
  const end = new Date(targetEndDate + 'T12:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((end.getTime() - today.getTime()) / 86400000);
  if (daysLeft < 0) return 'Ended';
  if (daysLeft === 0) return 'Due today';
  if (daysLeft <= 31) return `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
  return `Due ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

// ─── HabitCard ────────────────────────────────────────────────────────────────

function HabitCard({
  habit,
  myUserId,
  partnerId,
  partnerName,
  partnerColor,
  isMyCard,
  checkedInMe,
  checkedInPartner,
  recentDatesMe,
  recentDatesPartner,
  onCheckIn,
  onUncheck,
  onDelete,
  onEdit,
  onSaveSubObjectives,
  currentPeriodAmount,
  onLogMetric,
  periodProgress,
  endDateLabel,
}: {
  habit: Goal;
  myUserId: UserId;
  partnerId: UserId;
  partnerName: string;
  partnerColor: string;
  isMyCard: boolean;
  checkedInMe: boolean;
  checkedInPartner: boolean;
  recentDatesMe: Set<string>;
  recentDatesPartner: Set<string>;
  onCheckIn: () => void;
  onUncheck: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onSaveSubObjectives?: (goalId: string, subObjectives: string[]) => Promise<void>;
  currentPeriodAmount?: (habitId: string, owner: UserId, periodType: GoalPeriodType) => number;
  onLogMetric?: (goal: Goal, amount: number) => Promise<unknown>;
  periodProgress?: { done: number; total: number; label: string } | null;
  endDateLabel?: string | null;
}) {
  const appColors  = useAppColors();
  const { getUserColor, getUserName } = useTheme();
  const myColor    = getUserColor(myUserId);
  const color      = isMyCard ? myColor : partnerColor;
  const [expanded, setExpanded] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [splitLoading, setSplitLoading] = useState(false);
  const [showLogMetricModal, setShowLogMetricModal] = useState(false);
  const [metricInput, setMetricInput] = useState('');
  const expandAnim = useRef(new Animated.Value(0)).current;

  const isMetric = habit.metric_target != null;
  const periodAmount = isMetric && currentPeriodAmount
    ? currentPeriodAmount(habit.id, isMyCard ? myUserId : partnerId, habit.period_type)
    : 0;
  const streakForIcon =
    habit.period_type === 'daily' && habit.repeating === false
      ? (checkedInMe ? 1 : 0)
      : habit.current_streak;

  useEffect(() => {
    Animated.spring(expandAnim, { toValue: expanded ? 1 : 0, useNativeDriver: false, damping: 20, stiffness: 200 }).start();
  }, [expanded]);

  const cardH = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 640] });

  const next = nextMilestone(habit.current_streak);
  const progressToNext = next
    ? Math.min(habit.current_streak / next, 1)
    : 1;

  const todayIsActive = (() => {
    if (!habit.active_days || habit.active_days.length === 0) return true;
    const dow = new Date().getDay(); // 0=Sun..6=Sat
    return habit.active_days.includes(dow);
  })();

  async function handleCheckIn() {
    hapticMedium();
    setCheckLoading(true);
    try { await onCheckIn(); } finally { setCheckLoading(false); }
  }
  async function handleUncheck() {
    setCheckLoading(true);
    try { await onUncheck(); } finally { setCheckLoading(false); }
  }
  async function handleLogMetric() {
    const n = Number(metricInput.replace(/,/g, '.'));
    if (!onLogMetric || !Number.isFinite(n) || n <= 0) return;
    setCheckLoading(true);
    try {
      await onLogMetric(habit, n);
      setMetricInput('');
      setShowLogMetricModal(false);
    } finally {
      setCheckLoading(false);
    }
  }

  async function handleSplitIntoSteps() {
    if (!onSaveSubObjectives) return;
    setSplitLoading(true);
    try {
      const steps = await splitGoalIntoObjectives(habit.title);
      if (steps.length > 0) await onSaveSubObjectives(habit.id, steps);
    } finally {
      setSplitLoading(false);
    }
  }

  const subObjectives = habit.sub_objectives && habit.sub_objectives.length > 0 ? habit.sub_objectives : null;

  return (
    <GlassCard style={hc.card} accentColor={color}>
      {/* Main row: flame (streak) | title/meta | check (daily only) | Add (metric) or partner dot */}
      <View style={hc.topRow} pointerEvents="box-none">
        <Pressable onPress={() => setExpanded(e => !e)} style={hc.topRowPressable}>
          {/* Streak + flame — left */}
          <View style={hc.streakCol}>
            <StreakFlame streak={streakForIcon} color={color} size={22} />
            <Text style={[hc.streakNum, { color }]}>{habit.current_streak}</Text>
          </View>
          {/* Title + meta (metric progress and small Add in meta for metric goals) */}
          <View style={hc.mid}>
            <Text style={[hc.title, { color: appColors.label }]} numberOfLines={1}>{habit.title}</Text>
            <View style={hc.metaRow}>
              <Text style={[hc.period, { color: hexToRgba(color, 0.7) }]}>
                {PERIOD_CONFIG[habit.period_type].label}
                {periodProgress != null ? ` · ${periodProgress.done}/${periodProgress.total} ${periodProgress.label}` : ''}
              </Text>
              {endDateLabel ? (
                <Text style={[hc.period, { color: hexToRgba(color, 0.8) }]}>{endDateLabel}</Text>
              ) : null}
              {isMetric && (
                <>
                  <Text style={[hc.metaMetric, { color: hexToRgba(color, 0.9) }]}>
                    {periodAmount} / {habit.metric_target} {habit.metric_unit ?? ''}
                  </Text>
                  {checkedInMe ? (
                    <View style={[hc.metricDoneBadge, { backgroundColor: color }]}>
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    </View>
                  ) : null}
                </>
              )}
              {habit.stake ? (
                <View style={[hc.stakeBadge, { backgroundColor: hexToRgba(appColors.warning, 0.12) }]}>
                  <Ionicons name="trophy-outline" size={10} color={appColors.warning} />
                  <Text style={[hc.stakeText, { color: appColors.warning }]} numberOfLines={1}>{habit.stake}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </Pressable>

        {/* Check button — binary goals (daily/weekly/monthly/yearly) */}
        {isMyCard && !isMetric && (
          <View style={hc.checkInWrap}>
            <CheckInButton
              done={checkedInMe}
              onPress={checkedInMe ? handleUncheck : handleCheckIn}
              color={color}
              loading={checkLoading}
              disabled={
                habit.period_type === 'daily'
                  ? !todayIsActive
                  : habit.period_type === 'long_term' &&
                    habit.target_end_date != null &&
                    habit.target_end_date < new Date().toISOString().slice(0, 10)
              }
            />
          </View>
        )}

        {/* Add button — for metric/continuous goals (always show so you can log quantity) */}
        {isMyCard && isMetric && onLogMetric && todayIsActive && (
          <Pressable
            onPress={() => setShowLogMetricModal(true)}
            style={[hc.addBtnRight, { backgroundColor: hexToRgba(color, 0.15), borderColor: hexToRgba(color, 0.4) }]}
          >
            <Ionicons name="add" size={20} color={color} />
            <Text style={[hc.addBtnRightText, { color }]}>Add</Text>
          </Pressable>
        )}

        {/* Partner done indicator */}
        {!isMyCard && (
          <View style={[hc.partnerDot, { backgroundColor: checkedInPartner ? color : hexToRgba(color, 0.18) }]}>
            <Ionicons name={checkedInPartner ? 'checkmark' : 'close'} size={12} color={checkedInPartner ? '#fff' : hexToRgba(color, 0.5)} />
          </View>
        )}
      </View>

      {/* Log metric modal — opened from Add on card */}
        {isMyCard && isMetric && (
          <Modal visible={showLogMetricModal} transparent animationType="fade" onRequestClose={() => setShowLogMetricModal(false)}>
            <Pressable style={hc.logMetricModalOverlay} onPress={() => setShowLogMetricModal(false)}>
              <Pressable style={[hc.logMetricModalBox, { backgroundColor: appColors.surface }]} onPress={() => {}}>
                <Text style={[hc.logMetricModalTitle, { color: appColors.label }]}>Log progress</Text>
                <Text style={[hc.logMetricModalSub, { color: appColors.labelSecondary }]}>
                  {habit.title} — {periodAmount} / {habit.metric_target} {habit.metric_unit ?? ''}
                </Text>
                <View style={[hc.logMetricInputWrap, { borderColor: hexToRgba(color, 0.3) }]}>
                  <RNTextInput
                    value={metricInput}
                    onChangeText={setMetricInput}
                    placeholder="Amount"
                    placeholderTextColor={appColors.labelTertiary}
                    keyboardType="decimal-pad"
                    style={[hc.logMetricInput, { color: appColors.label }]}
                    returnKeyType="done"
                    onSubmitEditing={handleLogMetric}
                    autoFocus
                  />
                  <Text style={[hc.logMetricUnit, { color: appColors.labelTertiary }]}>{habit.metric_unit ?? ''}</Text>
                </View>
                <View style={hc.logMetricModalActions}>
                  <Button title="Cancel" onPress={() => { setShowLogMetricModal(false); setMetricInput(''); }} variant="ghost" color={appColors.labelSecondary} size="md" style={{ flex: 1 }} />
                  <Button
                    title="Add"
                    onPress={handleLogMetric}
                    color={color}
                    size="md"
                    style={{ flex: 1 }}
                    disabled={checkLoading || !metricInput.trim() || !(Number(metricInput.replace(/,/g, '.')) > 0)}
                  />
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        )}

      {/* Progress bar toward next milestone */}
      {habit.current_streak > 0 && (
        <View style={hc.progressWrap}>
          <View style={[hc.progressBg, { backgroundColor: hexToRgba(color, 0.10) }]}>
            <View style={[hc.progressFill, { backgroundColor: color, width: `${Math.round(progressToNext * 100)}%` as any }]} />
          </View>
          {next && (
            <Text style={[hc.progressLabel, { color: hexToRgba(color, 0.6) }]}>
              {next - habit.current_streak} to {next}
            </Text>
          )}
        </View>
      )}

      {/* Expandable detail — open to full height (no inner scroll) */}
      {expanded && (
        <View style={hc.expandBody}>
          {/* Stats row */}
          <View style={hc.statsRow}>
            <View style={hc.statBox}>
              <Text style={[hc.statNum, { color }]}>{habit.current_streak}</Text>
              <Text style={hc.statLabel}>Current</Text>
            </View>
            <View style={[hc.statDivider, { backgroundColor: hexToRgba(color, 0.15) }]} />
            <View style={hc.statBox}>
              <Text style={[hc.statNum, { color }]}>{habit.longest_streak}</Text>
              <Text style={hc.statLabel}>Best</Text>
            </View>
            <View style={[hc.statDivider, { backgroundColor: hexToRgba(color, 0.15) }]} />
            <View style={hc.statBox}>
              <Text style={[hc.statNum, { color }]}>
                {next ?? '∞'}
              </Text>
              <Text style={hc.statLabel}>Next goal</Text>
            </View>
          </View>

          {/* Schedule + metric info */}
          {(habit.active_days && habit.active_days.length > 0) || habit.metric_target != null ? (
            <View style={{ marginBottom: spacing.lg, gap: spacing.xs + 2 }}>
              {habit.active_days && habit.active_days.length > 0 && (
                <Text style={[hc.metaDetail, { color: hexToRgba(color, 0.7) }]}>
                  Active:{' '}
                  {habit.active_days.length === 7
                    ? 'Every day'
                    : habit.active_days
                        .slice()
                        .sort((a, b) => a - b)
                        .map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]!)
                        .join(', ')}
                </Text>
              )}
              {habit.metric_target != null && (
                <Text style={[hc.metaDetail, { color: hexToRgba(color, 0.7) }]}>
                  Target:{' '}
                  {habit.metric_target}{' '}
                  {habit.metric_unit ?? ''}
                  {habit.metric_unit ? '' : ''}
                  {PERIOD_CONFIG[habit.period_type].shortLabel && ` / ${PERIOD_CONFIG[habit.period_type].shortLabel}`}
                </Text>
              )}
              {!todayIsActive && (
                <Text style={[hc.metaDetail, { color: hexToRgba(color, 0.7) }]}>
                  Today is a rest day for this goal.
                </Text>
              )}
              {isMyCard && habit.metric_target != null && todayIsActive && onLogMetric && (
                <Pressable
                  onPress={() => setShowLogMetricModal(true)}
                  style={[hc.logMetricBtnDetail, { backgroundColor: hexToRgba(color, 0.14), borderColor: hexToRgba(color, 0.35) }]}
                >
                  <Ionicons name="add" size={18} color={color} />
                  <Text style={[hc.logMetricBtnText, { color }]}>Log quantity</Text>
                </Pressable>
              )}
            </View>
          ) : null}

          {/* Sub-objectives (AI-split smaller steps) */}
          {subObjectives && (
            <View style={hc.subObjectivesWrap}>
              <Text style={[hc.calLabel, { color: hexToRgba(color, 0.6) }]}>Smaller steps</Text>
              {subObjectives.map((step, idx) => (
                <View key={idx} style={[hc.subObjectiveRow, { borderLeftColor: hexToRgba(color, 0.4) }]}>
                  <Text style={[hc.subObjectiveText, { color: appColors.labelSecondary }]}>{step}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Recent activity — calendar with completed dates highlighted */}
          <Text style={[hc.calLabel, { color: hexToRgba(color, 0.6) }]}>
            {isMyCard ? 'Your' : getUserName(habit.owner as UserId) + "'s"} recent activity
          </Text>
          <View style={hc.calendarWrap}>
            <DatePickerCalendar
              selectedDates={Array.from(isMyCard ? recentDatesMe : recentDatesPartner)}
              onSelectDates={() => {}}
              accentColor={color}
              embedded
            />
          </View>

          {/* Actions */}
          {isMyCard && (
            <View style={hc.actions}>
              {onSaveSubObjectives && (
                <Pressable
                  onPress={handleSplitIntoSteps}
                  disabled={splitLoading}
                  style={[hc.actionBtn, { backgroundColor: hexToRgba(color, 0.08) }]}
                >
                  {splitLoading ? (
                    <ActivityIndicator size="small" color={color} />
                  ) : (
                    <>
                      <Ionicons name="sparkles-outline" size={15} color={color} />
                      <Text style={[hc.actionBtnText, { color }]}>Steps</Text>
                    </>
                  )}
                </Pressable>
              )}
              <Pressable onPress={onEdit} style={[hc.actionBtn, { backgroundColor: hexToRgba(color, 0.08) }]}>
                <Ionicons name="pencil-outline" size={15} color={color} />
                <Text style={[hc.actionBtnText, { color }]}>Edit</Text>
              </Pressable>
              <Pressable onPress={onDelete} style={[hc.actionBtn, { backgroundColor: hexToRgba('#EF4444', 0.08) }]}>
                <Ionicons name="trash-outline" size={15} color="#EF4444" />
                <Text style={[hc.actionBtnText, { color: '#EF4444' }]}>Delete</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </GlassCard>
  );
}

const hc = StyleSheet.create({
  card:         { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  topRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md + 2 },
  topRowPressable: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minWidth: 0 },
  checkInWrap:  { flexShrink: 0, zIndex: 2 },
  mid:          { flex: 1 },
  title:        { ...typography.bodyEmphasis, marginBottom: 3 },
  metaRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  period:       { ...typography.caption },
  metaMetric:   { ...typography.caption, fontWeight: '700' },
  metaAddBtn:   { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.xs, borderWidth: 1 },
  metaAddText:  { fontSize: 11, fontWeight: '700' },
  stakeBadge:   { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.xs },
  stakeText:    { fontSize: 10, fontWeight: '600', maxWidth: 100 },
  streakCol:    { alignItems: 'center', gap: 1, minWidth: 36 },
  streakNum:    { fontSize: 13, fontWeight: '700' },
  partnerDot:   { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  addBtnRight:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1.5 },
  addBtnRightText: { fontSize: 13, fontWeight: '700' },

  metricDoneBadge:  { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logMetricBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1.5 },
  logMetricBtnDetail: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1.5, marginTop: spacing.sm },
  logMetricBtnText: { fontSize: 12, fontWeight: '700' },
  logMetricModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  logMetricModalBox: { width: '100%', maxWidth: 320, borderRadius: radius.xl, padding: spacing.xl, ...shadows.lg },
  logMetricModalTitle: { ...typography.title3, marginBottom: spacing.xs },
  logMetricModalSub: { ...typography.footnote, marginBottom: spacing.md },
  logMetricInputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  logMetricInput: { flex: 1, ...typography.body, paddingVertical: spacing.sm },
  logMetricUnit: { ...typography.caption, marginLeft: spacing.sm },
  logMetricModalActions: { flexDirection: 'row', gap: spacing.md },

  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md + 2, paddingBottom: spacing.sm },
  progressBg:   { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressLabel:{ fontSize: 10, fontWeight: '600' },

  expandScroll:      { maxHeight: 420 },
  expandBody:        { paddingHorizontal: spacing.md + 2, paddingBottom: spacing.md + 2 },
  statsRow:          { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: radius.md, paddingVertical: spacing.md },
  statBox:           { flex: 1, alignItems: 'center' },
  statNum:           { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  statLabel:         { ...typography.caption, color: colors.labelTertiary, marginTop: 2 },
  statDivider:       { width: 1, height: 32 },
  calLabel:          { ...typography.caption, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
  calendarWrap:      { marginTop: spacing.sm, marginBottom: spacing.md, backgroundColor: '#E5E7EB', borderRadius: radius.lg, padding: spacing.sm, borderWidth: 1, borderColor: '#D1D5DB' },
  subObjectivesWrap: { marginBottom: spacing.lg },
  subObjectiveRow:   { flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.sm, marginTop: spacing.xs, borderLeftWidth: 3, borderRadius: 2 },
  subObjectiveText:  { ...typography.footnote, flex: 1 },
  partnerStatusRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, padding: spacing.sm, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: radius.md },
  partnerAvatar:     { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  partnerStatusText: { ...typography.footnote, flex: 1 },
  actions:           { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
  actionBtn:         { flex: 1, minWidth: 90, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.md },
  actionBtnText:     { ...typography.subhead },
  metaDetail:        { ...typography.caption },
});

// ─── AddGoalModal ─────────────────────────────────────────────────────────────

function formatDateForInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function AddGoalModal({
  visible,
  onClose,
  onAdd,
  userColor,
  notifTimeDisplay,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (
    title: string,
    emoji: string,
    period: GoalPeriodType,
    reminder: boolean,
    stake: string,
    activeDays: number[] | null,
    metricTarget: number | null,
    metricUnit: string | null,
    repeating: boolean,
    targetEndDate: string | null,
    targetDescription: string | null,
    subObjectives: string[] | null,
  ) => void;
  userColor: string;
  notifTimeDisplay: string;
}) {
  const appColors  = useAppColors();
  const [title, setTitle]   = useState('');
  const [emoji, setEmoji]   = useState('');
  const [period, setPeriod] = useState<GoalPeriodType>('long_term');
  const [reminder, setReminder] = useState(true);
  const [repeating, setRepeating] = useState(false);
  const [stake, setStake]   = useState('');
  const [activeDays, setActiveDays] = useState<number[]>([0,1,2,3,4,5,6]);
  const [useMetric, setUseMetric] = useState(false);
  const [metricTarget, setMetricTarget] = useState<string>('');
  const [metricUnit, setMetricUnit] = useState<string>('');
  const [targetEndDate, setTargetEndDate] = useState<Date | null>(null);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  // We still support a stored target description on the goal,
  // but we no longer surface a separate "big goal in mind" + AI plan UI here.

  function reset() {
    setTitle('');
    setEmoji('');
    setPeriod('long_term');
    setReminder(true);
    setRepeating(false);
    setStake('');
    setActiveDays([0,1,2,3,4,5,6]);
    setUseMetric(false);
    setMetricTarget('');
    setMetricUnit('');
    setTargetEndDate(null);
  }

  function handleAdd() {
    if (!title.trim()) return;
    if (period === 'long_term' && !targetEndDate) {
      Alert.alert('Due date required', 'Long term goals need a due date. Pick the specific day you want to have this done by.');
      return;
    }
    const trimmedTitle = title.trim();
    const trimmedStake = stake.trim();
    const parsedTarget = useMetric && metricTarget.trim() !== '' ? Number(metricTarget) : null;
    const endDateStr = targetEndDate ? formatDateForInput(targetEndDate) : null;
    onAdd(
      trimmedTitle,
      emoji,
      period,
      reminder,
      trimmedStake,
      period === 'daily' ? (activeDays.length === 7 ? null : activeDays) : null,
      useMetric && parsedTarget != null && !Number.isNaN(parsedTarget) ? parsedTarget : null,
      useMetric && metricUnit.trim() ? metricUnit.trim() : null,
      period === 'long_term' ? false : repeating,
      endDateStr,
      null,
      null,
    );
    reset();
  }

  function handleClose() {
    Keyboard.dismiss();
    onClose();
  }

  const dragCloseThreshold = 56;
  const dragVelocityThreshold = 0.3;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8,
      onPanResponderRelease: (_, g) => {
        const shouldClose = g.dy > dragCloseThreshold || g.vy > dragVelocityThreshold;
        if (shouldClose) handleClose();
      },
    }),
  ).current;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={am.overlay}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={[am.sheet, { backgroundColor: appColors.surface }]}>
          {/* Handle bar — drag down to close */}
          <View style={am.handleBar} {...panResponder.panHandlers}>
            <View style={am.handle} />
          </View>
          <Text style={[am.sheetTitle, { color: appColors.label }]}>New goal</Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={am.sheetScrollContent}
          >
            {/* Title */}
            <Text style={[am.label, { color: appColors.labelSecondary }]}>Goal name</Text>
            <View style={[am.inputWrap, { borderColor: hexToRgba(userColor, 0.3), backgroundColor: hexToRgba(userColor, 0.04) }]}>
              <RNTextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Drink 8 glasses of water"
                placeholderTextColor={appColors.labelTertiary}
                style={[am.input, { color: appColors.label }]}
                selectionColor={userColor}
                returnKeyType="done"
                maxLength={60}
                autoFocus
              />
            </View>

            {/* Frequency: daily, weekly, or long term (specific due date) */}
            <Text style={[am.label, { color: appColors.labelSecondary }]}>Goal type</Text>
            <View style={am.chipRow}>
              {(['daily', 'weekly', 'long_term'] as GoalPeriodType[]).map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setPeriod(p)}
                  style={[am.chip, period === p && { backgroundColor: hexToRgba(userColor, 0.14), borderColor: userColor }]}
                >
                  <Text style={[am.chipText, period === p && { color: userColor, fontWeight: '700' }]}>
                    {PERIOD_CONFIG[p].label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Repeating — hidden for long term */}
            {period !== 'long_term' && (
              <Pressable
                onPress={() => setRepeating((v) => !v)}
                style={[
                  am.metricToggleRow,
                  { borderColor: repeating ? hexToRgba(userColor, 0.3) : 'rgba(0,0,0,0.08)', backgroundColor: repeating ? hexToRgba(userColor, 0.06) : 'transparent' },
                ]}
              >
                <Ionicons
                  name={repeating ? 'repeat' : 'repeat-outline'}
                  size={20}
                  color={repeating ? userColor : appColors.labelTertiary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[am.reminderLabel, { color: repeating ? userColor : appColors.label }]}>Repeating</Text>
                  <Text style={[am.reminderSub, { color: appColors.labelTertiary }]}>
                    {repeating ? 'Goal repeats each period' : 'One-off target for this period'}
                  </Text>
                </View>
              </Pressable>
            )}

            {/* Due date: required for long term, optional for daily/weekly */}
            <Text style={[am.label, { color: appColors.labelSecondary }]}>
              {period === 'long_term' ? 'Due date (when do you want this done?)' : 'Until when?'}
              {period !== 'long_term' ? ' (optional)' : ''}
            </Text>
            {period === 'long_term' && (
              <Text style={[am.reminderSub, { color: userColor, marginBottom: spacing.sm }]}>Pick the specific day you want to have this done by</Text>
            )}
            <Pressable
              onPress={() => setShowEndDatePicker(true)}
              style={[am.pickerRow, { borderColor: hexToRgba(userColor, 0.25), backgroundColor: hexToRgba(userColor, 0.04) }]}
            >
              <Ionicons name="calendar-outline" size={20} color={userColor} />
              <Text style={[am.pickerRowText, { color: appColors.label }]}>
                {targetEndDate ? targetEndDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No end date'}
              </Text>
              {targetEndDate ? (
                <Pressable onPress={() => setTargetEndDate(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={appColors.labelTertiary} />
                </Pressable>
              ) : null}
            </Pressable>
            {showEndDatePicker && (
              <Modal
                visible
                transparent
                animationType="fade"
                onRequestClose={() => setShowEndDatePicker(false)}
              >
                <Pressable style={am.calendarBackdrop} onPress={() => setShowEndDatePicker(false)}>
                  <Pressable
                    style={[am.calendarBox, { backgroundColor: appColors.surface }]}
                    onPress={(e) => e.stopPropagation()}
                  >
                    <Text style={[am.calendarTitle, { color: appColors.label }]}>Pick due date</Text>
                    <DatePickerCalendar
                      selectedDate={targetEndDate ?? new Date()}
                      onSelectDate={(date) => {
                        setTargetEndDate(date);
                      }}
                      accentColor={userColor}
                    />
                    <Button
                      title="Done"
                      onPress={() => setShowEndDatePicker(false)}
                      color={userColor}
                      size="md"
                      style={{ marginTop: spacing.md }}
                    />
                  </Pressable>
                </Pressable>
              </Modal>
            )}

            {/* Active days (for daily goals) */}
            {period === 'daily' && (
              <>
                <Text style={[am.label, { color: appColors.labelSecondary }]}>Days of week</Text>
                <View style={am.daysRow}>
                  {['S','M','T','W','T','F','S'].map((label, idx) => {
                    const selected = activeDays.includes(idx);
                    return (
                      <Pressable
                        key={idx}
                        onPress={() =>
                          setActiveDays((prev) =>
                            prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx].sort((a, b) => a - b),
                          )
                        }
                        style={[
                          am.dayChip,
                          selected && { backgroundColor: hexToRgba(userColor, 0.18), borderColor: userColor },
                        ]}
                      >
                        <Text style={[am.dayChipText, selected && { color: userColor }]}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {/* Metric settings */}
            <Pressable
              onPress={() => setUseMetric((v) => !v)}
              style={[
                am.metricToggleRow,
                { borderColor: useMetric ? hexToRgba(userColor, 0.3) : 'rgba(0,0,0,0.08)', backgroundColor: useMetric ? hexToRgba(userColor, 0.06) : 'transparent' },
              ]}
            >
              <Ionicons
                name={useMetric ? 'stats-chart' : 'stats-chart-outline'}
                size={20}
                color={useMetric ? userColor : appColors.labelTertiary}
              />
              <View style={{ flex: 1 }}>
                <Text style={[am.reminderLabel, { color: useMetric ? userColor : appColors.label }]}>
                  Track a number
                </Text>
                <Text style={[am.reminderSub, { color: appColors.labelTertiary }]}>
                  e.g. 10 miles, 8 glasses, 20 pages
                </Text>
              </View>
            </Pressable>

            {useMetric && (
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
                <View style={[am.inputWrap, { flex: 1, borderColor: hexToRgba(userColor, 0.3), backgroundColor: hexToRgba(userColor, 0.04) }]}>
                  <RNTextInput
                    value={metricTarget}
                    onChangeText={setMetricTarget}
                    placeholder="Target"
                    keyboardType="numeric"
                    placeholderTextColor={appColors.labelTertiary}
                    style={[am.input, { color: appColors.label }]}
                    selectionColor={userColor}
                    returnKeyType="done"
                    maxLength={6}
                  />
                </View>
                <View style={[am.inputWrap, { flex: 1, borderColor: hexToRgba(userColor, 0.15), backgroundColor: hexToRgba(userColor, 0.02) }]}>
                  <RNTextInput
                    value={metricUnit}
                    onChangeText={setMetricUnit}
                    placeholder="Unit (miles, pages)"
                    placeholderTextColor={appColors.labelTertiary}
                    style={[am.input, { color: appColors.label }]}
                    selectionColor={userColor}
                    returnKeyType="done"
                    maxLength={20}
                  />
                </View>
              </View>
            )}

            {/* Accountability stake */}
            <Text style={[am.label, { color: appColors.labelSecondary }]}>
              Accountability stake <Text style={{ color: appColors.labelTertiary, fontWeight: '400' }}>(optional)</Text>
            </Text>
            <View style={[am.inputWrap, { borderColor: hexToRgba(appColors.warning, 0.3), backgroundColor: hexToRgba(appColors.warning, 0.04) }]}>
              <Ionicons name="trophy-outline" size={18} color={appColors.warning} style={{ marginRight: spacing.sm }} />
              <RNTextInput
                value={stake}
                onChangeText={setStake}
                placeholder="e.g. Loser buys coffee"
                placeholderTextColor={appColors.labelTertiary}
                style={[am.input, { color: appColors.label }]}
                selectionColor={appColors.warning}
                returnKeyType="done"
                maxLength={60}
              />
            </View>

            {/* Reminder toggle */}
            <Pressable
              onPress={() => setReminder(v => !v)}
              style={[am.reminderRow, { borderColor: reminder ? hexToRgba(userColor, 0.3) : 'rgba(0,0,0,0.08)', backgroundColor: reminder ? hexToRgba(userColor, 0.06) : 'transparent' }]}
            >
              <Ionicons name={reminder ? 'notifications' : 'notifications-off'} size={20} color={reminder ? userColor : appColors.labelTertiary} />
              <View style={{ flex: 1 }}>
                <Text style={[am.reminderLabel, { color: reminder ? userColor : appColors.label }]}>Daily reminder</Text>
                <Text style={[am.reminderSub, { color: appColors.labelTertiary }]}>
                  {reminder ? `At ${notifTimeDisplay}` : 'No reminder'}
                </Text>
              </View>
              <View style={[am.toggle, { backgroundColor: reminder ? userColor : 'rgba(0,0,0,0.1)' }]}>
                <Text style={am.toggleText}>{reminder ? 'On' : 'Off'}</Text>
              </View>
            </Pressable>

            <View style={am.btnRow}>
              <Button title="Cancel" onPress={() => { handleClose(); reset(); }} variant="ghost" color={appColors.labelSecondary} size="md" style={{ flex: 1 }} />
              <Button title="Add goal" onPress={handleAdd} color={userColor} size="md" style={{ flex: 1 }} disabled={!title.trim()} />
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const am = StyleSheet.create({
  overlay:     { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:       { borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, maxHeight: '86%' },
  handleBar:   { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.sm, marginBottom: spacing.sm },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.15)', alignSelf: 'center' },
  sheetTitle:  { ...typography.title3, textAlign: 'center', marginBottom: spacing.xl },
  sheetScrollContent: { paddingBottom: spacing.xl },
  label:       { ...typography.subhead, marginBottom: spacing.sm },
  emojiBtn:    { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm, backgroundColor: 'rgba(0,0,0,0.04)', borderWidth: 1.5, borderColor: 'transparent' },
  inputWrap:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.lg },
  input:       { flex: 1, ...typography.body, paddingVertical: 6 },
  chipRow:     { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  chip:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.10)' },
  chipText:    { ...typography.subhead, color: colors.label },
  daysRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  dayChip:     { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.10)', backgroundColor: 'rgba(0,0,0,0.02)' },
  dayChipText: { ...typography.subhead, fontSize: 13, color: colors.labelTertiary },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1.5, marginBottom: spacing.xl },
  reminderLabel:{ ...typography.bodyEmphasis },
  reminderSub:  { ...typography.caption, marginTop: 2 },
  toggle:      { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm },
  toggleText:  { fontSize: 12, fontWeight: '700', color: '#fff' },
  metricToggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1.5, marginBottom: spacing.md },
  pickerRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.lg },
  pickerRowText: { flex: 1, ...typography.body },
  calendarBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  calendarBox: { width: '100%', maxWidth: 380, borderRadius: radius.xl, padding: spacing.lg },
  calendarTitle: { ...typography.subhead, marginBottom: spacing.md, textAlign: 'center' },
  btnRow:      { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
});

// ─── EditGoalModal ────────────────────────────────────────────────────────────

function EditGoalModal({
  visible,
  goal,
  onClose,
  onSave,
  userColor,
}: {
  visible: boolean;
  goal: Goal | null;
  onClose: () => void;
  onSave: (
    title: string,
    emoji: string,
    period: GoalPeriodType,
    reminder: boolean,
    stake: string,
    activeDays: number[] | null,
    metricTarget: number | null,
    metricUnit: string | null,
    repeating: boolean,
    targetEndDate: string | null,
    targetDescription: string | null,
  ) => void;
  userColor: string;
}) {
  const appColors = useAppColors();

  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('');
  const [period, setPeriod] = useState<GoalPeriodType>('daily');
  const [reminder, setReminder] = useState(true);
  const [repeating, setRepeating] = useState(true);
  const [stake, setStake] = useState('');
  const [activeDays, setActiveDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [useMetric, setUseMetric] = useState(false);
  const [metricTarget, setMetricTarget] = useState<string>('');
  const [metricUnit, setMetricUnit] = useState<string>('');
  const [targetEndDate, setTargetEndDate] = useState<Date | null>(null);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [targetDescription, setTargetDescription] = useState('');

  useEffect(() => {
    if (!visible || !goal) return;
    setTitle(goal.title);
    setEmoji(goal.emoji ?? '');
    setPeriod(goal.period_type);
    setReminder(goal.reminder_enabled);
    setRepeating(goal.repeating !== false);
    setStake(goal.stake ?? '');
    setTargetDescription(goal.target_description ?? '');
    setTargetEndDate(goal.target_end_date ? new Date(goal.target_end_date + 'T12:00:00') : null);
    if (goal.period_type === 'daily' && goal.active_days && goal.active_days.length > 0) {
      setActiveDays([...goal.active_days].sort((a, b) => a - b));
    } else {
      setActiveDays([0, 1, 2, 3, 4, 5, 6]);
    }
    if (goal.metric_target != null) {
      setUseMetric(true);
      setMetricTarget(String(goal.metric_target));
      setMetricUnit(goal.metric_unit ?? '');
    } else {
      setUseMetric(false);
      setMetricTarget('');
      setMetricUnit('');
    }
  }, [visible, goal]);

  function handleSave() {
    if (!goal) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    if (period === 'long_term' && !targetEndDate) {
      Alert.alert('Due date required', 'Long term goals need a due date.');
      return;
    }
    const trimmedStake = stake.trim();
    const trimmedTargetDesc = targetDescription.trim() || null;
    const parsedTarget = useMetric && metricTarget.trim() !== '' ? Number(metricTarget) : null;
    const endDateStr = targetEndDate ? formatDateForInput(targetEndDate) : null;

    onSave(
      trimmedTitle,
      emoji,
      period,
      reminder,
      trimmedStake,
      period === 'daily'
        ? activeDays.length === 7
          ? null
          : activeDays
        : null,
      useMetric && parsedTarget != null && !Number.isNaN(parsedTarget) ? parsedTarget : null,
      useMetric && metricUnit.trim() ? metricUnit.trim() : null,
      repeating,
      endDateStr,
      trimmedTargetDesc,
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={am.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[am.sheet, { backgroundColor: appColors.surface }]}>
          <View style={am.handle} />
          <Text style={[am.sheetTitle, { color: appColors.label }]}>Edit goal</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Title */}
            <Text style={[am.label, { color: appColors.labelSecondary }]}>Goal name</Text>
            <View
              style={[
                am.inputWrap,
                { borderColor: hexToRgba(userColor, 0.3), backgroundColor: hexToRgba(userColor, 0.04) },
              ]}
            >
              <RNTextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Goal name"
                placeholderTextColor={appColors.labelTertiary}
                style={[am.input, { color: appColors.label }]}
                selectionColor={userColor}
                returnKeyType="done"
                maxLength={60}
              />
            </View>

            {/* Goal type: daily, weekly, or long term */}
            <Text style={[am.label, { color: appColors.labelSecondary }]}>Goal type</Text>
            <View style={am.chipRow}>
              {(['daily', 'weekly', 'long_term'] as GoalPeriodType[]).map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setPeriod(p)}
                  style={[
                    am.chip,
                    period === p && {
                      backgroundColor: hexToRgba(userColor, 0.14),
                      borderColor: userColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      am.chipText,
                      period === p && { color: userColor, fontWeight: '700' },
                    ]}
                  >
                    {PERIOD_CONFIG[p].label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Repeating — hidden for long term */}
            {period !== 'long_term' && (
              <Pressable
                onPress={() => setRepeating((v) => !v)}
                style={[
                  am.metricToggleRow,
                  { borderColor: repeating ? hexToRgba(userColor, 0.3) : 'rgba(0,0,0,0.08)', backgroundColor: repeating ? hexToRgba(userColor, 0.06) : 'transparent' },
                ]}
              >
                <Ionicons
                  name={repeating ? 'repeat' : 'repeat-outline'}
                  size={20}
                  color={repeating ? userColor : appColors.labelTertiary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[am.reminderLabel, { color: repeating ? userColor : appColors.label }]}>Repeating</Text>
                  <Text style={[am.reminderSub, { color: appColors.labelTertiary }]}>
                    {repeating ? 'Repeats each period' : 'One-off for this period'}
                  </Text>
                </View>
              </Pressable>
            )}

            {/* Due date (edit) */}
            <Text style={[am.label, { color: appColors.labelSecondary }]}>
              {period === 'long_term' ? 'Due date' : 'Until when?'}
            </Text>
            <Pressable
              onPress={() => setShowEndDatePicker(true)}
              style={[am.pickerRow, { borderColor: hexToRgba(userColor, 0.25), backgroundColor: hexToRgba(userColor, 0.04) }]}
            >
              <Ionicons name="calendar-outline" size={20} color={userColor} />
              <Text style={[am.pickerRowText, { color: appColors.label }]}>
                {targetEndDate ? targetEndDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No end date'}
              </Text>
              {targetEndDate ? (
                <Pressable onPress={() => setTargetEndDate(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={appColors.labelTertiary} />
                </Pressable>
              ) : null}
            </Pressable>
            {showEndDatePicker && (
              <DateTimePicker
                value={targetEndDate ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(_, date) => {
                  if (date) setTargetEndDate(date);
                  if (Platform.OS === 'android') setShowEndDatePicker(false);
                }}
              />
            )}
            <Text style={[am.label, { color: appColors.labelSecondary }]}>Big goal in mind?</Text>
            <View style={[am.inputWrap, { borderColor: hexToRgba(userColor, 0.2), backgroundColor: hexToRgba(userColor, 0.03) }]}>
              <RNTextInput
                value={targetDescription}
                onChangeText={setTargetDescription}
                placeholder="e.g. Run a marathon"
                placeholderTextColor={appColors.labelTertiary}
                style={[am.input, { color: appColors.label }]}
                selectionColor={userColor}
                returnKeyType="done"
                maxLength={80}
              />
            </View>

            {/* Active days (for daily goals) */}
            {period === 'daily' && (
              <>
                <Text style={[am.label, { color: appColors.labelSecondary }]}>Days of week</Text>
                <View style={am.daysRow}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, idx) => {
                    const selected = activeDays.includes(idx);
                    return (
                      <Pressable
                        key={idx}
                        onPress={() =>
                          setActiveDays((prev) =>
                            prev.includes(idx)
                              ? prev.filter((d) => d !== idx)
                              : [...prev, idx].sort((a, b) => a - b),
                          )
                        }
                        style={[
                          am.dayChip,
                          selected && {
                            backgroundColor: hexToRgba(userColor, 0.18),
                            borderColor: userColor,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            am.dayChipText,
                            selected && { color: userColor },
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {/* Metric settings */}
            <Pressable
              onPress={() => setUseMetric((v) => !v)}
              style={[
                am.metricToggleRow,
                {
                  borderColor: useMetric
                    ? hexToRgba(userColor, 0.3)
                    : 'rgba(0,0,0,0.08)',
                  backgroundColor: useMetric
                    ? hexToRgba(userColor, 0.06)
                    : 'transparent',
                },
              ]}
            >
              <Ionicons
                name={useMetric ? 'stats-chart' : 'stats-chart-outline'}
                size={20}
                color={useMetric ? userColor : appColors.labelTertiary}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    am.reminderLabel,
                    { color: useMetric ? userColor : appColors.label },
                  ]}
                >
                  Track a number
                </Text>
                <Text style={[am.reminderSub, { color: appColors.labelTertiary }]}>
                  e.g. 10 miles, 8 glasses, 20 pages
                </Text>
              </View>
            </Pressable>

            {useMetric && (
              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing.sm,
                  marginBottom: spacing.lg,
                }}
              >
                <View
                  style={[
                    am.inputWrap,
                    {
                      flex: 1,
                      borderColor: hexToRgba(userColor, 0.3),
                      backgroundColor: hexToRgba(userColor, 0.04),
                    },
                  ]}
                >
                  <RNTextInput
                    value={metricTarget}
                    onChangeText={setMetricTarget}
                    placeholder="Target"
                    keyboardType="numeric"
                    placeholderTextColor={appColors.labelTertiary}
                    style={[am.input, { color: appColors.label }]}
                    selectionColor={userColor}
                    returnKeyType="done"
                    maxLength={6}
                  />
                </View>
                <View
                  style={[
                    am.inputWrap,
                    {
                      flex: 1,
                      borderColor: hexToRgba(userColor, 0.15),
                      backgroundColor: hexToRgba(userColor, 0.02),
                    },
                  ]}
                >
                  <RNTextInput
                    value={metricUnit}
                    onChangeText={setMetricUnit}
                    placeholder="Unit (miles, pages)"
                    placeholderTextColor={appColors.labelTertiary}
                    style={[am.input, { color: appColors.label }]}
                    selectionColor={userColor}
                    returnKeyType="done"
                    maxLength={20}
                  />
                </View>
              </View>
            )}

            {/* Accountability stake */}
            <Text style={[am.label, { color: appColors.labelSecondary }]}>
              Accountability stake{' '}
              <Text
                style={{
                  color: appColors.labelTertiary,
                  fontWeight: '400',
                }}
              >
                (optional)
              </Text>
            </Text>
            <View
              style={[
                am.inputWrap,
                {
                  borderColor: hexToRgba(appColors.warning, 0.3),
                  backgroundColor: hexToRgba(appColors.warning, 0.04),
                },
              ]}
            >
              <Ionicons
                name="trophy-outline"
                size={18}
                color={appColors.warning}
                style={{ marginRight: spacing.sm }}
              />
              <RNTextInput
                value={stake}
                onChangeText={setStake}
                placeholder="e.g. Loser buys coffee"
                placeholderTextColor={appColors.labelTertiary}
                style={[am.input, { color: appColors.label }]}
                selectionColor={appColors.warning}
                returnKeyType="done"
                maxLength={60}
              />
            </View>

            {/* Reminder toggle */}
            <Pressable
              onPress={() => setReminder((v) => !v)}
              style={[
                am.reminderRow,
                {
                  borderColor: reminder
                    ? hexToRgba(userColor, 0.3)
                    : 'rgba(0,0,0,0.08)',
                  backgroundColor: reminder
                    ? hexToRgba(userColor, 0.06)
                    : 'transparent',
                },
              ]}
            >
              <Ionicons
                name={reminder ? 'notifications' : 'notifications-off'}
                size={20}
                color={reminder ? userColor : appColors.labelTertiary}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    am.reminderLabel,
                    { color: reminder ? userColor : appColors.label },
                  ]}
                >
                  Daily reminder
                </Text>
                <Text style={[am.reminderSub, { color: appColors.labelTertiary }]}>
                  Uses your profile reminder time
                </Text>
              </View>
              <View
                style={[
                  am.toggle,
                  {
                    backgroundColor: reminder
                      ? userColor
                      : 'rgba(0,0,0,0.1)',
                  },
                ]}
              >
                <Text style={am.toggleText}>{reminder ? 'On' : 'Off'}</Text>
              </View>
            </Pressable>

            <View style={am.btnRow}>
              <Button
                title="Cancel"
                onPress={onClose}
                variant="ghost"
                color={appColors.labelSecondary}
                size="md"
                style={{ flex: 1 }}
              />
              <Button
                title="Save changes"
                onPress={handleSave}
                color={userColor}
                size="md"
                style={{ flex: 1 }}
                disabled={!title.trim()}
              />
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}


// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function GoalsScreen() {
  const { userId, userColor } = useUserMode();
  const { getUserName, getUserColor } = useTheme();
  const appColors = useAppColors();
  const { profile, setNotificationTime } = useProfile(userId);

  const partnerId: UserId    = userId === 'adrian' ? 'sarah' : 'adrian';
  const partnerName: string  = getUserName(partnerId);
  const partnerColor: string = getUserColor(partnerId);

  const {
    goals, partnerGoals, completions, loading, refresh,
    addGoal, update, remove,
    checkIn, uncheck,
    isCheckedIn, recentDates,
    currentPeriodAmount,
    completedTodayCount,
    logMetricProgress,
  } = useGoals(userId);

  // Modals
  const [showAdd, setShowAdd]           = useState(false);
  const [showNotif, setShowNotif]       = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [editingGoal, setEditingGoal]   = useState<Goal | null>(null);
  const [milestoneData, setMilestoneData] = useState<{ streak: number; title: string } | null>(null);

  const [notifDate, setNotifDate] = useState(() => {
    const d = new Date(); d.setHours(9,0,0,0); return d;
  });
  const [goalsTagline, setGoalsTagline] = useState(() => getGoalsTagline());

  // Silent refresh on focus; rotate tagline when tab is focused for a fresh, cozy feel
  useFocusEffect(useCallback(() => {
    refresh(true);
    setGoalsTagline(getGoalsTagline());
  }, [refresh]));

  // Schedule partner goal, streak, and encouragement notifications when goals or notification time change
  useEffect(() => {
    const time = profile?.notification_time;
    if (!time) return;
    schedulePartnerGoalReminders(partnerGoals, partnerName, time).catch(() => {});
    scheduleGoalStreakReminders(goals, time).catch(() => {});
    scheduleEncouragementNotification(completedTodayCount, goals.length, time).catch(() => {});
  }, [goals, partnerGoals, profile?.notification_time, partnerName, completedTodayCount]);

  // ── handlers ────────────────────────────────────────────────────────────────

  const notifTimeDisplay = profile?.notification_time
    ? formatTime(profile.notification_time)
    : '9:00 AM';

  async function handleAdd(
    title: string,
    emoji: string,
    period: GoalPeriodType,
    reminder: boolean,
    stake: string,
    activeDays: number[] | null,
    metricTarget: number | null,
    metricUnit: string | null,
    repeating: boolean,
    targetEndDate: string | null,
    targetDescription: string | null,
    subObjectives: string[] | null,
  ) {
    const created = await addGoal({
      owner: userId,
      title,
      emoji,
      period_type: period,
      reminder_enabled: reminder,
      repeating,
      stake: stake || null,
      active_days: activeDays,
      metric_target: metricTarget,
      metric_unit: metricUnit,
      target_end_date: targetEndDate,
      target_description: targetDescription,
      sub_objectives: subObjectives ?? undefined,
    });
    if (reminder && profile?.notification_time) {
      await scheduleGoalReminder(created.id, created.title, created.period_type, profile.notification_time);
    }
    setShowAdd(false);
  }

  async function handleCheckIn(goal: Goal) {
    try {
      const result = await checkIn(goal);
      if (result.isNew && result.isMilestoneHit) {
        setMilestoneData({ streak: result.newStreak, title: goal.title });
      }
      if (result.isNew && goals.length > 0 && completedTodayCount + 1 >= goals.length) setShowCelebration(true);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not save.');
    }
  }

  async function handleDelete(goal: Goal) {
    Alert.alert('Delete goal', `Delete "${goal.title}"? Your streak will be lost.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        playTrash();
        await cancelGoalReminder(goal.id);
        await cancelGoalStreakReminder(goal.id);
        await remove(goal.id);
      }},
    ]);
  }

  async function handleEditSave(
    goal: Goal,
    title: string,
    emoji: string,
    period: GoalPeriodType,
    reminder: boolean,
    stake: string,
    activeDays: number[] | null,
    metricTarget: number | null,
    metricUnit: string | null,
    repeating: boolean,
    targetEndDate: string | null,
    targetDescription: string | null,
  ) {
    await update(goal.id, {
      title,
      emoji,
      period_type: period,
      reminder_enabled: reminder,
      repeating: period === 'long_term' ? false : repeating,
      stake: stake || null,
      active_days: period === 'daily' ? activeDays : null,
      metric_target: metricTarget,
      metric_unit: metricUnit,
      target_end_date: targetEndDate,
      target_description: targetDescription,
    });
    setEditingGoal(null);
  }

  async function handleSaveNotif() {
    const h = notifDate.getHours();
    const m = notifDate.getMinutes();
    const time = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    await setNotificationTime(time);
    await rescheduleAllGoalReminders(goals, time);
    setShowNotif(false);
  }

  function openNotif() {
    const [h,m] = (profile?.notification_time ?? '09:00').split(':').map(Number);
    const d = new Date(); d.setHours(isNaN(h)?9:h, isNaN(m)?0:m, 0, 0);
    setNotifDate(d);
    setShowNotif(true);
  }

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: appColors.surface }]} edges={['top']}>
      {/* Header — cozy: flame + growth ring, tagline */}
      <View style={[s.header, { backgroundColor: appColors.surface, borderBottomColor: appColors.separator }]}>
        <View style={s.headerLeft}>
          <View style={[s.headerBadgeRing, { borderColor: hexToRgba(userColor, 0.35) }]}>
            <LinearGradient
              colors={[userColor, userColor + 'CC']}
              style={s.headerBadge}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Ionicons name="flame" size={18} color="#fff" />
            </LinearGradient>
          </View>
          <View>
            <Text style={[s.headerTitle, { color: appColors.label }]}>Goals</Text>
            <Text style={[s.headerSub, { color: appColors.labelTertiary }]}>
              {goalsTagline}
            </Text>
            <Text style={[s.headerComfort, { color: appColors.labelQuaternary }]}>
              {getComfortLineForTab('goals', new Date().toISOString().slice(0, 10))}
            </Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <Pressable
            onPress={() => setShowCelebration(true)}
            style={s.settingsBtn}
            hitSlop={8}
          >
            <Ionicons name="trophy-outline" size={20} color={appColors.labelSecondary} />
          </Pressable>
          <Pressable onPress={openNotif} style={s.settingsBtn} hitSlop={8}>
            <Ionicons name="notifications-outline" size={20} color={appColors.labelSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Main content — breathing background with warm tint for cozy goals feel */}
      <View style={[s.contentWrap, { backgroundColor: appColors.background }]}>
        <ACBackgroundBreathing extraTint={userColor} />
      {loading ? (
        <View style={s.loader}><ActivityIndicator color={userColor} size="large" /></View>
      ) : (
        <ScrollView
          style={s.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
        >

          {/* Weekly wins — friendly summary when user has completions this week */}
          {(() => {
            const now = new Date();
            const currentWeekKey = getPeriodKey(now, 'weekly');
            const completionsThisWeek = completions.filter(
              (c) =>
                c.owner === userId &&
                getPeriodKey(new Date(c.date + 'T12:00:00'), 'weekly') === currentWeekKey,
            ).length;
            if (completionsThisWeek === 0) return null;
            return (
              <View style={[s.weeklyWinsCard, { backgroundColor: userColor + '12', borderColor: userColor + '28' }]}>
                <View style={[s.weeklyWinsIconWrap, { backgroundColor: userColor + '20' }]}>
                  <Ionicons name="leaf" size={20} color={userColor} />
                </View>
                <View style={s.weeklyWinsTextCol}>
                  <Text style={[s.weeklyWinsText, { color: appColors.label }]}>
                    You completed {completionsThisWeek} goal{completionsThisWeek !== 1 ? 's' : ''} this week.
                  </Text>
                  <Text style={[s.weeklyWinsSub, { color: appColors.labelSecondary }]}>Small steps — you're growing.</Text>
                </View>
              </View>
            );
          })()}

          {/* Metrics bubble — above goals list */}
          {goals.length > 0 && (
            <View style={s.metricsBubble}>
              <LinearGradient
                colors={[appColors.gradientFrom, appColors.gradientTo]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={s.metricsGlow} />
              <View style={s.metricsRow}>
                <View style={s.metricBlock}>
                  <View style={s.metricIconWrap}>
                    <Ionicons name="checkmark-done" size={22} color="#fff" />
                  </View>
                  <Text style={s.metricsValue}>{completedTodayCount}</Text>
                  <Text style={s.metricsLabel}>Done today</Text>
                </View>
                <View style={s.metricsDivider} />
                <View style={s.metricBlock}>
                  <View style={s.metricIconWrap}>
                    <Ionicons name="flag" size={22} color="#fff" />
                  </View>
                  <Text style={s.metricsValue}>{goals.length}</Text>
                  <Text style={s.metricsLabel}>Total goals</Text>
                </View>
                <View style={s.metricsDivider} />
                <View style={s.metricBlock}>
                  <View style={s.metricIconWrap}>
                    <Ionicons name="flame" size={22} color="#fff" />
                  </View>
                  <Text style={s.metricsValue}>
                    {goals.length > 0 ? Math.max(...goals.map((g) => g.longest_streak), 0) : 0}
                  </Text>
                  <Text style={s.metricsLabel}>Best streak</Text>
                </View>
              </View>
            </View>
          )}

          {/* TODAY'S DAILY GOALS — one-off daily goals due today */}
          {(() => {
            const todayKey = new Date().toISOString().slice(0, 10);
            const todayDailyGoals = goals.filter(
              (g) => g.period_type === 'daily' && g.repeating === false && g.due_date === todayKey,
            );
            const otherGoals = goals.filter(
              (g) => !(g.period_type === 'daily' && g.repeating === false && g.due_date === todayKey),
            );
            return (
              <>
                {todayDailyGoals.length > 0 && (
                  <>
                    <View style={[s.sectionHeader, { marginBottom: spacing.sm }]}>
                      <Text style={[s.sectionTitle, { color: appColors.labelSecondary }]}>TODAY'S DAILY GOALS</Text>
                    </View>
                    {todayDailyGoals.map((g) => (
                      <HabitCard
                        key={g.id}
                        habit={g}
                        myUserId={userId}
                        partnerId={partnerId}
                        partnerName={partnerName}
                        partnerColor={partnerColor}
                        isMyCard
                        checkedInMe={isCheckedIn(g.id, userId, g)}
                        checkedInPartner={isCheckedIn(g.id, partnerId, g)}
                        recentDatesMe={recentDates(g.id, userId)}
                        recentDatesPartner={recentDates(g.id, partnerId)}
                        onCheckIn={() => handleCheckIn(g)}
                        onUncheck={() => uncheck(g)}
                        onDelete={() => handleDelete(g)}
                        onEdit={() => setEditingGoal(g)}
                        onSaveSubObjectives={async (id, list) => { await update(id, { sub_objectives: list }); }}
                        currentPeriodAmount={currentPeriodAmount}
                        onLogMetric={logMetricProgress}
                        periodProgress={getPeriodProgress(g, completions, userId)}
                        endDateLabel={getEndDateLabel(g.target_end_date ?? null)}
                      />
                    ))}
                  </>
                )}

                {/* MY GOALS (repeating or with deadline) */}
                <View style={s.sectionHeader}>
                  <Text style={[s.sectionTitle, { color: appColors.labelSecondary }]}>
                    {todayDailyGoals.length > 0 ? 'MY GOALS' : 'MY GOALS'}
                  </Text>
                  <Pressable
                    onPress={() => setShowAdd(true)}
                    style={[s.addBtn, { backgroundColor: userColor }]}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={s.addBtnText}>New</Text>
                  </Pressable>
                </View>

                {otherGoals.length === 0 && todayDailyGoals.length === 0 ? (
                  <GlassCard style={s.emptyCard}>
                    <EmptyGoalsCard userColor={userColor} appColors={appColors} onAddGoal={() => setShowAdd(true)} />
                  </GlassCard>
                ) : otherGoals.length === 0 ? null : (
                  otherGoals.map((g, idx) => (
                    <AnimatedReanimated.View key={g.id} entering={FadeInDown.delay(idx * 50).duration(260)}>
                      <HabitCard
                        habit={g}
                        myUserId={userId}
                        partnerId={partnerId}
                        partnerName={partnerName}
                        partnerColor={partnerColor}
                        isMyCard
                        checkedInMe={isCheckedIn(g.id, userId, g)}
                        checkedInPartner={isCheckedIn(g.id, partnerId, g)}
                        recentDatesMe={recentDates(g.id, userId)}
                        recentDatesPartner={recentDates(g.id, partnerId)}
                        onCheckIn={() => handleCheckIn(g)}
                        onUncheck={() => uncheck(g)}
                        onDelete={() => handleDelete(g)}
                        onEdit={() => setEditingGoal(g)}
                        onSaveSubObjectives={async (id, list) => { await update(id, { sub_objectives: list }); }}
                        currentPeriodAmount={currentPeriodAmount}
                        onLogMetric={logMetricProgress}
                        periodProgress={getPeriodProgress(g, completions, userId)}
                        endDateLabel={getEndDateLabel(g.target_end_date ?? null)}
                      />
                    </AnimatedReanimated.View>
                  ))
                )}
              </>
            );
          })()}


          {/* PARTNER'S HABITS */}
          {partnerGoals.length > 0 && (
            <>
              <View style={[s.sectionHeader, { marginTop: spacing.xl }]}>
                <Text style={[s.sectionTitle, { color: appColors.labelSecondary }]}>
                  {partnerName.toUpperCase()}'S HABITS
                </Text>
              </View>
              {partnerGoals.map((g, idx) => (
                <AnimatedReanimated.View key={g.id} entering={FadeInDown.delay(idx * 50).duration(260)}>
                  <HabitCard
                    habit={g}
                    myUserId={userId}
                    partnerId={partnerId}
                    partnerName={partnerName}
                    partnerColor={partnerColor}
                    isMyCard={false}
                    checkedInMe={isCheckedIn(g.id, userId, g)}
                    checkedInPartner={isCheckedIn(g.id, partnerId, g)}
                    recentDatesMe={recentDates(g.id, userId)}
                    recentDatesPartner={recentDates(g.id, partnerId)}
                    onCheckIn={() => {}}
                    onUncheck={() => {}}
                    onDelete={() => {}}
                    onEdit={() => {}}
                    currentPeriodAmount={currentPeriodAmount}
                    periodProgress={getPeriodProgress(g, completions, partnerId)}
                    endDateLabel={getEndDateLabel(g.target_end_date ?? null)}
                  />
                </AnimatedReanimated.View>
              ))}
            </>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      {/* Add goal modal */}
      <AddGoalModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={handleAdd}
        userColor={userColor}
        notifTimeDisplay={notifTimeDisplay}
      />

      {/* Edit goal modal */}
      <EditGoalModal
        visible={!!editingGoal}
        goal={editingGoal}
        onClose={() => setEditingGoal(null)}
        onSave={(title, emoji, period, reminder, stake, activeDays, metricTarget, metricUnit, repeating, targetEndDate, targetDescription) =>
          editingGoal &&
          handleEditSave(
            editingGoal,
            title,
            emoji,
            period,
            reminder,
            stake,
            activeDays,
            metricTarget,
            metricUnit,
            repeating,
            targetEndDate,
            targetDescription,
          )
        }
        userColor={userColor}
      />

      {/* Milestone celebration modal */}
      <MilestoneModal
        visible={!!milestoneData}
        streak={milestoneData?.streak ?? 0}
        goalTitle={milestoneData?.title ?? ''}
        color={userColor}
        onClose={() => setMilestoneData(null)}
      />

      {/* Accomplishments celebration popup */}
      <CelebrationModal
        visible={showCelebration}
        onClose={() => setShowCelebration(false)}
        completedToday={completedTodayCount}
        totalGoals={goals.length}
        bestStreak={goals.length > 0 ? Math.max(...goals.map((g) => g.longest_streak), 0) : 0}
        userColor={userColor}
        appColors={appColors}
      />

      {/* Notification time modal */}
      <Modal visible={showNotif} transparent animationType="fade" onRequestClose={() => setShowNotif(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowNotif(false)} />
          <View style={[s.modalBox, { backgroundColor: appColors.surface }]}>
            <View style={[s.modalIconWrap, { backgroundColor: hexToRgba(userColor, 0.12) }]}>
              <Ionicons name="notifications" size={24} color={userColor} />
            </View>
            <Text style={[s.modalTitle, { color: appColors.label }]}>Reminder time</Text>
            <Text style={[s.modalSub, { color: appColors.labelSecondary }]}>
              Daily goal reminders fire at this time.
            </Text>
            <View style={s.pickerWrap}>
              <DateTimePicker
                value={notifDate}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => d && setNotifDate(d)}
                textColor={appColors.label}
                themeVariant="light"
              />
            </View>
            <View style={s.modalBtns}>
              <Button title="Cancel" onPress={() => setShowNotif(false)} variant="ghost" color={appColors.labelSecondary} size="md" style={{ flex: 1 }} />
              <Button title="Save"   onPress={handleSaveNotif} color={userColor} size="md" style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1 },
  contentWrap: { flex: 1 },
  loader:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content:{ paddingTop: spacing.lg, paddingBottom: spacing.xxxl },

  weeklyWinsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  weeklyWinsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weeklyWinsTextCol: { flex: 1 },
  weeklyWinsText: { ...typography.bodyEmphasis },
  weeklyWinsSub: { ...typography.caption, marginTop: 2 },

  metricsBubble: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    ...shadows.lg,
  },
  metricsGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  metricsRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  metricBlock:   { flex: 1, alignItems: 'center' },
  metricIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  metricsValue:  { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  metricsLabel:  { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.92)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.8 },
  metricsDivider: { width: 1, height: 44, backgroundColor: 'rgba(255,255,255,0.3)' },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerBadgeRing: { padding: 2, borderRadius: radius.md + 2, alignItems: 'center', justifyContent: 'center' },
  headerBadge: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.title3 },
  headerSub:   { ...typography.caption, marginTop: 1, maxWidth: 200 },
  headerComfort: { ...typography.caption, fontStyle: 'italic', marginTop: 2, maxWidth: 220 },
  emptyIconRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  emptyIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  iconBtn:     { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.fillSecondary, alignItems: 'center', justifyContent: 'center' },
  settingsBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  sectionTitle:  { ...typography.subhead, letterSpacing: 0.8 },
  addBtn:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.full },
  addBtnText:    { fontSize: 13, fontWeight: '700', color: '#fff' },

  emptyCard:  { marginHorizontal: spacing.lg },
  emptyInner: { alignItems: 'center', padding: spacing.xl, alignSelf: 'center', maxWidth: 320, width: '100%' },
  emptyTitle: { ...typography.title3, marginBottom: spacing.sm, textAlign: 'center', paddingHorizontal: spacing.sm },
  emptyDesc:  { ...typography.body, color: colors.labelSecondary, textAlign: 'center', paddingHorizontal: spacing.sm },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  modalBox:     { borderRadius: radius.xxl, padding: spacing.xxl, width: '100%', maxWidth: 360, alignItems: 'center', ...shadows.lg },
  modalIconWrap:{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  modalTitle:   { ...typography.title3, marginBottom: spacing.xs },
  modalSub:     { ...typography.body, textAlign: 'center', marginBottom: spacing.md },
  pickerWrap:   { marginVertical: spacing.md, alignItems: 'center' },
  modalBtns:    { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, width: '100%' },
});
