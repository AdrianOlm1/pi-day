import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Platform, Switch } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppColors } from '@/contexts/ThemeContext';
import { useOrders } from '@/hooks/useOrders';
import { useOrderReminderSettings } from '@/hooks/useOrderReminderSettings';
import { Sheet } from '@/components/ui/Sheet';
import { spacing, typography, colors, radius } from '@/theme';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

const ACCENT = '#6366F1';

export function OrderStatsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const appColors = useAppColors();
  const { orders, refresh: refreshOrders } = useOrders();
  const { settings, update } = useOrderReminderSettings();
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Refetch orders when sheet opens so earnings are up to date
  useEffect(() => {
    if (visible) refreshOrders();
  }, [visible, refreshOrders]);

  // Include all completed orders (archived and active) for earnings
  const completedForEarnings = orders.filter((o) => o.status === 'Complete');
  const totalEarnings = completedForEarnings.reduce((sum, o) => sum + (o.total ?? 0), 0);
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const thisMonthEarnings = completedForEarnings
    .filter((o) => isWithinInterval(parseISO(o.updated_at), { start: monthStart, end: monthEnd }))
    .reduce((sum, o) => sum + (o.total ?? 0), 0);

  const [hh, mm] = settings.dailyReminderTime.split(':').map(Number);
  const timeDate = new Date();
  timeDate.setHours(hh, mm, 0, 0);

  return (
    <Sheet visible={visible} onClose={onClose} heightFraction={0.72}>
      <View style={s.wrap}>
        <Text style={[s.title, { color: appColors.label }]}>Earnings & reminders</Text>

        {/* Earnings */}
        <View style={[s.section, { borderBottomColor: appColors.separator }]}>
          <Text style={[s.sectionTitle, { color: appColors.labelSecondary }]}>Earnings</Text>
          <View style={s.statsRow}>
            <View style={[s.statBox, { backgroundColor: ACCENT + '12', borderColor: ACCENT + '30' }]}>
              <Text style={[s.statValue, { color: ACCENT }]}>${totalEarnings.toFixed(2)}</Text>
              <Text style={[s.statLabel, { color: appColors.labelTertiary }]}>All time</Text>
            </View>
            <View style={[s.statBox, { backgroundColor: ACCENT + '12', borderColor: ACCENT + '30' }]}>
              <Text style={[s.statValue, { color: ACCENT }]}>${thisMonthEarnings.toFixed(2)}</Text>
              <Text style={[s.statLabel, { color: appColors.labelTertiary }]}>This month</Text>
            </View>
          </View>
        </View>

        {/* Order reminders */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: appColors.labelSecondary }]}>Order reminders</Text>

          <View style={[s.toggleRow, { borderBottomColor: appColors.separator }]}>
            <Ionicons name="notifications-outline" size={20} color={ACCENT} />
            <View style={s.toggleLabelCol}>
              <Text style={[s.toggleLabel, { color: appColors.label }]}>Daily reminder</Text>
              <Text style={[s.toggleSub, { color: appColors.labelTertiary }]}>
                Get a daily digest of active orders
              </Text>
            </View>
            <Switch
              value={settings.dailyReminder}
              onValueChange={(v) => update({ dailyReminder: v })}
              trackColor={{ true: ACCENT }}
              thumbColor="#fff"
            />
          </View>

          {settings.dailyReminder && (
            <Pressable
              onPress={() => setShowTimePicker(true)}
              style={[s.timeRow, { borderBottomColor: appColors.separator }]}
            >
              <Text style={[s.timeLabel, { color: appColors.label }]}>Daily at</Text>
              <Text style={[s.timeValue, { color: ACCENT }]}>
                {timeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </Pressable>
          )}
          {showTimePicker && (
            <>
              <DateTimePicker
                value={timeDate}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => {
                  if (d) {
                    update({
                      dailyReminderTime: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
                    });
                  }
                  if (Platform.OS === 'android') setShowTimePicker(false);
                }}
              />
              {Platform.OS === 'ios' && (
                <Pressable onPress={() => setShowTimePicker(false)} style={s.timeDoneBtn}>
                  <Text style={[s.timeDoneText, { color: ACCENT }]}>Done</Text>
                </Pressable>
              )}
            </>
          )}

          <View style={[s.toggleRow, { borderBottomColor: appColors.separator }]}>
            <Ionicons name="calendar-outline" size={20} color={ACCENT} />
            <View style={s.toggleLabelCol}>
              <Text style={[s.toggleLabel, { color: appColors.label }]}>1 week after creating</Text>
              <Text style={[s.toggleSub, { color: appColors.labelTertiary }]}>
                Remind me one week after order is added
              </Text>
            </View>
            <Switch
              value={settings.weekAfterCreate}
              onValueChange={(v) => update({ weekAfterCreate: v })}
              trackColor={{ true: ACCENT }}
              thumbColor="#fff"
            />
          </View>

          <View style={[s.toggleRow, { borderBottomColor: appColors.separator }]}>
            <Ionicons name="flag-outline" size={20} color={ACCENT} />
            <View style={s.toggleLabelCol}>
              <Text style={[s.toggleLabel, { color: appColors.label }]}>On due date</Text>
              <Text style={[s.toggleSub, { color: appColors.labelTertiary }]}>
                Remind me when an order is due
              </Text>
            </View>
            <Switch
              value={settings.onDueDate}
              onValueChange={(v) => update({ onDueDate: v })}
              trackColor={{ true: ACCENT }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  wrap: { padding: spacing.xl },
  title: { ...typography.title3, marginBottom: spacing.lg },
  section: { marginBottom: spacing.xl, paddingBottom: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  sectionTitle: { ...typography.footnote, marginBottom: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  statBox: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { ...typography.footnote, marginTop: 4 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleLabelCol: { flex: 1 },
  toggleLabel: { ...typography.bodyEmphasis },
  toggleSub: { ...typography.footnote, marginTop: 2 },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timeLabel: { ...typography.body },
  timeValue: { ...typography.bodyEmphasis },
  timeDoneBtn: { paddingVertical: spacing.sm, alignItems: 'center' },
  timeDoneText: { ...typography.bodyEmphasis },
});
