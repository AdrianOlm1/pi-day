import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, radius } from '@/theme';
import { useAppColors } from '@/contexts/ThemeContext';
import { useEmptyStateMessage } from '@/hooks/useEmptyStateMessage';
import { getComfortLine } from '@/utils/greetings';
import type { EmptyMessage } from '@/utils/emptyStateMessages';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

interface EmptyStateProps {
  icon?: string;
  emoji?: string;
  title?: string;
  subtitle?: string;
  /** When provided, one message is shown at random and rotates every 12s (title/subtitle ignored) */
  messages?: EmptyMessage[];
  /** Show a cozy time-based comfort line below the subtitle */
  showComfortLine?: boolean;
  color?: string;
}

export function EmptyState({ icon, emoji = '', title: titleProp, subtitle: subtitleProp, messages, showComfortLine, color }: EmptyStateProps) {
  const appColors = useAppColors();
  const accent = color ?? appColors.labelTertiary;
  const rotating = useEmptyStateMessage(messages ?? []);
  const title = messages?.length ? rotating.title : (titleProp ?? '');
  const subtitle = messages?.length ? rotating.subtitle : subtitleProp;
  const comfortLine = showComfortLine ? getComfortLine(todayKey()) : null;

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const floatY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 160 }),
    ]).start();
  }, []);

  // Gentle idle float for cozy character
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [floatY]);

  const floatTranslate = floatY.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateY }] }]}>
      <Animated.View style={[styles.iconWrap, { backgroundColor: accent + '12' }, { transform: [{ translateY: floatTranslate }] }]}>
        {icon
          ? <Ionicons name={icon as any} size={36} color={accent} />
          : emoji ? <Text style={styles.emoji}>{emoji}</Text> : <Ionicons name="document-outline" size={36} color={accent} />
        }
      </Animated.View>
      <Text style={[styles.title, { color: appColors.label }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: appColors.labelSecondary }]}>{subtitle}</Text> : null}
      {comfortLine ? <Text style={[styles.comfortLine, { color: appColors.labelQuaternary }]}>{comfortLine}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxxl, paddingVertical: 48 },
  iconWrap: { width: 72, height: 72, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  emoji: { fontSize: 36 },
  title: { ...typography.title3, textAlign: 'center', marginBottom: spacing.sm, maxWidth: 280 },
  subtitle: { ...typography.body, textAlign: 'center', lineHeight: 22, maxWidth: 280 },
  comfortLine: { ...typography.caption, textAlign: 'center', fontStyle: 'italic', marginTop: spacing.sm, maxWidth: 280 },
});
