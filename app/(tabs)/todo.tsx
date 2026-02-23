import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, Pressable, Modal,
  Alert, KeyboardAvoidingView, Platform, Animated, Easing,
  ActivityIndicator, TextInput as RNTextInput,
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
import { UserToggle } from '@/components/ui/UserToggle';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { scheduleGoalReminder, cancelGoalReminder, rescheduleAllGoalReminders } from '@/services/notifications';
import { isMilestone, nextMilestone, MILESTONES } from '@/services/goals';
import { spacing, typography, colors, radius, shadows } from '@/theme';
import type { GoalPeriodType, Goal, UserId } from '@/types';

// ─── constants ────────────────────────────────────────────────────────────────

const PERIOD_CONFIG: Record<GoalPeriodType, { label: string; shortLabel: string }> = {
  daily:   { label: 'Daily',   shortLabel: 'day' },
  weekly:  { label: 'Weekly',  shortLabel: 'week' },
  monthly: { label: 'Monthly', shortLabel: 'month' },
};

const MILESTONE_LABELS: Record<number, { title: string; desc: string }> = {
  3:   { title: '3-Day Streak!',    desc: "You're building a habit!" },
  7:   { title: 'One Week!',        desc: 'A full week — impressive!' },
  14:  { title: 'Two Weeks!',       desc: "You're on fire!" },
  21:  { title: '21 Days!',         desc: 'Habits form in 21 days. You did it!' },
  30:  { title: 'One Month!',       desc: 'A whole month of dedication!' },
  50:  { title: '50-Day Legend!',   desc: 'Half a century of streaks!' },
  75:  { title: '75 Days!',         desc: "You're truly unstoppable." },
  100: { title: '100-Day Club!',    desc: 'Triple digits — legendary!' },
  150: { title: '150 Days!',        desc: "You're a habit master." },
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

// ─── MiniCalendar — last 28 days dot grid ────────────────────────────────────

function MiniCalendar({ dates, color }: { dates: Set<string>; color: string }) {
  const days: string[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return (
    <View style={mc.grid}>
      {days.map((d) => (
        <View
          key={d}
          style={[
            mc.dot,
            dates.has(d)
              ? { backgroundColor: color }
              : { backgroundColor: hexToRgba(color, 0.12) },
          ]}
        />
      ))}
    </View>
  );
}
const mc = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: spacing.sm },
  dot:  { width: 10, height: 10, borderRadius: 3 },
});

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
}: { done: boolean; onPress: () => void; color: string; loading: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePress() {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, damping: 8, stiffness: 500 }),
      Animated.spring(scale, { toValue: 1,    useNativeDriver: true, damping: 12, stiffness: 300 }),
    ]).start();
    onPress();
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={loading}
      hitSlop={12}
      style={ci.pressable}
    >
      <Animated.View style={[ci.btn, done && { backgroundColor: color }, { transform: [{ scale }] }]} collapsable={false}>
        {loading ? (
          <ActivityIndicator size="small" color={done ? '#fff' : color} />
        ) : done ? (
          <Ionicons name="checkmark" size={22} color="#fff" />
        ) : (
          <View style={[ci.circle, { borderColor: hexToRgba(color, 0.5) }]} />
        )}
      </Animated.View>
    </Pressable>
  );
}
const ci = StyleSheet.create({
  pressable: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  btn:    { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  circle: { width: 26, height: 26, borderRadius: 13, borderWidth: 2.5 },
});

// ─── MilestoneModal ───────────────────────────────────────────────────────────

function MilestoneModal({
  visible,
  streak,
  habitTitle,
  color,
  onClose,
}: { visible: boolean; streak: number; habitTitle: string; color: string; onClose: () => void }) {
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
          <Text style={mm.habitName}>{habitTitle}</Text>
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
  habitName:   { ...typography.subhead, color: colors.labelSecondary, marginBottom: spacing.sm },
  desc:        { ...typography.body, color: colors.labelSecondary, textAlign: 'center', marginBottom: spacing.xl },
  streakBadge: { flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.full, marginBottom: spacing.xl },
  streakNum:   { fontSize: 36, fontWeight: '800' },
  streakLabel: { ...typography.callout },
  btn:         { paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, borderRadius: radius.full },
  btnText:     { ...typography.bodyEmphasis, color: '#fff' },
});

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
}) {
  const appColors  = useAppColors();
  const { getUserColor, getUserName } = useTheme();
  const myColor    = getUserColor(myUserId);
  const color      = isMyCard ? myColor : partnerColor;
  const [expanded, setExpanded] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(expandAnim, { toValue: expanded ? 1 : 0, useNativeDriver: false, damping: 20, stiffness: 200 }).start();
  }, [expanded]);

  const cardH = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 420] });

  const next = nextMilestone(habit.current_streak);
  const progressToNext = next
    ? Math.min(habit.current_streak / next, 1)
    : 1;

  async function handleCheckIn() {
    setCheckLoading(true);
    try { await onCheckIn(); } finally { setCheckLoading(false); }
  }
  async function handleUncheck() {
    setCheckLoading(true);
    try { await onUncheck(); } finally { setCheckLoading(false); }
  }

  return (
    <GlassCard style={hc.card} accentColor={color}>
      {/* Main row: left part toggles expand; check-in button is separate so taps register */}
      <View style={hc.topRow} pointerEvents="box-none">
        <Pressable onPress={() => setExpanded(e => !e)} style={hc.topRowPressable}>
          {/* Habit badge (first letter when no emoji) */}
          <View style={[hc.emojiBadge, { backgroundColor: hexToRgba(color, 0.14) }]}>
            <Text style={{ fontSize: 22, color, fontWeight: '700' }}>
              {habit.emoji || (habit.title ? habit.title[0].toUpperCase() : '')}
            </Text>
          </View>

          {/* Title + meta */}
          <View style={hc.mid}>
            <Text style={[hc.title, { color: appColors.label }]} numberOfLines={1}>{habit.title}</Text>
            <View style={hc.metaRow}>
              <Text style={[hc.period, { color: hexToRgba(color, 0.7) }]}>
                {PERIOD_CONFIG[habit.period_type].label}
              </Text>
              {habit.stake ? (
                <View style={[hc.stakeBadge, { backgroundColor: hexToRgba('#F59E0B', 0.12) }]}>
                  <Ionicons name="trophy-outline" size={10} color="#F59E0B" />
                  <Text style={hc.stakeText} numberOfLines={1}>{habit.stake}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Streak + flame */}
          <View style={hc.streakCol}>
            <StreakFlame streak={habit.current_streak} color={color} size={22} />
            <Text style={[hc.streakNum, { color }]}>{habit.current_streak}</Text>
          </View>
        </Pressable>

        {/* Check-in button (only for my own habits) — wrapped so it never shrinks and stays tappable */}
        {isMyCard && (
          <View style={hc.checkInWrap}>
            <CheckInButton
              done={checkedInMe}
              onPress={checkedInMe ? handleUncheck : handleCheckIn}
              color={color}
              loading={checkLoading}
            />
          </View>
        )}

        {/* Partner done indicator */}
        {!isMyCard && (
          <View style={[hc.partnerDot, { backgroundColor: checkedInPartner ? color : hexToRgba(color, 0.18) }]}>
            <Ionicons name={checkedInPartner ? 'checkmark' : 'close'} size={12} color={checkedInPartner ? '#fff' : hexToRgba(color, 0.5)} />
          </View>
        )}
      </View>

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

      {/* Expandable detail — tall enough to show full content, scrollable if needed */}
      <Animated.View style={{ maxHeight: cardH, overflow: 'hidden' }}>
        <ScrollView
          style={hc.expandScroll}
          contentContainerStyle={hc.expandBody}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
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

          {/* Mini calendar — my check-ins */}
          <Text style={[hc.calLabel, { color: hexToRgba(color, 0.6) }]}>
            {isMyCard ? 'Your' : getUserName(habit.owner as UserId) + "'s"} last 28 days
          </Text>
          <MiniCalendar dates={isMyCard ? recentDatesMe : recentDatesPartner} color={color} />

          {/* Accountability: partner check-ins on same habit if it's mine */}
          {isMyCard && (
            <>
              <Text style={[hc.calLabel, { color: hexToRgba(partnerColor, 0.6), marginTop: spacing.md }]}>
                {partnerName}'s check-ins
              </Text>
              <MiniCalendar dates={recentDatesPartner} color={partnerColor} />
              <View style={hc.partnerStatusRow}>
                <View style={[hc.partnerAvatar, { backgroundColor: hexToRgba(partnerColor, 0.14) }]}>
                  <Ionicons name={checkedInPartner ? 'checkmark' : 'time-outline'} size={14} color={partnerColor} />
                </View>
                <Text style={[hc.partnerStatusText, { color: appColors.labelSecondary }]}>
                  {partnerName} {checkedInPartner ? 'checked in today!' : 'hasn\'t checked in yet'}
                </Text>
              </View>
            </>
          )}

          {/* Actions */}
          {isMyCard && (
            <View style={hc.actions}>
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
        </ScrollView>
      </Animated.View>
    </GlassCard>
  );
}

const hc = StyleSheet.create({
  card:         { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  topRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md + 2 },
  topRowPressable: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minWidth: 0 },
  checkInWrap:  { flexShrink: 0, zIndex: 2 },
  emojiBadge:   { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  mid:          { flex: 1 },
  title:        { ...typography.bodyEmphasis, marginBottom: 3 },
  metaRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  period:       { ...typography.caption },
  stakeBadge:   { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.xs },
  stakeText:    { fontSize: 10, fontWeight: '600', color: '#F59E0B', maxWidth: 100 },
  streakCol:    { alignItems: 'center', gap: 1, minWidth: 36 },
  streakNum:    { fontSize: 13, fontWeight: '700' },
  partnerDot:   { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

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
  partnerStatusRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, padding: spacing.sm, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: radius.md },
  partnerAvatar:     { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  partnerStatusText: { ...typography.footnote, flex: 1 },
  actions:           { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionBtn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.md },
  actionBtnText:     { ...typography.subhead },
});

// ─── AddHabitModal ────────────────────────────────────────────────────────────

function AddHabitModal({
  visible,
  onClose,
  onAdd,
  userColor,
  notifTimeDisplay,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (title: string, emoji: string, period: GoalPeriodType, reminder: boolean, stake: string) => void;
  userColor: string;
  notifTimeDisplay: string;
}) {
  const appColors  = useAppColors();
  const [title, setTitle]   = useState('');
  const [emoji, setEmoji]   = useState('');
  const [period, setPeriod] = useState<GoalPeriodType>('daily');
  const [reminder, setReminder] = useState(true);
  const [stake, setStake]   = useState('');

  function reset() { setTitle(''); setEmoji(''); setPeriod('daily'); setReminder(true); setStake(''); }

  function handleAdd() {
    if (!title.trim()) return;
    onAdd(title.trim(), emoji, period, reminder, stake.trim());
    reset();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={am.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[am.sheet, { backgroundColor: appColors.surface }]}>
          {/* Handle */}
          <View style={am.handle} />
          <Text style={[am.sheetTitle, { color: appColors.label }]}>New Habit</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Title */}
            <Text style={[am.label, { color: appColors.labelSecondary }]}>Habit name</Text>
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

            {/* Frequency */}
            <Text style={[am.label, { color: appColors.labelSecondary }]}>Frequency</Text>
            <View style={am.chipRow}>
              {(['daily','weekly','monthly'] as GoalPeriodType[]).map((p) => (
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

            {/* Accountability stake */}
            <Text style={[am.label, { color: appColors.labelSecondary }]}>
              Accountability stake <Text style={{ color: appColors.labelTertiary, fontWeight: '400' }}>(optional)</Text>
            </Text>
            <View style={[am.inputWrap, { borderColor: hexToRgba('#F59E0B', 0.3), backgroundColor: hexToRgba('#F59E0B', 0.04) }]}>
              <Ionicons name="trophy-outline" size={18} color="#F59E0B" style={{ marginRight: spacing.sm }} />
              <RNTextInput
                value={stake}
                onChangeText={setStake}
                placeholder="e.g. Loser buys coffee"
                placeholderTextColor={appColors.labelTertiary}
                style={[am.input, { color: appColors.label }]}
                selectionColor="#F59E0B"
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
              <Button title="Cancel" onPress={() => { onClose(); reset(); }} variant="ghost" color={appColors.labelSecondary} size="md" style={{ flex: 1 }} />
              <Button title="Add Habit" onPress={handleAdd} color={userColor} size="md" style={{ flex: 1 }} disabled={!title.trim()} />
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
  sheet:       { borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: spacing.xl, maxHeight: '92%' },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.15)', alignSelf: 'center', marginBottom: spacing.lg },
  sheetTitle:  { ...typography.title3, textAlign: 'center', marginBottom: spacing.xl },
  label:       { ...typography.subhead, marginBottom: spacing.sm },
  emojiBtn:    { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm, backgroundColor: 'rgba(0,0,0,0.04)', borderWidth: 1.5, borderColor: 'transparent' },
  inputWrap:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.lg },
  input:       { flex: 1, ...typography.body, paddingVertical: 6 },
  chipRow:     { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  chip:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.10)' },
  chipText:    { ...typography.subhead, color: colors.label },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1.5, marginBottom: spacing.xl },
  reminderLabel:{ ...typography.bodyEmphasis },
  reminderSub:  { ...typography.caption, marginTop: 2 },
  toggle:      { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm },
  toggleText:  { fontSize: 12, fontWeight: '700', color: '#fff' },
  btnRow:      { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
});

// ─── SummaryBanner — today's progress ────────────────────────────────────────

function SummaryBanner({ goals, isCheckedIn, userColor, partnerColor, partnerName, userId, partnerId }:
  { goals: Goal[]; isCheckedIn: (id: string, owner: UserId) => boolean; userColor: string; partnerColor: string; partnerName: string; userId: UserId; partnerId: UserId }
) {
  const myTotal   = goals.length;
  const myDone    = goals.filter((g) => isCheckedIn(g.id, userId)).length;
  const partDone  = goals.filter((g) => isCheckedIn(g.id, partnerId)).length;
  const allDone   = myDone === myTotal && myTotal > 0;

  return (
    <GlassCard style={sb.card} accentColor={allDone ? userColor : undefined}>
      <LinearGradient
        colors={allDone ? [hexToRgba(userColor, 0.12), 'transparent'] : ['transparent', 'transparent']}
        style={[StyleSheet.absoluteFill, { borderRadius: radius.xl }]}
      />
      <View style={sb.row}>
        <View style={sb.half}>
          <Text style={[sb.name, { color: userColor }]}>You</Text>
          <Text style={[sb.fraction, { color: userColor }]}>{myDone}<Text style={sb.total}>/{myTotal}</Text></Text>
          <Text style={sb.sub}>habits today</Text>
        </View>
        <View style={[sb.divider, { backgroundColor: 'rgba(0,0,0,0.07)' }]} />
        <View style={sb.half}>
          <Text style={[sb.name, { color: partnerColor }]}>{partnerName}</Text>
          <Text style={[sb.fraction, { color: partnerColor }]}>{partDone}<Text style={sb.total}>/{myTotal}</Text></Text>
          <Text style={sb.sub}>habits today</Text>
        </View>
      </View>
      {allDone && (
        <View style={[sb.allDone, { backgroundColor: hexToRgba(userColor, 0.10) }]}>
          <Text style={[sb.allDoneText, { color: userColor }]}>All habits done today!</Text>
        </View>
      )}
    </GlassCard>
  );
}
const sb = StyleSheet.create({
  card:        { marginHorizontal: spacing.lg, marginBottom: spacing.lg, overflow: 'hidden' },
  row:         { flexDirection: 'row', alignItems: 'center', padding: spacing.lg },
  half:        { flex: 1, alignItems: 'center' },
  name:        { ...typography.subhead, marginBottom: 2 },
  fraction:    { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  total:       { fontSize: 18, fontWeight: '500', color: colors.labelTertiary },
  sub:         { ...typography.caption, color: colors.labelTertiary },
  divider:     { width: 1, height: 48, marginHorizontal: spacing.lg },
  allDone:     { marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.sm, borderRadius: radius.md, alignItems: 'center' },
  allDoneText: { ...typography.bodyEmphasis },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HabitsScreen() {
  const { userId, userColor } = useUserMode();
  const { getUserName, getUserColor } = useTheme();
  const appColors = useAppColors();
  const { profile, setNotificationTime } = useProfile(userId);

  const partnerId: UserId    = userId === 'adrian' ? 'sarah' : 'adrian';
  const partnerName: string  = getUserName(partnerId);
  const partnerColor: string = getUserColor(partnerId);

  const {
    goals, partnerGoals, loading, refresh,
    addGoal, update, remove,
    checkIn, uncheck,
    isCheckedIn, recentDates,
  } = useGoals(userId);

  // Modals
  const [showAdd, setShowAdd]           = useState(false);
  const [showNotif, setShowNotif]       = useState(false);
  const [editingGoal, setEditingGoal]   = useState<Goal | null>(null);
  const [milestoneData, setMilestoneData] = useState<{ streak: number; title: string } | null>(null);

  const [notifDate, setNotifDate] = useState(() => {
    const d = new Date(); d.setHours(9,0,0,0); return d;
  });

  // Silent refresh on focus so data stays fresh without a loading flash when closing modals or switching back
  useFocusEffect(useCallback(() => { refresh(true); }, [refresh]));

  // ── handlers ────────────────────────────────────────────────────────────────

  const notifTimeDisplay = profile?.notification_time
    ? formatTime(profile.notification_time)
    : '9:00 AM';

  async function handleAdd(title: string, emoji: string, period: GoalPeriodType, reminder: boolean, stake: string) {
    const created = await addGoal({
      owner: userId,
      title,
      emoji,
      period_type: period,
      reminder_enabled: reminder,
      stake: stake || null,
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
    } catch (e: any) {
      Alert.alert('Check-in failed', e?.message ?? 'Could not save. Make sure the habit_completions table exists (run supabase_migration_habits.sql).');
    }
  }

  async function handleDelete(goal: Goal) {
    Alert.alert('Delete habit', `Delete "${goal.title}"? Your streak will be lost.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await cancelGoalReminder(goal.id);
        await remove(goal.id);
      }},
    ]);
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
    <SafeAreaView style={[s.safe, { backgroundColor: appColors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: appColors.surface }]}>
        <View style={s.headerLeft}>
          <LinearGradient
            colors={[userColor, userColor + 'AA']}
            style={s.headerBadge}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Ionicons name="flame" size={18} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={[s.headerTitle, { color: appColors.label }]}>Habits</Text>
            <Text style={[s.headerSub, { color: appColors.labelTertiary }]}>
              {goals.length} habit{goals.length !== 1 ? 's' : ''} tracked
            </Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <Pressable onPress={openNotif} style={s.settingsBtn} hitSlop={8}>
            <Ionicons name="notifications-outline" size={20} color={appColors.labelSecondary} />
          </Pressable>
          <UserToggle />
        </View>
      </View>

      {loading ? (
        <View style={s.loader}><ActivityIndicator color={userColor} size="large" /></View>
      ) : (
        <ScrollView
          style={s.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
        >
          {/* Today's progress banner */}
          {goals.length > 0 && (
            <SummaryBanner
              goals={goals}
              isCheckedIn={isCheckedIn}
              userColor={userColor}
              partnerColor={partnerColor}
              partnerName={partnerName}
              userId={userId}
              partnerId={partnerId}
            />
          )}

          {/* MY HABITS */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: appColors.labelSecondary }]}>MY HABITS</Text>
            <Pressable
              onPress={() => setShowAdd(true)}
              style={[s.addBtn, { backgroundColor: userColor }]}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={s.addBtnText}>New</Text>
            </Pressable>
          </View>

          {goals.length === 0 ? (
            <GlassCard style={s.emptyCard}>
              <View style={s.emptyInner}>
                <Ionicons name="leaf-outline" size={48} color={userColor} style={{ marginBottom: spacing.sm }} />
                <Text style={[s.emptyTitle, { color: appColors.label }]}>No habits yet</Text>
                <Text style={[s.emptyDesc, { color: appColors.labelSecondary }]}>
                  Start a habit and build streaks with your accountability partner.
                </Text>
                <Button
                  title="Add your first habit"
                  onPress={() => setShowAdd(true)}
                  color={userColor}
                  size="md"
                  style={{ marginTop: spacing.md }}
                />
              </View>
            </GlassCard>
          ) : (
            goals.map((g) => (
              <HabitCard
                key={g.id}
                habit={g}
                myUserId={userId}
                partnerId={partnerId}
                partnerName={partnerName}
                partnerColor={partnerColor}
                isMyCard
                checkedInMe={isCheckedIn(g.id, userId)}
                checkedInPartner={isCheckedIn(g.id, partnerId)}
                recentDatesMe={recentDates(g.id, userId)}
                recentDatesPartner={recentDates(g.id, partnerId)}
                onCheckIn={() => handleCheckIn(g)}
                onUncheck={() => uncheck(g)}
                onDelete={() => handleDelete(g)}
                onEdit={() => setEditingGoal(g)}
              />
            ))
          )}

          {/* PARTNER'S HABITS */}
          {partnerGoals.length > 0 && (
            <>
              <View style={[s.sectionHeader, { marginTop: spacing.xl }]}>
                <Text style={[s.sectionTitle, { color: appColors.labelSecondary }]}>
                  {partnerName.toUpperCase()}'S HABITS
                </Text>
              </View>
              {partnerGoals.map((g) => (
                <HabitCard
                  key={g.id}
                  habit={g}
                  myUserId={userId}
                  partnerId={partnerId}
                  partnerName={partnerName}
                  partnerColor={partnerColor}
                  isMyCard={false}
                  checkedInMe={isCheckedIn(g.id, userId)}
                  checkedInPartner={isCheckedIn(g.id, partnerId)}
                  recentDatesMe={recentDates(g.id, userId)}
                  recentDatesPartner={recentDates(g.id, partnerId)}
                  onCheckIn={() => {}}
                  onUncheck={() => {}}
                  onDelete={() => {}}
                  onEdit={() => {}}
                />
              ))}
            </>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      {/* Add habit modal */}
      <AddHabitModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={handleAdd}
        userColor={userColor}
        notifTimeDisplay={notifTimeDisplay}
      />

      {/* Milestone celebration modal */}
      <MilestoneModal
        visible={!!milestoneData}
        streak={milestoneData?.streak ?? 0}
        habitTitle={milestoneData?.title ?? ''}
        color={userColor}
        onClose={() => setMilestoneData(null)}
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
              Daily habit reminders fire at this time.
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content:{ paddingTop: spacing.lg, paddingBottom: spacing.xxxl },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerBadge: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.title3 },
  headerSub:   { ...typography.caption, marginTop: 1 },
  iconBtn:     { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.fillSecondary, alignItems: 'center', justifyContent: 'center' },
  settingsBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  sectionTitle:  { ...typography.subhead, letterSpacing: 0.8 },
  addBtn:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.full },
  addBtnText:    { fontSize: 13, fontWeight: '700', color: '#fff' },

  emptyCard:  { marginHorizontal: spacing.lg },
  emptyInner: { alignItems: 'center', padding: spacing.xl },
  emptyTitle: { ...typography.title3, marginBottom: spacing.sm },
  emptyDesc:  { ...typography.body, color: colors.labelSecondary, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  modalBox:     { borderRadius: radius.xxl, padding: spacing.xxl, width: '100%', maxWidth: 360, alignItems: 'center', ...shadows.lg },
  modalIconWrap:{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  modalTitle:   { ...typography.title3, marginBottom: spacing.xs },
  modalSub:     { ...typography.body, textAlign: 'center', marginBottom: spacing.md },
  pickerWrap:   { marginVertical: spacing.md, alignItems: 'center' },
  modalBtns:    { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, width: '100%' },
});
