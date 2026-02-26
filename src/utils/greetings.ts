/**
 * Varied greetings and moment lines for a friendlier, less static Today experience.
 * Picks by time of day and optional weekday/weekend; one variant at random where applicable.
 * Pass a day-based seed (e.g. 'yyyy-MM-dd') so the same day always shows the same message.
 */

function hour(): number {
  return new Date().getHours();
}

function isWeekend(): boolean {
  const d = new Date().getDay();
  return d === 0 || d === 6;
}

function isFriday(): boolean {
  return new Date().getDay() === 5;
}

/** Deterministic index in [0, length) from a string seed so the same seed yields the same message. */
function pickIndex(seed: string, length: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % length;
}

/** Greeting with name — varied by time and mood. Optional seed (e.g. date key) keeps it stable for the day. */
export function getGreetingLabel(userName: string, seed?: string): string {
  const h = hour();
  const name = userName.trim() || 'there';
  const pick = (opts: string[]) =>
    seed != null ? opts[pickIndex(seed, opts.length)] : opts[Math.floor(Math.random() * opts.length)];

  if (h < 5) {
    const options = [`Hey ${name}`, `Still up, ${name}?`, `Night owl, ${name}`];
    return pick(options);
  }
  if (h < 12) {
    const options = [
      `Good morning, ${name}`,
      `Morning, ${name}`,
      `Rise and shine, ${name}`,
      `Hello, ${name}`,
    ];
    return pick(options);
  }
  if (h < 17) {
    const options = [
      `Good afternoon, ${name}`,
      `Hey ${name}`,
      `Afternoon, ${name}`,
    ];
    return pick(options);
  }
  const options = [
    `Good evening, ${name}`,
    `Hey ${name}`,
    `Evening, ${name}`,
  ];
  return pick(options);
}

/** Short line under the greeting (e.g. under "Hey Adrian") — time-based, cozy. Optional seed keeps it stable for the day. */
export function getGreetingSubtitle(seed?: string): string {
  const h = hour();
  const weekend = isWeekend();
  const friday = isFriday();
  const pick = (opts: string[]) =>
    seed != null ? opts[pickIndex(seed, opts.length)] : opts[Math.floor(Math.random() * opts.length)];

  if (h >= 21 || h < 5) {
    const opts = ['Rest well. Tomorrow can wait.', 'You’ve done enough for today.'];
    return pick(opts);
  }
  if (h >= 5 && h < 12) {
    const opts = [
      "Here's your day at a glance.",
      'Take it one step at a time.',
      'Ready when you are.',
      'Whatever you do today is enough.',
      'Ease into the day.',
    ];
    return pick(opts);
  }
  if (weekend && h >= 8 && h < 14) {
    const opts = ['Enjoy the pace.', 'Your day, your rhythm.'];
    return pick(opts);
  }
  if (h >= 12 && h < 17) {
    const opts = [
      "Here's what's on your plate.",
      'Steady as you go.',
      'You’re doing great.',
      'One thing at a time.',
    ];
    return pick(opts);
  }
  if (friday && h >= 17) {
    const opts = ['Almost weekend.', 'Ease into the evening.'];
    return pick(opts);
  }
  if (h >= 17 && h < 21) {
    const opts = ['Hope the day was kind.', 'Wind down well.', 'You did good today.'];
    return pick(opts);
  }
  return pick(["Here's your day at a glance.", 'Take it one step at a time.']);
}

/** Short moment line for the date strip — time, weather, weekend-aware. Optional seed keeps it stable for the day. */
export function getMomentLine(weatherCode: number | null, temp: number | null, seed?: string): string {
  const h = hour();
  const weekend = isWeekend();
  const friday = isFriday();
  const pick = (opts: string[]) =>
    seed != null ? opts[pickIndex(seed, opts.length)] : opts[Math.floor(Math.random() * opts.length)];

  if (temp != null && weatherCode != null) {
    const sunny = [0, 1].includes(weatherCode);
    const rainy = weatherCode >= 61 && weatherCode < 70;
    const cloudy = weatherCode > 2 && weatherCode < 70 && !sunny && !rainy;

    if (sunny && h >= 6 && h < 10) {
      const opts = ['Sunny start — good day for a walk', 'Bright morning — nice start', 'Clear skies this morning'];
      return pick(opts);
    }
    if (sunny && h >= 10 && h < 18) {
      const opts = ['Nice day — make the most of it', 'Lovely out — enjoy it', 'Good day to get things done'];
      return pick(opts);
    }
    if (rainy) {
      const opts = ['Cozy weather — perfect for focus', 'Rainy day — good for staying in', 'Grab a tea and take it steady'];
      return pick(opts);
    }
    if (cloudy) {
      const opts = ['Cozy weather — perfect for focus', 'Steady day ahead', 'Good day to focus'];
      return pick(opts);
    }
  }

  if (weekend && h >= 8 && h < 12) {
    const opts = ['Easy morning — you’ve earned it', 'Slow start is okay', 'Take the morning at your pace'];
    return pick(opts);
  }
  if (weekend && h >= 12 && h < 20) {
    const opts = ['Enjoy your weekend', 'Hope the day’s treating you well', 'Steady pace'];
    return pick(opts);
  }
  if (friday && h >= 15) {
    const opts = ['Almost there — Friday vibes', 'Wind down well', 'Ease into the evening'];
    return pick(opts);
  }

  if (h >= 5 && h < 12) {
    const opts = [
      'Take it easy this morning',
      'Ease into the day',
      'A gentle start goes a long way',
      'Morning — you’ve got this',
    ];
    return pick(opts);
  }
  if (h >= 12 && h < 17) {
    const opts = ['Steady pace', 'Midday — stay hydrated', 'Afternoon stretch?', 'Keep it steady'];
    return pick(opts);
  }

  const opts = [
    'Wind down well',
    'Ease into the evening',
    'Hope the day was kind to you',
    'Rest well',
  ];
  return pick(opts);
}

/** Icon name for the moment line (time + weather aware) — for a cozy bounce icon next to the line. */
export function getMomentIconName(weatherCode: number | null, h?: number): string {
  const hour = h ?? new Date().getHours();
  if (weatherCode != null) {
    if (weatherCode >= 61 && weatherCode < 70) return 'rainy';
    if (weatherCode >= 2 && weatherCode < 70) return 'cloudy';
    if ([0, 1].includes(weatherCode) && hour >= 6 && hour < 20) return 'sunny';
  }
  if (hour < 5 || hour >= 21) return 'moon';
  if (hour >= 5 && hour < 10) return 'sunny'; // morning
  if (hour >= 10 && hour < 17) return 'sunny';
  if (hour >= 17 && hour < 21) return 'partly-sunny';
  return 'sunny';
}

// ─── Cozy time-based comfort messages (10+ unique, used throughout the app) ───

const COMFORT_NIGHT = [
  'Rest well — you’ve done enough for today.',
  'Time to cozy in. Tomorrow can wait.',
  'Wind down gently. You deserve the calm.',
  'Soft evening. Take a breath.',
  'Unplug a little. You’ve got this.',
];

const COMFORT_EARLY = [
  'Quiet hours. Be kind to yourself.',
  'Still dark out — no rush at all.',
  'Peaceful start. Move at your own pace.',
];

const COMFORT_MORNING = [
  'A gentle start goes a long way.',
  'Ease into the day — you’ve got this.',
  'Morning light. Take it one step at a time.',
  'Fresh start. Whatever you do today is enough.',
  'Good morning. Be kind to yourself.',
  'Soft morning. No need to rush.',
];

const COMFORT_MIDDAY = [
  'Midday pause. How are you really doing?',
  'Steady pace. You’re doing great.',
  'Halfway there. Stay hydrated, take a breath.',
  'Quiet moment. Everything can wait a bit.',
  'Gentle reminder: you’re enough.',
];

const COMFORT_AFTERNOON = [
  'Afternoon stretch? You’ve earned a breather.',
  'Steady afternoon. One thing at a time.',
  'Warm afternoon. Keep it cozy.',
  'You’re doing fine. No need to push harder.',
  'Quiet afternoon. Perfect for a little calm.',
];

const COMFORT_EVENING = [
  'Ease into the evening. You did good today.',
  'Wind down well. Hope the day was kind.',
  'Almost there. Rest is part of the plan.',
  'Soft evening. Put your feet up.',
  'Day’s winding down. Be proud of what you did.',
];

const COMFORT_WEEKEND_MORNING = [
  'Easy morning — you’ve earned it.',
  'Slow start is okay. It’s your day.',
  'Weekend vibes. Take the morning at your pace.',
];

const COMFORT_FRIDAY_EVENING = [
  'Friday evening. Ease into the weekend.',
  'Almost weekend. You made it.',
  'Wind down — the week is done.',
];

/**
 * Returns a single cozy, time-based comfort message (no name, no weather).
 * Use on the home page date strip and in empty states.
 * Optional seed (e.g. date key 'yyyy-MM-dd') keeps the same message for the day.
 */
export function getComfortLine(seed?: string): string {
  const h = hour();
  const weekend = isWeekend();
  const friday = isFriday();
  const pick = (opts: string[]) =>
    seed != null ? opts[pickIndex(seed, opts.length)] : opts[Math.floor(Math.random() * opts.length)];

  if (h >= 21 || h < 5) return pick(COMFORT_NIGHT);
  if (h >= 5 && h < 8) return pick(COMFORT_EARLY);
  if (weekend && h >= 8 && h < 12) return pick(COMFORT_WEEKEND_MORNING);
  if (friday && h >= 17) return pick(COMFORT_FRIDAY_EVENING);
  if (h >= 8 && h < 12) return pick(COMFORT_MORNING);
  if (h >= 12 && h < 14) return pick(COMFORT_MIDDAY);
  if (h >= 14 && h < 17) return pick(COMFORT_AFTERNOON);
  if (h >= 17 && h < 21) return pick(COMFORT_EVENING);
  return pick(COMFORT_MORNING);
}

// ─── Tab-specific banner lines (one line under each tab header) ─────────────────

export type ComfortTab = 'goals' | 'calendar' | 'orders' | 'finance' | 'notes';

const TAB_GOALS = [
  'Small steps add up.',
  'One goal at a time.',
  "Today's progress counts.",
  'Build your streak.',
  "You've got this.",
  'Light your next flame.',
];

const TAB_CALENDAR = [
  'Your day at a glance.',
  "What's on the schedule?",
  'Plan at your pace.',
  'One day at a time.',
  'Time when you need it.',
];

const TAB_ORDERS = [
  'Stay on top of your queue.',
  'One order at a time.',
  "You're in control.",
  'Track and deliver.',
  'Keep the list moving.',
];

const TAB_FINANCE = [
  'Know where you stand.',
  'Peace of mind with every entry.',
  'Small entries add up.',
  'Your money, your clarity.',
  'One transaction at a time.',
];

const TAB_NOTES = [
  'Capture what matters.',
  'Thoughts saved for later.',
  'Quick notes, less stress.',
  'Ideas when they strike.',
  'Your thoughts in one place.',
];

/**
 * Returns a cozy line for a specific tab banner. Use under the tab title (Goals, Calendar, Orders, Finance, Notes).
 * Optional seed keeps the same message for the day.
 */
export function getComfortLineForTab(tab: ComfortTab, seed?: string): string {
  const opts =
    tab === 'goals' ? TAB_GOALS
    : tab === 'calendar' ? TAB_CALENDAR
    : tab === 'orders' ? TAB_ORDERS
    : tab === 'finance' ? TAB_FINANCE
    : TAB_NOTES;
  const pick = (arr: string[]) =>
    seed != null ? arr[pickIndex(seed, arr.length)] : arr[Math.floor(Math.random() * arr.length)];
  return pick(opts);
}
