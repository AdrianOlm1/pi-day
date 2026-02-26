import React, { useRef, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform, Animated, Easing, Pressable } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { Ionicons } from '@expo/vector-icons';
import { useUserMode } from '@/contexts/UserModeContext';
import { useAppColors } from '@/contexts/ThemeContext';
import { hapticLight } from '@/utils/haptics';

const TAB_CONFIG = [
  { name: 'index',    label: 'Today',    active: 'home',            inactive: 'home-outline',          hidden: false },
  { name: 'calendar', label: 'Calendar', active: 'calendar',        inactive: 'calendar-outline',      hidden: false },
  { name: 'todo',     label: 'Goals',    active: 'flag',            inactive: 'flag-outline',          hidden: false },
  { name: 'notes',    label: 'Notes',    active: 'document-text',   inactive: 'document-text-outline',  hidden: false },
  { name: 'finance',  label: 'Finance',  active: 'wallet',          inactive: 'wallet-outline',        hidden: false },
  { name: 'orders',   label: 'Orders',   active: 'reader',          inactive: 'reader-outline',        hidden: false },
] as const;

function AnimatedTabIcon({ iconActive, iconInactive, focused, color, appColors }: {
  iconActive: any; iconInactive: any; focused: boolean; color: string; appColors: { labelTertiary: string };
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const pillOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.14 : 1,
      useNativeDriver: true, damping: 18, stiffness: 300,
    }).start();
    Animated.timing(pillOpacity, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [focused, scale, pillOpacity]);
  return (
    <View style={s.iconWrap}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name={focused ? iconActive : iconInactive} size={24} color={focused ? color : appColors.labelTertiary} />
      </Animated.View>
      <Animated.View style={[s.tabPill, { backgroundColor: color, opacity: pillOpacity }]} />
    </View>
  );
}

export default function TabLayout() {
  const { userColor } = useUserMode();
  const appColors = useAppColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: userColor,
        tabBarInactiveTintColor: appColors.labelTertiary,
        tabBarStyle: [s.tabBar, {
          backgroundColor: appColors.tabBarBackground,
          borderTopWidth: 0,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: appColors.tabBarBorder,
        }],
        tabBarHideOnKeyboard: true,
        tabBarButton: (props) => {
          const { onPress, children, ref, ...rest } = props;
          return (
            <Pressable
              ref={ref as any}
              {...rest}
              onPress={(e) => {
                hapticLight();
                onPress?.(e);
              }}
            >
              {children}
            </Pressable>
          );
        },
        animation: 'fade',
        transitionSpec: {
          animation: 'timing',
          config: {
            duration: 220,
            easing: Easing.out(Easing.cubic),
          },
        },
      }}
    >
      {TAB_CONFIG.map(({ name, label, active, inactive, hidden }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            href: hidden ? null : undefined,
            title: label,
            tabBarLabel: ({ focused, color }) => (
              <Text style={[s.tabLabel, { color: focused ? color : appColors.labelTertiary }]}>{label}</Text>
            ),
            tabBarIcon: ({ focused, color }) => (
              <AnimatedTabIcon iconActive={active} iconInactive={inactive} focused={focused} color={color} appColors={appColors} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const s = StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingBottom: Platform.OS === 'ios' ? 26 : 8,
    paddingTop: 6,
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  iconWrap: { width: '100%', alignItems: 'center', paddingTop: 2 },
  tabPill: {
    position: 'absolute',
    bottom: -18,
    left: '50%',
    marginLeft: -14,
    width: 28,
    height: 3,
    borderRadius: 2,
  },
  tabLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.15, marginTop: 0 },
});
