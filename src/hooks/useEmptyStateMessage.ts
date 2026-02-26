import { useState } from 'react';
import type { EmptyMessage } from '@/utils/emptyStateMessages';

/**
 * Returns a random empty-state message, chosen once when the component mounts.
 * Does not rotate while you're on the page — message stays stable.
 */
export function useEmptyStateMessage(messages: EmptyMessage[]): EmptyMessage {
  const [msg] = useState<EmptyMessage>(() => {
    if (messages.length === 0) return { title: '', subtitle: '' };
    return messages[Math.floor(Math.random() * messages.length)];
  });
  return msg;
}
