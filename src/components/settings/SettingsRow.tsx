import React, { useRef } from 'react';
import { View, StyleSheet, Pressable, Animated } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, radius } from '@/theme';
import { useAppColors } from '@/contexts/ThemeContext';

interface SettingsRowProps {
  label: string;
  sublabel?: string;
  leftEmoji?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  isLast?: boolean;
}

export function SettingsRow({
  label, sublabel, leftEmoji, right, onPress, showChevron = false, isLast = false,
}: SettingsRowProps) {
  const appColors = useAppColors();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn  = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, damping: 20, stiffness: 400 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, damping: 18, stiffness: 300 }).start();

  const inner = (
    <Animated.View style={[s.row, { transform: [{ scale }] }]}>
      {leftEmoji ? (
        <View style={[s.emojiWrap, { backgroundColor: appColors.fillSecondary }]}>
          <Text style={s.emoji}>{leftEmoji}</Text>
        </View>
      ) : null}
      <View style={s.labelCol}>
        <Text style={[s.label, { color: appColors.label }]}>{label}</Text>
        {sublabel ? <Text style={[s.sublabel, { color: appColors.labelTertiary }]}>{sublabel}</Text> : null}
      </View>
      {right ?? null}
      {showChevron ? (
        <Ionicons name="chevron-forward" size={16} color={appColors.labelTertiary} style={{ marginLeft: spacing.xs }} />
      ) : null}
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        {inner}
        {!isLast && <View style={[s.sep, { backgroundColor: appColors.separator, marginLeft: leftEmoji ? 60 : spacing.xl }]} />}
      </Pressable>
    );
  }

  return (
    <>
      {inner}
      {!isLast && <View style={[s.sep, { backgroundColor: appColors.separator, marginLeft: leftEmoji ? 60 : spacing.xl }]} />}
    </>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    minHeight: 52,
    gap: spacing.md,
  },
  emojiWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  emoji: { fontSize: 18 },
  labelCol: { flex: 1 },
  label: { ...typography.body },
  sublabel: { ...typography.footnote, marginTop: 2 },
  sep: { height: StyleSheet.hairlineWidth },
});
