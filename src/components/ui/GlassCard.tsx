/**
 * GlassCard — Apple-style frosted glass card.
 *
 * Uses a LinearGradient from surface@0.82 → surface@0.94 with a
 * subtle top border highlight and soft shadow, giving the "frosted
 * glass" look that works over the AC background texture.
 */
import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppColors } from '@/contexts/ThemeContext';
import { radius, shadows } from '@/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Extra border radius override */
  borderRadius?: number;
  /** Multiplier for glass opacity (0–1, default 1) */
  opacity?: number;
  /** Accent colour for very subtle top-edge tint */
  accentColor?: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function GlassCard({ children, style, borderRadius = radius.xl, opacity = 1, accentColor }: GlassCardProps) {
  const appColors = useAppColors();
  const surf = appColors.surface;
  const base = 0.84 * opacity;
  const mid  = 0.90 * opacity;
  const top  = 0.96 * opacity;

  return (
    <View style={[g.outer, { borderRadius }, shadows.md, style]}>
      {/* Glass gradient fill */}
      <LinearGradient
        colors={[hexToRgba(surf, top), hexToRgba(surf, mid), hexToRgba(surf, base)]}
        locations={[0, 0.4, 1]}
        style={[StyleSheet.absoluteFill, { borderRadius }]}
      />
      {/* Subtle accent shimmer along top edge */}
      {accentColor && (
        <LinearGradient
          colors={[hexToRgba(accentColor, 0.14), 'transparent']}
          locations={[0, 0.6]}
          style={[g.topShimmer, { borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius }]}
        />
      )}
      {/* Border highlight */}
      <View style={[g.border, { borderRadius, borderColor: hexToRgba(surf, 0.55) }]} />
      {/* Content */}
      <View style={g.content}>{children}</View>
    </View>
  );
}

const g = StyleSheet.create({
  outer: {
    overflow: 'hidden',
    position: 'relative',
  },
  topShimmer: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 56,
  },
  border: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 1,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
