import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAutoDeleteSettings } from '@/hooks/useAutoDeleteSettings';
import { deletePastEvents, deletePastEventsByCategory } from '@/services/events';
import { subHours } from 'date-fns';

/**
 * Runs 24h auto-delete when the app becomes active, if the user has enabled it in settings.
 * Renders nothing.
 */
export function AutoDeleteCleanup() {
  const { settings } = useAutoDeleteSettings();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const runCleanup = async () => {
      const s = settingsRef.current;
      if (!s.enabled) return;
      const cutoff = subHours(new Date(), 24);
      try {
        if (s.mode === 'all') {
          await deletePastEvents(cutoff);
        } else if (s.categoryIds.length > 0) {
          await deletePastEventsByCategory(cutoff, s.categoryIds);
        }
      } catch {
        // Ignore errors (e.g. network); will retry next time app becomes active
      }
    };

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') runCleanup();
    });

    return () => sub.remove();
  }, []);

  return null;
}
