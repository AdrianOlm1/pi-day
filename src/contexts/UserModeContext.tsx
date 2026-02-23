import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserId } from '../types';
import { useTheme } from './ThemeContext';

const STORAGE_KEY = 'piday_user_mode';

interface UserModeContextValue {
  userId: UserId;
  userName: string;
  userColor: string;
  setUserId: (id: UserId) => void;
  toggleUser: () => void;
  isLoading: boolean;
}

const UserModeContext = createContext<UserModeContextValue | null>(null);

export function UserModeProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserIdState] = useState<UserId>('adrian');
  const [isLoading, setIsLoading] = useState(true);
  const { getUserColor, getUserName } = useTheme();

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'adrian' || stored === 'sarah') {
        setUserIdState(stored);
      }
      setIsLoading(false);
    });
  }, []);

  const setUserId = useCallback((id: UserId) => {
    setUserIdState(id);
    AsyncStorage.setItem(STORAGE_KEY, id);
  }, []);

  const toggleUser = useCallback(() => {
    setUserId(userId === 'adrian' ? 'sarah' : 'adrian');
  }, [userId, setUserId]);

  return (
    <UserModeContext.Provider
      value={{
        userId,
        userName:  getUserName(userId),
        userColor: getUserColor(userId),
        setUserId,
        toggleUser,
        isLoading,
      }}
    >
      {children}
    </UserModeContext.Provider>
  );
}

export function useUserMode() {
  const ctx = useContext(UserModeContext);
  if (!ctx) throw new Error('useUserMode must be used within UserModeProvider');
  return ctx;
}
