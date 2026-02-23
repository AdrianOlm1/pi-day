/**
 * ACBackground — Themed gradient background with glass overlay.
 *
 * Renders a pure colour/gradient background driven by the active AC theme.
 * No PNG tiling — just a smooth themed wash with a glass gradient on top.
 */
import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppColors } from '@/contexts/ThemeContext';

function hexToRgba(hex: string, a: number): string {
  const h = (hex.startsWith('#') ? hex.slice(1) : hex) || '7FB069';
  const r = parseInt(h.slice(0, 2), 16) || 127;
  const g = parseInt(h.slice(2, 4), 16) || 176;
  const b = parseInt(h.slice(4, 6), 16) || 105;
  return `rgba(${r},${g},${b},${a})`;
}

interface ACBackgroundProps {
  opacity?: Animated.Value;
  extraTint?: string;
  style?: object;
}

export function ACBackground({ opacity, extraTint, style }: ACBackgroundProps) {
  const appColors = useAppColors();
  const tint      = extraTint ?? appColors.bgTint;
  const tintAlpha = appColors.bgTintOpacity;

  const outerStyle = opacity
    ? { ...StyleSheet.absoluteFillObject, opacity }
    : StyleSheet.absoluteFillObject;

  return (
    <Animated.View style={[outerStyle, style]} pointerEvents="none">
      {/* Solid theme background base */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: appColors.background }]} />
      {/* Subtle themed colour wash */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: hexToRgba(tint, tintAlpha * 1.2) }]} />
      {/* Glass gradient — top lighter, bottom deeper */}
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

export function ACBackgroundStatic({ extraTint }: { extraTint?: string }) {
  const appColors = useAppColors();
  const tint      = extraTint ?? appColors.bgTint;
  const tintAlpha = appColors.bgTintOpacity;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Solid theme background base */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: appColors.background }]} />
      {/* Subtle themed colour wash */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: hexToRgba(tint, tintAlpha * 1.2) }]} />
      {/* Glass gradient */}
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
