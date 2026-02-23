import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { UserModeProvider } from '@/contexts/UserModeContext';
import { AutoDeleteCleanup } from '@/components/settings/AutoDeleteCleanup';
import { registerForPushNotifications } from '@/services/notifications';
import { playNotification } from '@/utils/sounds';

export default function RootLayout() {
  useEffect(() => {
    registerForPushNotifications();
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => {
      playNotification();
    });
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <UserModeProvider>
            <AutoDeleteCleanup />
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
            </Stack>
          </UserModeProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
