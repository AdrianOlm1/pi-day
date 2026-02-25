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
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  scheduleGoalReminder,
  cancelGoalReminder,
  cancelGoalStreakReminder,
  rescheduleAllGoalReminders,
  schedulePartnerGoalReminders,
  scheduleGoalStreakReminders,
} from '@/services/notifications';
import { isMilestone, nextMilestone, MILESTONES } from '@/services/goals';
import { playTrash } from '@/utils/sounds';
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
  currentPeriodAmount,
  onLogMetric,
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
  currentPeriodAmount?: (habitId: string, owner: UserId, periodType: GoalPeriodType) => number;
  onLogMetric?: (goal: Goal, amount: number) => Promise<unknown>;
}) {
  const appColors  = useAppColors();
  const { getUserColor, getUserName } = useTheme();
  const myColor    = getUserColor(myUserId);
  const color      = isMyCard ? myColor : partnerColor;
  const [expanded, setExpanded] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [showLogMetricModal, setShowLogMetricModal] = useState(false);
  const [metricInput, setMetricInput] = useState('');
  const expandAnim = useRef(new Animated.Value(0)).current;

  const isMetric = habit.metric_target != null;
  const periodAmount = isMetric && currentPeriodAmount
    ? currentPeriodAmount(habit.id, isMyCard ? myUserId : partnerId, habit.period_type)
    : 0;

  useEffect(() => {
    Animated.spring(expandAnim, { toValue: expanded ? 1 : 0, useNativeDriver: false, damping: 20, stiffness: 200 }).start();
  }, [expanded]);

  const cardH = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 420] });

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
  return (
    <GlassCard style={hc.card} accentColor={color}>
      {/* Main row: flame (streak) | title/meta | check (daily only) | Add (metric) or partner dot */}
      <View style={hc.topRow} pointerEvents="box-none">
        <Pressable onPress={() => setExpanded(e => !e)} style={hc.topRowPressable}>
          {/* Streak + flame — left */}
          <View style={hc.streakCol}>
            <StreakFlame streak={habit.current_streak} color={color} size={22} />
            <Text style={[hc.streakNum, { color }]}>{habit.current_streak}</Text>
          </View>
          {/* Title + meta (metric progress and small Add in meta for metric goals) */}
          <View style={hc.mid}>
            <Text style={[hc.title, { color: appColors.label }]} numberOfLines={1}>{habit.title}</Text>
            <View style={hc.metaRow}>
              <Text style={[hc.period, { color: hexToRgba(color, 0.7) }]}>
                {PERIOD_CONFIG[habit.period_type].label}
              </Text>
              {isMetric && (
                <>
                  <Text style={[hc.metaMetric, { color: hexToRgba(color, 0.9) }]}>
                    {periodAmount} / {habit.metric_target} {habit.metric_unit ?? ''}
                  </Text>
                  {checkedInMe ? (
                    <View style={[hc.metricDoneBadge, { backgroundColor: color }]}>
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    </View>
                  ) : isMyCard && todayIsActive && onLogMetric ? (
                    <Pressable
                      onPress={() => setShowLogMetricModal(true)}
                      style={[hc.metaAddBtn, { borderColor: hexToRgba(color, 0.4) }]}
                      hitSlop={4}
                    >
                      <Ionicons name="add" size={12} color={color} />
                      <Text style={[hc.metaAddText, { color }]}>Add</Text>
                    </Pressable>
                  ) : null}
                </>
              )}
              {habit.stake ? (
                <View style={[hc.stakeBadge, { backgroundColor: hexToRgba('#F59E0B', 0.12) }]}>
                  <Ionicons name="trophy-outline" size={10} color="#F59E0B" />
                  <Text style={hc.stakeText} numberOfLines={1}>{habit.stake}</Text>
                </View>
              ) : null}
            </View>
            {/* Today: You ✓/— · Partner ✓/— (my habits only) */}
            {isMyCard && (
              <View style={hc.todayRow}>
                <Text style={[hc.todayLabel, { color: appColors.labelTertiary }]}>
                  Today: You {checkedInMe ? '✓' : '—'} · {partnerName} {checkedInPartner ? '✓' : '—'}
                </Text>
              </View>
            )}
          </View>
        </Pressable>

        {/* Check button — daily non-metric only (right of title/meta) */}
        {isMyCard && !isMetric && habit.period_type === 'daily' && (
          <View style={hc.checkInWrap}>
            <CheckInButton
              done={checkedInMe}
              onPress={checkedInMe ? handleUncheck : handleCheckIn}
              color={color}
              loading={checkLoading}
              disabled={!todayIsActive}
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
                  Today is a rest day for this habit.
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

          {/* Mini calendar — last 28 days */}
          <Text style={[hc.calLabel, { color: hexToRgba(color, 0.6) }]}>
            {isMyCard ? 'Your' : getUserName(habit.owner as UserId) + "'s"} last 28 days
          </Text>
          <MiniCalendar dates={isMyCard ? recentDatesMe : recentDatesPartner} color={color} />


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
  mid:          { flex: 1 },
  title:        { ...typography.bodyEmphasis, marginBottom: 3 },
  metaRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  todayRow:     { marginTop: 2 },
  todayLabel:   { ...typography.caption, fontSize: 11 },
  period:       { ...typography.caption },
  metaMetric:   { ...typography.caption, fontWeight: '700' },
  metaAddBtn:   { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.xs, borderWidth: 1 },
  metaAddText:  { fontSize: 11, fontWeight: '700' },
  stakeBadge:   { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.xs },
  stakeText:    { fontSize: 10, fontWeight: '600', color: '#F59E0B', maxWidth: 100 },
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
  partnerStatusRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, padding: spacing.sm, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: radius.md },
  partnerAvatar:     { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  partnerStatusText: { ...typography.footnote, flex: 1 },
  actions:           { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionBtn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.md },
  actionBtnText:     { ...typography.subhead },
  metaDetail:        { ...typography.caption },
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
  onAdd: (
    title: string,
    emoji: string,
    period: GoalPeriodType,
    reminder: boolean,
    stake: string,
    activeDays: number[] | null,
    metricTarget: number | null,
    metricUnit: string | null,
  ) => void;
  userColor: string;
  notifTimeDisplay: string;
}) {
  const appColors  = useAppColors();
  const [title, setTitle]   = useState('');
  const [emoji, setEmoji]   = useState('');
  const [period, setPeriod] = useState<GoalPeriodType>('daily');
  const [reminder, setReminder] = useState(true);
  const [stake, setStake]   = useState('');
  const [activeDays, setActiveDays] = useState<number[]>([0,1,2,3,4,5,6]);
  const [useMetric, setUseMetric] = useState(false);
  const [metricTarget, setMetricTarget] = useState<string>('');
  const [metricUnit, setMetricUnit] = useState<string>('');

  function reset() {
    setTitle('');
    setEmoji('');
    setPeriod('daily');
    setReminder(true);
    setStake('');
    setActiveDays([0,1,2,3,4,5,6]);
    setUseMetric(false);
    setMetricTarget('');
    setMetricUnit('');
  }

  function handleAdd() {
    if (!title.trim()) return;
    const trimmedTitle = title.trim();
    const trimmedStake = stake.trim();
    const parsedTarget = useMetric && metricTarget.trim() !== '' ? Number(metricTarget) : null;
    onAdd(
      trimmedTitle,
      emoji,
      period,
      reminder,
      trimmedStake,
      period === 'daily' ? (activeDays.length === 7 ? null : activeDays) : null,
      useMetric && parsedTarget != null && !Number.isNaN(parsedTarget) ? parsedTarget : null,
      useMetric && metricUnit.trim() ? metricUnit.trim() : null,
    );
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

            {/* Active days (for daily habits) */}
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
  daysRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  dayChip:     { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.10)', backgroundColor: 'rgba(0,0,0,0.02)' },
  dayChipText: { ...typography.subhead, fontSize: 13, color: colors.labelTertiary },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1.5, marginBottom: spacing.xl },
  reminderLabel:{ ...typography.bodyEmphasis },
  reminderSub:  { ...typography.caption, marginTop: 2 },
  toggle:      { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm },
  toggleText:  { fontSize: 12, fontWeight: '700', color: '#fff' },
  metricToggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1.5, marginBottom: spacing.md },
  btnRow:      { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
});

// ─── EditHabitModal ─────────────────────────────────────────────────────────────

function EditHabitModal({
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
  ) => void;
  userColor: string;
}) {
  const appColors = useAppColors();

  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('');
  const [period, setPeriod] = useState<GoalPeriodType>('daily');
  const [reminder, setReminder] = useState(true);
  const [stake, setStake] = useState('');
  const [activeDays, setActiveDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [useMetric, setUseMetric] = useState(false);
  const [metricTarget, setMetricTarget] = useState<string>('');
  const [metricUnit, setMetricUnit] = useState<string>('');

  useEffect(() => {
    if (!visible || !goal) return;
    setTitle(goal.title);
    setEmoji(goal.emoji ?? '');
    setPeriod(goal.period_type);
    setReminder(goal.reminder_enabled);
    setStake(goal.stake ?? '');
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
    const trimmedStake = stake.trim();
    const parsedTarget = useMetric && metricTarget.trim() !== '' ? Number(metricTarget) : null;

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
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={am.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[am.sheet, { backgroundColor: appColors.surface }]}>
          <View style={am.handle} />
          <Text style={[am.sheetTitle, { color: appColors.label }]}>Edit habit</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Title */}
            <Text style={[am.label, { color: appColors.labelSecondary }]}>Habit name</Text>
            <View
              style={[
                am.inputWrap,
                { borderColor: hexToRgba(userColor, 0.3), backgroundColor: hexToRgba(userColor, 0.04) },
              ]}
            >
              <RNTextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Habit name"
                placeholderTextColor={appColors.labelTertiary}
                style={[am.input, { color: appColors.label }]}
                selectionColor={userColor}
                returnKeyType="done"
                maxLength={60}
              />
            </View>

            {/* Frequency */}
            <Text style={[am.label, { color: appColors.labelSecondary }]}>Frequency</Text>
            <View style={am.chipRow}>
              {(['daily', 'weekly', 'monthly'] as GoalPeriodType[]).map((p) => (
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

            {/* Active days (for daily habits) */}
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
                  borderColor: hexToRgba('#F59E0B', 0.3),
                  backgroundColor: hexToRgba('#F59E0B', 0.04),
                },
              ]}
            >
              <Ionicons
                name="trophy-outline"
                size={18}
                color="#F59E0B"
                style={{ marginRight: spacing.sm }}
              />
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
    currentPeriodAmount,
    logMetricProgress,
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

  // Schedule partner goal and streak reminders when goals or notification time change
  useEffect(() => {
    const time = profile?.notification_time;
    if (!time) return;
    schedulePartnerGoalReminders(partnerGoals, partnerName, time).catch(() => {});
    scheduleGoalStreakReminders(goals, time).catch(() => {});
  }, [goals, partnerGoals, profile?.notification_time, partnerName]);

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
  ) {
    const created = await addGoal({
      owner: userId,
      title,
      emoji,
      period_type: period,
      reminder_enabled: reminder,
      stake: stake || null,
      active_days: activeDays,
      metric_target: metricTarget,
      metric_unit: metricUnit,
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
      Alert.alert('Error', e?.message ?? 'Could not save.');
    }
  }

  async function handleDelete(goal: Goal) {
    Alert.alert('Delete habit', `Delete "${goal.title}"? Your streak will be lost.`, [
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
  ) {
    await update(goal.id, {
      title,
      emoji,
      period_type: period,
      reminder_enabled: reminder,
      stake: stake || null,
      active_days: period === 'daily' ? activeDays : null,
      metric_target: metricTarget,
      metric_unit: metricUnit,
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
      {/* Header — same color as Dynamic Island / status bar area */}
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
        </View>
      </View>

      {/* Main content — background so island/header stay surface */}
      <View style={[s.contentWrap, { backgroundColor: appColors.background }]}>
      {loading ? (
        <View style={s.loader}><ActivityIndicator color={userColor} size="large" /></View>
      ) : (
        <ScrollView
          style={s.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
        >

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
                checkedInMe={isCheckedIn(g.id, userId, g)}
                checkedInPartner={isCheckedIn(g.id, partnerId, g)}
                recentDatesMe={recentDates(g.id, userId)}
                recentDatesPartner={recentDates(g.id, partnerId)}
                onCheckIn={() => handleCheckIn(g)}
                onUncheck={() => uncheck(g)}
                onDelete={() => handleDelete(g)}
                onEdit={() => setEditingGoal(g)}
                currentPeriodAmount={currentPeriodAmount}
                onLogMetric={logMetricProgress}
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
                  checkedInMe={isCheckedIn(g.id, userId, g)}
                  checkedInPartner={isCheckedIn(g.id, partnerId, g)}
                  recentDatesMe={recentDates(g.id, userId)}
                  recentDatesPartner={recentDates(g.id, partnerId)}
                  onCheckIn={() => {}}
                  onUncheck={() => {}}
                  onDelete={() => {}}
                  onEdit={() => {}}
                  currentPeriodAmount={currentPeriodAmount}
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

      {/* Edit habit modal */}
      <EditHabitModal
        visible={!!editingGoal}
        goal={editingGoal}
        onClose={() => setEditingGoal(null)}
        onSave={(title, emoji, period, reminder, stake, activeDays, metricTarget, metricUnit) =>
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
          )
        }
        userColor={userColor}
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
