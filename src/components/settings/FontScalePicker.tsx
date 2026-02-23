import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Animated } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { spacing, typography, radius } from '@/theme';
import { useAppColors } from '@/contexts/ThemeContext';
import { useUserMode } from '@/contexts/UserModeContext';
import type { FontSizeScale } from '@/contexts/ThemeContext';

const OPTIONS: { value: FontSizeScale; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'default', label: 'Default' },
  { value: 'large',   label: 'Large' },
];

interface FontScalePickerProps {
  value:    FontSizeScale;
  onChange: (v: FontSizeScale) => void;
}

export function FontScalePicker({ value, onChange }: FontScalePickerProps) {
  const appColors  = useAppColors();
  const { userColor } = useUserMode();
  const selectedIdx = OPTIONS.findIndex((o) => o.value === value);
  const slideAnim   = useRef(new Animated.Value(selectedIdx)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: selectedIdx,
      useNativeDriver: true,
      damping: 20,
      stiffness: 300,
    }).start();
  }, [selectedIdx]);

  return (
    <View style={[s.wrap, { backgroundColor: appColors.fillSecondary }]}>
      {/* Sliding indicator */}
      <Animated.View
        style={[
          s.indicator,
          { backgroundColor: userColor },
          {
            transform: [{
              translateX: slideAnim.interpolate({
                inputRange:  [0, 1, 2],
                outputRange: [2, (SEGMENT_W + 2), (SEGMENT_W + 2) * 2],
              }),
            }],
          },
        ]}
      />
      {OPTIONS.map((opt) => (
        <Pressable key={opt.value} onPress={() => onChange(opt.value)} style={s.segment}>
          <Text style={[s.label, { color: value === opt.value ? '#fff' : appColors.labelSecondary }]}>
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const SEGMENT_W = 100; // approximate; flex handles actual sizing

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    padding: 2,
    marginHorizontal: spacing.xl,
    position: 'relative',
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: 2, bottom: 2,
    width: '33.33%',
    borderRadius: radius.md,
    zIndex: 0,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    zIndex: 1,
  },
  label: { ...typography.subhead, fontSize: 12 },
});
