import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { PairingProvider, usePairing } from '@/contexts/PairingContext';
import { UserModeProvider } from '@/contexts/UserModeContext';
import { AutoDeleteCleanup } from '@/components/settings/AutoDeleteCleanup';
import { registerForPushNotifications } from '@/services/notifications';
import { playNotification } from '@/utils/sounds';
import PairingScreen from '@/components/pairing/PairingScreen';
import { View, ActivityIndicator } from 'react-native';

// ─── Inner layout — rendered inside PairingProvider + UserModeProvider ────────
function AppLayout() {
  const { state } = usePairing();

  useEffect(() => {
    registerForPushNotifications();
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => {
      playNotification();
    });
    return () => sub.remove();
  }, []);

  // Still checking AsyncStorage / Supabase
  if (state === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Not yet paired — show onboarding
  if (state === 'unpaired') {
    return <PairingScreen />;
  }

  // Paired — normal app (UserModeProvider wraps so (tabs) layout always has context)
  return (
    <>
      <AutoDeleteCleanup />
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

// ─── Root layout ──────────────────────────────────────────────────────────────
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <PairingProvider>
            <UserModeProvider>
              <AppLayout />
            </UserModeProvider>
          </PairingProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
