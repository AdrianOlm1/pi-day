import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
  } catch (e) {
    // In Expo Go there is no projectId; push tokens require a dev build + EAS projectId.
    // Fail gracefully so the app still runs (local notifications like reminders still work).
    return null;
  }
}

/**
 * Schedules (or re-schedules) the daily todo reminder at the given time.
 * Cancels any existing daily-reminder before scheduling a new one.
 */
export async function scheduleDailyTodoReminder(hourMinute: string): Promise<void> {
  // Cancel existing
  await cancelDailyTodoReminder();

  const [hourStr, minuteStr] = hourMinute.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  await Notifications.scheduleNotificationAsync({
    identifier: 'daily-todo-reminder',
    content: {
      title: "Daily Reminder",
      body: "Check your todo list for today!",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
    },
  });
}

export async function cancelDailyTodoReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('daily-todo-reminder');
}

// ─── Goal reminders (daily / weekly / monthly) ───────────────────────────────

const GOAL_REMINDER_PREFIX = 'goal-reminder-';

function parseHourMinute(hourMinute: string): { hour: number; minute: number } {
  const [hourStr, minuteStr] = hourMinute.split(':');
  return {
    hour: parseInt(hourStr, 10),
    minute: parseInt(minuteStr, 10),
  };
}

export async function scheduleGoalReminder(
  goalId: string,
  title: string,
  periodType: 'daily' | 'weekly' | 'monthly',
  hourMinute: string,
): Promise<void> {
  await cancelGoalReminder(goalId);
  const { hour, minute } = parseHourMinute(hourMinute);
  const identifier = `${GOAL_REMINDER_PREFIX}${goalId}`;
  const content = {
    title: periodType === 'daily' ? 'Daily goal' : periodType === 'weekly' ? 'Weekly goal' : 'Monthly goal',
    body: title,
    sound: true,
  };

  if (periodType === 'daily') {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  } else if (periodType === 'weekly') {
    // Sunday = 1, Monday = 2, ... use Monday (2) for weekly
    await Notifications.scheduleNotificationAsync({
      identifier,
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 2,
        hour,
        minute,
      },
    });
  } else {
    // Monthly: 1st of the month
    await Notifications.scheduleNotificationAsync({
      identifier,
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: 1,
        hour,
        minute,
      },
    });
  }
}

export async function cancelGoalReminder(goalId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`${GOAL_REMINDER_PREFIX}${goalId}`);
}

export async function rescheduleAllGoalReminders(
  goals: { id: string; title: string; period_type: 'daily' | 'weekly' | 'monthly'; reminder_enabled: boolean }[],
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
