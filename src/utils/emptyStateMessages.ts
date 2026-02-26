/**
 * Rotating empty-state messages so the app feels alive and friendly.
 * Each variant has multiple { title, subtitle } pairs; one is shown at random
 * and optionally cycles to the next every few seconds.
 */

export type EmptyMessage = { title: string; subtitle: string };

export const EMPTY_SCHEDULE: EmptyMessage[] = [
  { title: 'Nothing scheduled today', subtitle: 'Enjoy your free time — or add something if you’d like.' },
  { title: 'Your day is wide open', subtitle: 'Perfect for a walk, a breather, or a little spontaneity.' },
  { title: 'No events on the calendar', subtitle: 'Make the most of the quiet. You’ve got space to think.' },
  { title: 'Clear schedule', subtitle: 'A little space goes a long way. Rest or create — your call.' },
  { title: 'All yours today', subtitle: 'Do something that fills your cup.' },
  { title: 'No events yet', subtitle: 'Add something in Calendar when you’re ready.' },
];

export const EMPTY_GOALS: EmptyMessage[] = [
  { title: 'No goals yet', subtitle: 'Add a goal or a daily task. Start small — you’ve got this.' },
  { title: 'Start small', subtitle: 'Add a goal or daily task. Every little step counts.' },
  { title: 'Your list is waiting', subtitle: 'Add a goal or daily goal to get going. We’re here when you’re ready.' },
  { title: 'Ready when you are', subtitle: 'Add your first goal or daily goal. No rush.' },
  { title: 'Blank slate', subtitle: 'Add a goal or daily goal and make today count.' },
  { title: 'Nothing here yet', subtitle: 'Tap Add or use the + on Today to add a goal.' },
  { title: 'Light your first flame', subtitle: 'Add a goal and build a streak. Grow at your own pace.' },
  { title: 'Plant a seed', subtitle: "Your first goal is the start of something good. Add one when you're ready." },
  { title: 'Warm up the list', subtitle: 'Add a goal to get going. Small sparks add up.' },
];

export const EMPTY_ORDERS: EmptyMessage[] = [
  { title: 'No orders yet', subtitle: 'Tap + to add your first order. We’ll keep them in one place.' },
  { title: 'No upcoming orders', subtitle: 'Add them in the Orders tab when you’re ready.' },
  { title: 'All caught up', subtitle: 'Add new orders in the Orders tab whenever you need to.' },
  { title: 'Nothing in the queue', subtitle: 'Tap + in Orders to add one. Easy.' },
];

export const EMPTY_ORDERS_HOME: EmptyMessage[] = [
  { title: 'No upcoming orders', subtitle: 'Add them in the Orders tab when you’re ready.' },
  { title: 'Orders list is empty', subtitle: 'Head to the Orders tab to add some. We’ll remind you when they’re due.' },
  { title: 'All clear on orders', subtitle: 'Add orders in the Orders tab when you need to.' },
];

export const EMPTY_ORDERS_ARCHIVED: EmptyMessage[] = [
  { title: 'No archived orders', subtitle: 'When you complete an order, archive it to see it here.' },
  { title: 'Archive is empty', subtitle: 'Completed orders you archive will show up here for reference.' },
];

export const EMPTY_ORDERS_COMPLETED: EmptyMessage[] = [
  { title: 'No completed orders yet', subtitle: 'Tap Complete on an order to move it here.' },
  { title: 'Nothing completed yet', subtitle: 'When you finish an order, tap Complete to see it here.' },
];

export const EMPTY_NOTES: EmptyMessage[] = [
  { title: 'No notes yet', subtitle: 'Type above and tap Add, or open a note to add more details. Great for quick thoughts.' },
  { title: 'Your first note awaits', subtitle: 'Type in the box above and tap Add to save it. Simple as that.' },
  { title: 'Nothing jotted down', subtitle: 'Add a note above — perfect for ideas, lists, or reminders.' },
  { title: 'Notes will show up here', subtitle: 'Type above and tap Add to get started. We’ll keep them for you.' },
  { title: 'Blank page', subtitle: 'Add a note whenever something’s on your mind.' },
];

export const EMPTY_CALENDAR: EmptyMessage[] = [
  { title: 'No events', subtitle: 'Enjoy the space — or add something in Calendar if you’d like.' },
  { title: 'Nothing scheduled', subtitle: 'Tap the week strip or add an event. Your call.' },
  { title: 'Clear day', subtitle: 'A little breathing room. Use it however you like.' },
  { title: 'Wide open', subtitle: 'Make it whatever you want. Add events in Calendar when you’re ready.' },
  { title: 'No events here', subtitle: 'Enjoy the space, or add an event to get started.' },
  { title: 'Free day', subtitle: 'Nothing on the calendar — perfect for a slow day or last-minute plans.' },
];

export const EMPTY_CALENDAR_WEEK: EmptyMessage[] = [
  { title: 'No events today', subtitle: 'Add something in the calendar when you’re ready.' },
  { title: 'Nothing on today', subtitle: 'Your week view is here. Add events anytime.' },
];

export const EMPTY_FINANCE: EmptyMessage[] = [
  { title: 'No transactions this month', subtitle: 'They’ll show up here when you add some.' },
  { title: 'No transactions', subtitle: 'Add transactions to see them here.' },
  { title: 'Nothing to show yet', subtitle: 'Your transactions will appear here.' },
  { title: 'No transactions', subtitle: 'Track income and spending to see them here.' },
];

export const EMPTY_FINANCE_TXN: EmptyMessage[] = [
  { title: 'No transactions', subtitle: 'Add one to get started.' },
  { title: 'No transactions yet', subtitle: 'Your list will grow as you log them.' },
];

export const EMPTY_DAY_ITINERARY: EmptyMessage[] = [
  { title: 'Nothing scheduled', subtitle: '' },
  { title: 'No events in this column', subtitle: '' },
];

/** Pick one message at random from the list */
export function getRandomEmptyMessage<T extends EmptyMessage>(messages: T[]): T {
  return messages[Math.floor(Math.random() * messages.length)];
}
