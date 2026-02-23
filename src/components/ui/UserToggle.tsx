import React, { useRef } from 'react';
import { Pressable, View, StyleSheet, Animated } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { useUserMode } from '@/contexts/UserModeContext';
import { radius } from '@/theme';

export function UserToggle() {
  const { userName, userColor, toggleUser } = useUserMode();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, damping: 20, stiffness: 380 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 280 }).start();

  return (
    <Pressable onPress={toggleUser} onPressIn={onPressIn} onPressOut={onPressOut} hitSlop={8}>
      <Animated.View style={[styles.pill, { backgroundColor: userColor }, { transform: [{ scale }] }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{userName[0]}</Text>
        </View>
        <Text style={styles.name}>{userName}</Text>
        <View style={styles.chevron}>
          <Text style={styles.chevronText}>⌃</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    paddingLeft: 5,
    paddingRight: 10,
    paddingVertical: 5,
    gap: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  avatar: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  name: { color: '#fff', fontWeight: '600', fontSize: 13, letterSpacing: 0.1 },
  chevron: { opacity: 0.7, transform: [{ rotate: '180deg' }] },
  chevronText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
