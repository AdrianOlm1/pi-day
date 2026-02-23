import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Animated } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, radius, shadows } from '@/theme';
import { AC_THEMES, AC_THEME_ORDER, type ACThemeId } from '@/constants/acThemes';
import { useAppColors } from '@/contexts/ThemeContext';
import { useUserMode } from '@/contexts/UserModeContext';

// ─── hex → rgba helper ────────────────────────────────────────────────────────
function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${a})`;
}

interface ThemeCardProps {
  themeId: ACThemeId;
  selected: boolean;
  onPress: () => void;
  userColor: string;
}

function ThemeCard({ themeId, selected, onPress, userColor }: ThemeCardProps) {
  const appColors = useAppColors();
  const theme = AC_THEMES[themeId];

  // Bounce scale on selection
  const bounce = useRef(new Animated.Value(1)).current;
  // Glow overlay opacity
  const glow   = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    if (selected) {
      // Pop bounce: scale up then settle
      Animated.sequence([
        Animated.spring(bounce, { toValue: 1.04, useNativeDriver: true, damping: 10, stiffness: 400, mass: 0.6 }),
        Animated.spring(bounce, { toValue: 1,    useNativeDriver: true, damping: 14, stiffness: 260 }),
      ]).start();
    }
    Animated.spring(glow, {
      toValue: selected ? 1 : 0,
      useNativeDriver: true,
      damping: 16,
      stiffness: 260,
    }).start();
  }, [selected]);

  const c = theme.colors;

  return (
    <Pressable onPress={onPress} style={s.cardWrap}>
      <Animated.View
        style={[
          s.card,
          { backgroundColor: appColors.surface, transform: [{ scale: bounce }] },
          selected && { borderColor: userColor, borderWidth: 2 },
        ]}
      >
        {/* Selection gradient glow */}
        <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: radius.xl, opacity: glow }]}>
          <LinearGradient
            colors={[hexToRgba(userColor, 0.18), hexToRgba(userColor, 0.06), 'transparent']}
            locations={[0, 0.4, 1]}
            style={[StyleSheet.absoluteFill, { borderRadius: radius.xl }]}
          />
        </Animated.View>

        {/* Top: optional emoji + name + optional checkmark */}
        <View style={s.cardTop}>
          {theme.emoji ? <Text style={s.themeEmoji}>{theme.emoji}</Text> : null}
          <Text style={[s.themeName, { color: appColors.label }]} numberOfLines={1}>{theme.name}</Text>
          {selected && (
            <Animated.View style={{ opacity: glow }}>
              <Ionicons name="checkmark-circle" size={16} color={userColor} />
            </Animated.View>
          )}
        </View>

        {/* Gradient preview strip — shows the theme's real gradient */}
        <View style={s.previewStrip}>
          <LinearGradient
            colors={[c.gradientFrom, c.gradientTo, c.background]}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.stripGrad}
          />
        </View>

        {/* Colour dot row — background, surface, tab */}
        <View style={s.dotRow}>
          <View style={[s.dot, { backgroundColor: c.background }]} />
          <View style={[s.dot, { backgroundColor: c.surface }]} />
          <View style={[s.dot, { backgroundColor: c.tabBarBackground }]} />
          <View style={[s.dot, { backgroundColor: c.gradientFrom }]} />
        </View>

        {/* Description */}
        <Text style={[s.themeDesc, { color: appColors.labelTertiary }]} numberOfLines={2}>
          {theme.description}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

interface ThemePickerProps {
  selectedThemeId: ACThemeId;
  onSelectTheme:   (id: ACThemeId) => void;
}

export function ThemePicker({ selectedThemeId, onSelectTheme }: ThemePickerProps) {
  const { userColor } = useUserMode();

  return (
    <View style={s.grid}>
      {AC_THEME_ORDER.map((id) => (
        <ThemeCard
          key={id}
          themeId={id}
          selected={selectedThemeId === id}
          onPress={() => onSelectTheme(id)}
          userColor={userColor}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  cardWrap: {
    width: '47%',
  },
  card: {
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  themeEmoji: { fontSize: 20 },
  themeName: { ...typography.subhead, flex: 1 },
  previewStrip: {
    height: 10,
    borderRadius: radius.xs,
    overflow: 'hidden',
  },
  stripGrad: { flex: 1 },
  dotRow: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  themeDesc: { ...typography.caption, lineHeight: 16 },
});
