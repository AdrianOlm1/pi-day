import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, colors, radius } from '@/theme';

interface EmptyStateProps {
  icon?: string;
  emoji?: string;
  title: string;
  subtitle?: string;
  color?: string;
}

export function EmptyState({ icon, emoji = '', title, subtitle, color = colors.labelTertiary }: EmptyStateProps) {
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
      <View style={[styles.iconWrap, { backgroundColor: color + '12' }]}>
        {icon
          ? <Ionicons name={icon as any} size={36} color={color} />
          : emoji ? <Text style={styles.emoji}>{emoji}</Text> : <Ionicons name="document-outline" size={36} color={color} />
        }
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxxl, paddingVertical: 48 },
  iconWrap: { width: 72, height: 72, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  emoji: { fontSize: 36 },
  title: { ...typography.title3, color: colors.label, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.labelSecondary, textAlign: 'center', lineHeight: 22 },
});
