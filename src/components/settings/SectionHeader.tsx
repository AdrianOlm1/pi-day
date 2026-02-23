import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, typography, radius } from '@/theme';
import type { ACThemePattern } from '@/constants/acThemes';
import { PATTERN_EMOJI } from '@/constants/acThemes';
import { useAppColors } from '@/contexts/ThemeContext';

interface SectionHeaderProps {
  title: string;
  emoji?: string;
  pattern?: ACThemePattern;
  /** Gradient colours for the accent bar [from, to] */
  accentColors?: [string, string];
}

export function SectionHeader({ title, emoji, pattern, accentColors }: SectionHeaderProps) {
  const appColors = useAppColors();
  const watermark = pattern && pattern !== 'none' ? PATTERN_EMOJI[pattern] : null;

  return (
    <View style={s.wrap}>
      {/* Gradient accent bar */}
      {accentColors ? (
        <LinearGradient
          colors={[accentColors[0] + 'CC', accentColors[1] + '55', 'transparent']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={s.accentBar}
        />
      ) : (
        <View style={[s.accentBarPlain, { backgroundColor: appColors.separator }]} />
      )}

      <View style={s.row}>
        {emoji ? <Text style={s.emoji}>{emoji}</Text> : null}
        <Text style={[s.title, { color: appColors.labelSecondary }]}>{title.toUpperCase()}</Text>
      </View>

      {watermark ? (
        <Text style={s.watermark} numberOfLines={1}>{watermark}</Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: spacing.xxl, marginBottom: spacing.sm, paddingHorizontal: spacing.xl },
  row:  { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  emoji: { fontSize: 14 },
  title: {
    ...typography.subhead,
    letterSpacing: 0.8,
  },
  accentBar: {
    height: 2,
    borderRadius: 1,
  },
  accentBarPlain: {
    height: StyleSheet.hairlineWidth,
  },
  watermark: {
    position: 'absolute',
    right: spacing.xl,
    top: -6,
    fontSize: 36,
    opacity: 0.07,
  },
});
