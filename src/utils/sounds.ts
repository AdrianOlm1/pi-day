import { Audio } from 'expo-av';

type SoundName = 'order_archive' | 'notification' | 'menu_open' | 'menu_close' | 'check' | 'order_pending' | 'order_complete' | 'trash' | 'habit_complete' | 'all_habit_complete' | 'habit_unselect';

const soundCache: Partial<Record<SoundName, { sound: Audio.Sound }>> = {};
let audioModeSet = false;

async function ensureAudioMode(): Promise<void> {
  if (audioModeSet) return;
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
  audioModeSet = true;
}

async function loadSound(name: SoundName): Promise<Audio.Sound> {
  await ensureAudioMode();
  const cached = soundCache[name];
  if (cached) return cached.sound;

  const sources: Record<SoundName, number> = {
    order_archive: require('../../assets/sounds/order_archive.wav'),
    notification: require('../../assets/sounds/notifcation.wav'),
    menu_open: require('../../assets/sounds/menu_open.wav'),
    menu_close: require('../../assets/sounds/menu_close.wav'),
    check: require('../../assets/sounds/check.wav'),
    order_pending: require('../../assets/sounds/order_pending.wav'),
    order_complete: require('../../assets/sounds/order_complete.wav'),
    trash: require('../../assets/sounds/trash.wav'),
    habit_complete: require('../../assets/sounds/habit_complete.wav'),
    all_habit_complete: require('../../assets/sounds/all_habit_complete.wav'),
    habit_unselect: require('../../assets/sounds/habit_unselect.wav'),
  };
  const source = sources[name];
  const { sound } = await Audio.Sound.createAsync(source);
  soundCache[name] = { sound };
  return sound;
}

async function play(name: SoundName): Promise<void> {
  try {
    const sound = await loadSound(name);
    await sound.setPositionAsync(0);
    await sound.setVolumeAsync(1);
    await sound.playAsync();
  } catch {
    // Ignore playback errors (e.g. missing file, audio focus)
  }
}

/** Play when an order is archived. */
export function playOrderArchive(): void {
  play('order_archive');
}

/** Play when a notification is received (or as notification sound). */
export function playNotification(): void {
  play('notification');
}

/** Play when opening the settings sheet. */
export function playMenuOpen(): void {
  play('menu_open');
}

/** Play when closing the settings sheet. */
export function playMenuClose(): void {
  play('menu_close');
}

/** Play when checking off a schedule item or todo. */
export function playCheck(): void {
  play('check');
}

/** Play when an order is created (in progress). */
export function playOrderInProgress(): void {
  play('order_pending');
}

/** Play when an order is set to Complete (legacy / edit flow). */
export function playOrderComplete(): void {
  play('order_complete');
}

/** Play when deleting/removing an order (or similar trash action). */
export function playTrash(): void {
  play('trash');
}

/** Play when a single habit is checked in / completed. */
export function playHabitComplete(): void {
  play('habit_complete');
}

/** Play when all habits for today are complete. */
export function playAllHabitComplete(): void {
  play('all_habit_complete');
}

/** Play when a habit is unchecked / unselected for the day. */
export function playHabitUnselect(): void {
  play('habit_unselect');
}
