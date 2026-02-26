import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import {
  addMinutes,
  parseISO,
  isBefore,
  startOfDay,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from 'date-fns';
import { fetchEventsWithRecurrences } from './events';
import { expandRecurringEvent } from '../utils/date';
import type { CalendarEvent, EventOccurrence, Goal, Order, UserId } from '../types';
import type { RecurrenceRule } from '../types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Copy: modern, professional, no emojis ────────────────────────────────────

const COPY = {
  dailyTodo: {
    title: "Today's list",
    body: "Your daily goals are waiting. Tap to view.",
  },
  goalReminder: (period: 'daily' | 'weekly' | 'monthly' | 'yearly', title: string) => {
    const periodLabel = period === 'daily' ? 'Time to log' : period === 'weekly' ? 'Weekly check-in' : period === 'monthly' ? 'Monthly check-in' : 'Yearly check-in';
    return { title: periodLabel, body: title };
  },
  partnerGoalReminder: (partnerName: string, title: string) => ({
    title: "Partner goal",
    body: `${partnerName}'s goal: ${title}. Tap to check in together.`,
  }),
  goalStreak: (streak: number, title: string, period: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    const unit = period === 'daily' ? 'day' : period === 'weekly' ? 'week' : period === 'monthly' ? 'month' : 'year';
    return {
      title: "Streak",
      body: `You're on a ${streak}-${unit} streak for ${title}. Log this period to keep it going.`,
    };
  },
  goalEncourage: (completedToday: number, totalGoals: number) => {
    if (completedToday >= totalGoals && totalGoals > 0)
      return { title: "All done!", body: "You completed all your goals today. Amazing!" };
    if (completedToday > 0)
      return { title: "Nice progress!", body: `${completedToday} goal${completedToday !== 1 ? 's' : ''} done today. Keep it up!` };
    return { title: "You've got this!", body: "Small steps lead to big wins. Tap to log a goal." };
  },
  eventUpcoming: (title: string, timeLabel: string) => ({
    title: "Up next",
    body: `${title} at ${timeLabel}`,
  }),
  eventStartingSoon: (title: string, mins: number) => ({
    title: "Starting soon",
    body: `${title} in ${mins} minutes`,
  }),
  orderDue: (customer: string, description: string) => ({
    title: "Order due",
    body: `${customer} – ${description}`,
  }),
  orderDaily: (activeCount: number, dueThisWeek: number) => ({
    title: "Daily orders",
    body: dueThisWeek > 0
      ? `You have ${activeCount} active order(s). ${dueThisWeek} due this week.`
      : `You have ${activeCount} active order(s). Tap to view.`,
  }),
  orderWeekFollowUp: (customer: string, description: string) => ({
    title: "Follow-up",
    body: `${customer} – ${description} (created 1 week ago)`,
  }),
  orderMonthlyRecap: (completed: number, inProgress: number) => ({
    title: "Monthly recap",
    body: `Last month: ${completed} completed, ${inProgress} in progress. Tap to view.`,
  }),
};

// ─── Push registration ───────────────────────────────────────────────────────

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}

// ─── Identifiers (prefixes for cancel/schedule) ───────────────────────────────

const PREFIX = {
  dailyTodo: 'daily-todo-reminder',
  goalReminder: 'goal-reminder-',
  partnerGoalReminder: 'partner-goal-reminder-',
  goalStreak: 'goal-streak-',
  eventReminder: 'event-reminder-',
  orderDue: 'order-due-',
  orderWeek: 'order-week-',
  orderDaily: 'order-daily-reminder',
  orderMonthly: 'order-monthly-recap',
};

// ─── Daily todo reminder ───────────────────────────────────────────────────────

export async function scheduleDailyTodoReminder(hourMinute: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(PREFIX.dailyTodo);
  const [h, m] = hourMinute.split(':').map((n) => parseInt(n, 10));
  await Notifications.scheduleNotificationAsync({
    identifier: PREFIX.dailyTodo,
    content: {
      title: COPY.dailyTodo.title,
      body: COPY.dailyTodo.body,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour: h,
      minute: m,
      repeats: true,
    },
  });
}

export async function cancelDailyTodoReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(PREFIX.dailyTodo);
}

// ─── Goal reminders (yours) ───────────────────────────────────────────────────

function parseHourMinute(hourMinute: string): { hour: number; minute: number } {
  const [h, m] = hourMinute.split(':').map((n) => parseInt(n, 10));
  return { hour: h, minute: m };
}

export async function scheduleGoalReminder(
  goalId: string,
  title: string,
  periodType: 'daily' | 'weekly' | 'monthly' | 'yearly',
  hourMinute: string,
): Promise<void> {
  await cancelGoalReminder(goalId);
  const { hour, minute } = parseHourMinute(hourMinute);
  const id = `${PREFIX.goalReminder}${goalId}`;
  const { title: t, body } = COPY.goalReminder(periodType, title);

  if (periodType === 'daily') {
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title: t, body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
  } else if (periodType === 'weekly') {
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title: t, body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 2, hour, minute },
    });
  } else if (periodType === 'monthly') {
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title: t, body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.MONTHLY, day: 1, hour, minute },
    });
  } else {
    // Yearly: schedule for Jan 1 at user's reminder time
    const jan1 = new Date();
    jan1.setMonth(0, 1);
    jan1.setHours(hour, minute, 0, 0);
    if (jan1.getTime() <= Date.now()) jan1.setFullYear(jan1.getFullYear() + 1);
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title: t, body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: jan1 },
    });
  }
}

export async function cancelGoalReminder(goalId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`${PREFIX.goalReminder}${goalId}`);
}

export async function rescheduleAllGoalReminders(
  goals: { id: string; title: string; period_type: 'daily' | 'weekly' | 'monthly' | 'yearly'; reminder_enabled: boolean }[],
  hourMinute: string,
): Promise<void> {
  for (const g of goals) {
    if (g.reminder_enabled) {
      await scheduleGoalReminder(g.id, g.title, g.period_type, hourMinute);
    } else {
      await cancelGoalReminder(g.id);
    }
  }
}

// ─── Partner goal reminders ───────────────────────────────────────────────────

export async function schedulePartnerGoalReminders(
  partnerGoals: { id: string; title: string; period_type: 'daily' | 'weekly' | 'monthly' | 'yearly'; reminder_enabled?: boolean }[],
  partnerName: string,
  hourMinute: string,
): Promise<void> {
  const { hour, minute } = parseHourMinute(hourMinute);
  for (const g of partnerGoals) {
    const id = `${PREFIX.partnerGoalReminder}${g.id}`;
    await Notifications.cancelScheduledNotificationAsync(id);
    const { title: t, body } = COPY.partnerGoalReminder(partnerName, g.title);
    if (g.period_type === 'daily') {
      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: { title: t, body, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
      });
    } else if (g.period_type === 'weekly') {
      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: { title: t, body, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 2, hour, minute },
      });
    } else if (g.period_type === 'monthly') {
      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: { title: t, body, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.MONTHLY, day: 1, hour, minute },
      });
    } else {
      const jan1 = new Date();
      jan1.setMonth(0, 1);
      jan1.setHours(hour, minute, 0, 0);
      if (jan1.getTime() <= Date.now()) jan1.setFullYear(jan1.getFullYear() + 1);
      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: { title: t, body, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: jan1 },
      });
    }
  }
}

export async function cancelPartnerGoalReminder(goalId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`${PREFIX.partnerGoalReminder}${goalId}`);
}

// ─── Goal streak nudge (daily, for goals with current_streak > 0 not yet done today) ─────

export async function scheduleGoalStreakReminders(
  goals: { id: string; title: string; current_streak: number; period_type: 'daily' | 'weekly' | 'monthly' | 'yearly' }[],
  hourMinute: string,
): Promise<void> {
  const { hour, minute } = parseHourMinute(hourMinute);
  for (const g of goals) {
    await Notifications.cancelScheduledNotificationAsync(`${PREFIX.goalStreak}${g.id}`);
    if (g.current_streak < 1) continue;
    const { title: t, body } = COPY.goalStreak(g.current_streak, g.title, g.period_type);
    await Notifications.scheduleNotificationAsync({
      identifier: `${PREFIX.goalStreak}${g.id}`,
      content: { title: t, body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
  }
}

// ─── Encouragement notification (optional afternoon nudge) ─────────────────────

const PREFIX_ENCOURAGE = 'goal-encourage-';

export async function scheduleEncouragementNotification(
  completedToday: number,
  totalGoals: number,
  hourMinute: string,
): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(PREFIX_ENCOURAGE);
  const { hour, minute } = parseHourMinute(hourMinute);
  const offsetHour = (hour + 6) % 24; // 6 hours after reminder time (e.g. 9 → 15:00)
  const { title: t, body } = COPY.goalEncourage(completedToday, totalGoals);
  await Notifications.scheduleNotificationAsync({
    identifier: PREFIX_ENCOURAGE,
    content: { title: t, body, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: offsetHour, minute },
  });
}

export async function cancelEncouragementNotification(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(PREFIX_ENCOURAGE);
}

export async function cancelGoalStreakReminder(goalId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`${PREFIX.goalStreak}${goalId}`);
}

// ─── Event reminders (upcoming, for selected categories) ───────────────────────

const EVENT_REMINDER_MINUTES_BEFORE = 15;
const EVENT_LOOKAHEAD_DAYS = 2;
const MAX_EVENT_REMINDERS = 30;

export async function rescheduleEventReminders(
  categoryIds: string[],
): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier.startsWith(PREFIX.eventReminder)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
  if (categoryIds.length === 0) return;

  const { events, rules } = await fetchEventsWithRecurrences();
  const rulesMap = new Map(rules.map((r: RecurrenceRule) => [r.id, r]));
  const now = new Date();
  const rangeEnd = new Date(now);
  rangeEnd.setDate(rangeEnd.getDate() + EVENT_LOOKAHEAD_DAYS);
  const rangeStart = startOfDay(now);

  const occurrences: EventOccurrence[] = [];
  for (const event of events) {
    const catOk = event.category_id && categoryIds.includes(event.category_id);
    if (!catOk && event.type !== 'shared') continue;
    const rule = event.recurrence_id ? rulesMap.get(event.recurrence_id) ?? null : null;
    occurrences.push(...expandRecurringEvent(event, rule, rangeStart, rangeEnd));
  }
  occurrences.sort((a, b) => a.start_at.localeCompare(b.start_at));

  let count = 0;
  for (const occ of occurrences) {
    if (count >= MAX_EVENT_REMINDERS) break;
    const start = parseISO(occ.start_at);
    if (isBefore(start, now)) continue;
    const triggerAt = addMinutes(start, -EVENT_REMINDER_MINUTES_BEFORE);
    if (isBefore(triggerAt, now)) continue;

    const timeLabel = occ.all_day ? 'All day' : parseISO(occ.start_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const { title: t, body } = COPY.eventUpcoming(occ.title, timeLabel);
    const identifier = `${PREFIX.eventReminder}${occ.id}-${occ.occurrence_date}-${occ.start_at}`;
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: { title: t, body, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerAt,
        channelId: Platform.OS === 'android' ? 'event-reminders' : undefined,
      },
    });
    count++;
  }
}

// ─── Order notifications ───────────────────────────────────────────────────────

export interface OrderReminderSettings {
  dailyReminder: boolean;
  dailyReminderTime: string;
  weekAfterCreate: boolean;
  onDueDate: boolean;
  monthlyRecap: boolean;
}

export async function scheduleOrderDueReminder(order: Order): Promise<void> {
  if (!order.due_date) return;
  const due = parseISO(order.due_date);
  const triggerAt = startOfDay(due);
  if (isBefore(triggerAt, new Date())) return;
  const id = `${PREFIX.orderDue}${order.id}`;
  await Notifications.cancelScheduledNotificationAsync(id);
  const { title: t, body } = COPY.orderDue(order.customer_name, order.description || 'No description');
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title: t, body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerAt,
    },
  });
}

export async function cancelOrderDueReminder(orderId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`${PREFIX.orderDue}${orderId}`);
}

export async function scheduleOrderWeekReminder(order: Order): Promise<void> {
  const created = parseISO(order.created_at);
  const weekLater = new Date(created);
  weekLater.setDate(weekLater.getDate() + 7);
  if (isBefore(weekLater, new Date())) return;
  const id = `${PREFIX.orderWeek}${order.id}`;
  await Notifications.cancelScheduledNotificationAsync(id);
  const { title: t, body } = COPY.orderWeekFollowUp(order.customer_name, order.description || 'No description');
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title: t, body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: weekLater,
    },
  });
}

export async function cancelOrderWeekReminder(orderId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`${PREFIX.orderWeek}${orderId}`);
}

export async function scheduleOrderDailyReminder(
  hourMinute: string,
  activeCount: number,
  dueThisWeekCount: number,
): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(PREFIX.orderDaily);
  const [h, m] = hourMinute.split(':').map((n) => parseInt(n, 10));
  const { title: t, body } = COPY.orderDaily(activeCount, dueThisWeekCount);
  await Notifications.scheduleNotificationAsync({
    identifier: PREFIX.orderDaily,
    content: { title: t, body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour: h,
      minute: m,
      repeats: true,
    },
  });
}

export async function cancelOrderDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(PREFIX.orderDaily);
}

export async function scheduleOrderMonthlyRecap(
  hourMinute: string,
  completedLastMonth: number,
  inProgressNow: number,
): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(PREFIX.orderMonthly);
  const [h, m] = hourMinute.split(':').map((n) => parseInt(n, 10));
  const nextFirst = new Date();
  nextFirst.setMonth(nextFirst.getMonth() + 1, 1);
  nextFirst.setHours(h, m, 0, 0);
  const { title: t, body } = COPY.orderMonthlyRecap(completedLastMonth, inProgressNow);
  await Notifications.scheduleNotificationAsync({
    identifier: PREFIX.orderMonthly,
    content: { title: t, body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: nextFirst,
      channelId: Platform.OS === 'android' ? 'order-recap' : undefined,
    },
  });
}

export async function cancelOrderMonthlyRecap(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(PREFIX.orderMonthly);
}

// ─── Reschedule all order reminders (call when orders or settings change) ─────

export async function rescheduleAllOrderReminders(
  orders: Order[],
  settings: OrderReminderSettings,
): Promise<void> {
  const active = orders.filter((o) => !o.archived);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  if (settings.onDueDate) {
    for (const o of active) {
      await scheduleOrderDueReminder(o);
    }
  } else {
    for (const o of active) {
      await cancelOrderDueReminder(o.id);
    }
  }

  if (settings.weekAfterCreate) {
    for (const o of active) {
      await scheduleOrderWeekReminder(o);
    }
  } else {
    for (const o of active) {
      await cancelOrderWeekReminder(o.id);
    }
  }

  if (settings.dailyReminder) {
    const dueThisWeek = active.filter(
      (o) => o.due_date && isWithinInterval(parseISO(o.due_date), { start: weekStart, end: weekEnd }),
    ).length;
    await scheduleOrderDailyReminder(settings.dailyReminderTime, active.length, dueThisWeek);
  } else {
    await cancelOrderDailyReminder();
  }

  if (settings.monthlyRecap) {
    const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1));
    const lastMonthEnd = endOfMonth(lastMonthStart);
    const completedLastMonth = orders.filter(
      (o) => o.status === 'Complete' && isWithinInterval(parseISO(o.updated_at), { start: lastMonthStart, end: lastMonthEnd }),
    ).length;
    const inProgressNow = active.filter((o) => o.status === 'In Progress' || o.status === 'Pending').length;
    await scheduleOrderMonthlyRecap(settings.dailyReminderTime, completedLastMonth, inProgressNow);
  } else {
    await cancelOrderMonthlyRecap();
  }
}
