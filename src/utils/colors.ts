import type { UserId } from '../types';

export const USER_COLORS: Record<UserId, string> = {
  adrian: '#800020',
  sarah: '#00563B',
};

export const USER_NAMES: Record<UserId, string> = {
  adrian: 'Adrian :P',
  sarah: 'Sarah <3',
};

export const SHARED_COLOR = '#8B5CF6';

export const EVENT_TYPE_COLORS: Record<string, string> = {
  work: '#F59E0B',
  school: '#10B981',
  personal: '#6366F1',
  shared: SHARED_COLOR,
};

export function getUserColor(userId: UserId): string {
  return USER_COLORS[userId];
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
