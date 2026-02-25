import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, radius } from '@/theme';
import { useAppColors } from '@/contexts/ThemeContext';

interface EmptyStateProps {
  icon?: string;
  emoji?: string;
  title: string;
  subtitle?: string;
  color?: string;
}

export function EmptyState({ icon, emoji = '', title, subtitle, color }: EmptyStateProps) {
  const appColors = useAppColors();
  const accent = color ?? appColors.labelTertiary;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 160 }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateY }] }]}>
      <View style={[styles.iconWrap, { backgroundColor: accent + '12' }]}>
        {icon
          ? <Ionicons name={icon as any} size={36} color={accent} />
          : emoji ? <Text style={styles.emoji}>{emoji}</Text> : <Ionicons name="document-outline" size={36} color={accent} />
        }
      </View>
      <Text style={[styles.title, { color: appColors.label }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: appColors.labelSecondary }]}>{subtitle}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxxl, paddingVertical: 48 },
  iconWrap: { width: 72, height: 72, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  emoji: { fontSize: 36 },
  title: { ...typography.title3, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { ...typography.body, textAlign: 'center', lineHeight: 22 },
});
