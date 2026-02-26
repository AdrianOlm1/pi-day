/**
 * Centralized haptics for Pi Day — cozy, consistent feedback.
 * Use: Light for selections/taps, Medium for confirmations/complete, Heavy sparingly.
 */
import * as Haptics from 'expo-haptics';

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning';

const styleMap = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
  selection: Haptics.ImpactFeedbackStyle.Light,
  success: Haptics.ImpactFeedbackStyle.Medium,
  warning: Haptics.ImpactFeedbackStyle.Medium,
} as const;

/** Light tap — tab switch, list item press, card tap, calendar day select */
export function hapticLight(): void {
  Haptics.impactAsync(styleMap.light).catch(() => {});
}

/** Medium tap — FAB, primary button, complete/archive, reorder start */
export function hapticMedium(): void {
  Haptics.impactAsync(styleMap.medium).catch(() => {});
}

/** Selection changed (e.g. picker) */
export function hapticSelection(): void {
  Haptics.selectionAsync().catch(() => {});
}

/** Success / completion (optional; can use medium instead) */
export function hapticSuccess(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Warning (e.g. destructive action) */
export function hapticWarning(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
