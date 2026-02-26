/**
 * GlassCard — Apple-style frosted glass card.
 *
 * Cozy edition: inner glow, stronger top highlight, softer tinted shadow.
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
  /** Accent colour for top-edge tint and optional shadow glow */
  accentColor?: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function GlassCard({ children, style, borderRadius = radius.cozyCard, opacity = 1, accentColor }: GlassCardProps) {
  const appColors = useAppColors();
  const surf = appColors.surface;
  const base = 0.84 * opacity;
  const mid  = 0.90 * opacity;
  const top  = 0.96 * opacity;
  /* Neutral shadow only — no tinted glow */
  const shadowStyle = { ...shadows.cozy, shadowColor: '#000', shadowOpacity: 0.04 };

  return (
    <View style={[g.outer, { borderRadius }, shadowStyle, style]}>
      {/* Glass gradient fill */}
      <LinearGradient
        colors={[hexToRgba(surf, top), hexToRgba(surf, mid), hexToRgba(surf, base)]}
        locations={[0, 0.4, 1]}
        style={[StyleSheet.absoluteFill, { borderRadius }]}
      />
      {/* Very subtle top highlight only — no accent shimmer to avoid visible glow */}
      <LinearGradient
        colors={[hexToRgba('#fff', 0.03), 'transparent']}
        locations={[0, 0.4]}
        style={[StyleSheet.absoluteFill, { borderRadius }]}
      />
      {/* Border highlight */}
      <View style={[g.border, { borderRadius, borderColor: hexToRgba(surf, 0.5) }]} />
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
