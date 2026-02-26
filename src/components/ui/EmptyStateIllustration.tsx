/**
 * Simple line-art illustrations for empty states — cozy, minimal, no SVG deps.
 * Window = calm open day; cup = rest moment.
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { spacing, radius } from '@/theme';
import { useAppColors } from '@/contexts/ThemeContext';

type IllustrationVariant = 'window' | 'cup';

interface EmptyStateIllustrationProps {
  variant?: IllustrationVariant;
  color?: string;
  size?: number;
  /** Slight idle float (opacity/translateY) for a living feel */
  animated?: boolean;
}

/** Cozy window: rounded frame + cross panes. */
function WindowIllustration({ color, size, animated }: { color: string; size: number; animated: boolean }) {
  const float = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 2400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animated, float]);
  const opacity = float.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });
  const frameSize = size;
  const stroke = Math.max(2, Math.round(size / 24));
  const inner = frameSize - stroke * 2;
  const Wrapper = animated ? Animated.View : View;
  const wrapperStyle = animated ? { opacity, transform: [{ translateY }] } : {};

  return (
    <Wrapper style={[styles.windowOuter, { width: frameSize, height: frameSize }, wrapperStyle]}>
      <View
        style={[
          styles.windowFrame,
          {
            width: frameSize,
            height: frameSize,
            borderRadius: radius.lg,
            borderWidth: stroke,
            borderColor: color,
          },
        ]}
      >
        {/* Cross: horizontal and vertical divider */}
        <View
          style={[
            styles.windowLine,
            {
              position: 'absolute',
              left: stroke,
              right: stroke,
              top: frameSize / 2 - stroke / 2,
              height: stroke,
              backgroundColor: color,
              opacity: 0.6,
            },
          ]}
        />
        <View
          style={[
            styles.windowLine,
            {
              position: 'absolute',
              top: stroke,
              bottom: stroke,
              left: frameSize / 2 - stroke / 2,
              width: stroke,
              backgroundColor: color,
              opacity: 0.6,
            },
          ]}
        />
      </View>
    </Wrapper>
  );
}

/** Simple cup: ellipse bowl + small handle pill. */
function CupIllustration({ color, size }: { color: string; size: number }) {
  const w = size;
  const h = Math.round(size * 0.72);
  const stroke = Math.max(2, Math.round(size / 22));
  return (
    <View style={[styles.cupOuter, { width: w + 10, height: h }]}>
      <View
        style={[
          styles.cupBowl,
          {
            width: w,
            height: h,
            borderRadius: w / 2,
            borderWidth: stroke,
            borderColor: color,
          },
        ]}
      />
      <View
        style={[
          styles.cupHandle,
          {
            position: 'absolute',
            right: 0,
            top: h * 0.22,
            width: stroke,
            height: h * 0.5,
            borderRadius: stroke / 2,
            backgroundColor: color,
            opacity: 0.7,
          },
        ]}
      />
    </View>
  );
}

export function EmptyStateIllustration({
  variant = 'window',
  color: colorProp,
  size = 56,
  animated = true,
}: EmptyStateIllustrationProps) {
  const appColors = useAppColors();
  const color = colorProp ?? appColors.labelTertiary;
  if (variant === 'cup') {
    return <CupIllustration color={color} size={size} />;
  }
  return <WindowIllustration color={color} size={size} animated={animated} />;
}

const styles = StyleSheet.create({
  windowOuter: { alignItems: 'center', justifyContent: 'center' },
  windowFrame: { position: 'relative' },
  windowLine: {},
  cupOuter: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  cupBowl: {},
  cupHandle: {},
});
