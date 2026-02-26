/**
 * ACBackground — Themed gradient background with glass overlay.
 *
 * Renders a pure colour/gradient background driven by the active AC theme.
 * Breathing variant: slow opacity pulse for a living feel.
 * Optional time-based tint: slightly warmer morning, cooler evening.
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppColors } from '@/contexts/ThemeContext';

function hexToRgba(hex: string, a: number): string {
  const h = (hex.startsWith('#') ? hex.slice(1) : hex) || '7FB069';
  const r = parseInt(h.slice(0, 2), 16) || 127;
  const g = parseInt(h.slice(2, 4), 16) || 176;
  const b = parseInt(h.slice(4, 6), 16) || 105;
  return `rgba(${r},${g},${b},${a})`;
}

/** Slightly warmer in morning, cooler in evening (multiplier for tint alpha) */
export function getTimeBasedTintMultiplier(): number {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 1.15;   // morning: warmer
  if (h >= 17 && h < 22) return 0.92; // evening: slightly cooler
  return 1;
}

interface ACBackgroundProps {
  opacity?: Animated.Value;
  extraTint?: string;
  style?: object;
}

export function ACBackground({ opacity, extraTint, style }: ACBackgroundProps) {
  const appColors = useAppColors();
  const tint      = extraTint ?? appColors.bgTint;
  const tintAlpha = appColors.bgTintOpacity * getTimeBasedTintMultiplier();

  const outerStyle = opacity
    ? { ...StyleSheet.absoluteFillObject, opacity }
    : StyleSheet.absoluteFillObject;

  return (
    <Animated.View style={[outerStyle, style]} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: appColors.background }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: hexToRgba(tint, tintAlpha * 1.2) }]} />
      <LinearGradient
        colors={[
          hexToRgba(appColors.gradientFrom, 0.08),
          hexToRgba(appColors.gradientTo,   0.04),
          'transparent',
        ]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

const BREATH_DURATION = 12000; // 12s full cycle

export function ACBackgroundBreathing({ extraTint }: { extraTint?: string }) {
  const appColors = useAppColors();
  const tint = extraTint ?? appColors.bgTint;
  const tintMult = getTimeBasedTintMultiplier();
  const tintAlpha = appColors.bgTintOpacity * tintMult;
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: BREATH_DURATION / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: BREATH_DURATION / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breath]);

  const washOpacity = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.15],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: appColors.background }]} />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: hexToRgba(tint, tintAlpha * 1.2), opacity: washOpacity },
        ]}
      />
      <LinearGradient
        colors={[
          hexToRgba(appColors.gradientFrom, 0.08),
          hexToRgba(appColors.gradientTo,   0.04),
          'transparent',
        ]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

export function ACBackgroundStatic({ extraTint }: { extraTint?: string }) {
  const appColors = useAppColors();
  const tint      = extraTint ?? appColors.bgTint;
  const tintAlpha = appColors.bgTintOpacity * getTimeBasedTintMultiplier();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: appColors.background }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: hexToRgba(tint, tintAlpha * 1.2) }]} />
      <LinearGradient
        colors={[
          hexToRgba(appColors.gradientFrom, 0.08),
          hexToRgba(appColors.gradientTo,   0.04),
          'transparent',
        ]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
