import React, { createContext, useContext } from 'react';
import type { UserId } from '../types';
import { AC_USER_COLOR_DEFAULTS } from '@/constants/acColors';
import { USER_NAMES } from '@/utils/colors';
import { useTheme } from './ThemeContext';
import { usePairing } from './PairingContext';

interface UserModeContextValue {
  userId: UserId;
  userName: string;
  userColor: string;
  /** No-op — role is determined by device pairing, not manually switchable */
  setUserId: (id: UserId) => void;
  /** No-op — kept for backwards compat */
  toggleUser: () => void;
  isLoading: boolean;
}

const UserModeContext = createContext<UserModeContextValue | null>(null);

export function UserModeProvider({ children }: { children: React.ReactNode }) {
  const { getUserColor, getUserName } = useTheme();
  const { state, role } = usePairing();

  // While pairing is loading or role is unknown, fall back to 'adrian'
  const userId: UserId = role ?? 'adrian';
  const isLoading = state === 'loading';

  return (
    <UserModeContext.Provider
      value={{
        userId,
        userName:  getUserName(userId),
        userColor: getUserColor(userId),
        setUserId: () => {},   // role is device-bound, not manually switchable
        toggleUser: () => {},  // kept for backwards compat
        isLoading,
      }}
    >
      {children}
    </UserModeContext.Provider>
  );
}

const FALLBACK_USER_MODE: UserModeContextValue = {
  userId: 'adrian',
  userName: USER_NAMES.adrian,
  userColor: AC_USER_COLOR_DEFAULTS.adrian,
  setUserId: () => {},
  toggleUser: () => {},
  isLoading: true,
};

export function useUserMode() {
  const ctx = useContext(UserModeContext);
  return ctx ?? FALLBACK_USER_MODE;
}
