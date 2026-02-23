import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Animated } from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '@/theme';
import { AC_COLOR_SWATCHES } from '@/constants/acColors';
import type { UserId } from '@/types';

const SWATCH_SIZE = 36;
const RING_PAD    = 4;   // gap between circle edge and ring
const OUTER_SIZE  = SWATCH_SIZE + RING_PAD * 2; // 44 — the fixed container incl. ring

// Darken a hex colour by mixing it with black at `amount` (0–1)
function darken(hex: string, amount = 0.28): string {
  const h = hex.replace('#', '');
  const r = Math.round(parseInt(h.slice(0, 2), 16) * (1 - amount));
  const g = Math.round(parseInt(h.slice(2, 4), 16) * (1 - amount));
  const b = Math.round(parseInt(h.slice(4, 6), 16) * (1 - amount));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

// Lighten a hex colour by mixing it with white at `amount` (0–1)
function lighten(hex: string, amount = 0.30): string {
  const h = hex.replace('#', '');
  const r = Math.round(parseInt(h.slice(0, 2), 16) + (255 - parseInt(h.slice(0, 2), 16)) * amount);
  const g = Math.round(parseInt(h.slice(2, 4), 16) + (255 - parseInt(h.slice(2, 4), 16)) * amount);
  const b = Math.round(parseInt(h.slice(4, 6), 16) + (255 - parseInt(h.slice(4, 6), 16)) * amount);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

interface SwatchProps {
  hex: string;
  emoji: string;
  name: string;
  selected: boolean;
  onPress: () => void;
}

function Swatch({ hex, emoji, name, selected, onPress }: SwatchProps) {
  const bounce  = useRef(new Animated.Value(1)).current;
  const checkSc = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const ringOp  = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    if (selected) {
      Animated.sequence([
        Animated.spring(bounce, { toValue: 1.18, useNativeDriver: true, damping: 8,  stiffness: 500, mass: 0.5 }),
        Animated.spring(bounce, { toValue: 1,    useNativeDriver: true, damping: 12, stiffness: 280 }),
      ]).start();
    }
    Animated.spring(checkSc, { toValue: selected ? 1 : 0, useNativeDriver: true, damping: 14, stiffness: 300 }).start();
    Animated.spring(ringOp,  { toValue: selected ? 1 : 0, useNativeDriver: true, damping: 18, stiffness: 240 }).start();
  }, [selected]);

  return (
    <Pressable onPress={onPress} style={s.swatchWrap} accessibilityLabel={name}>
      {/*
        Fixed-size container that holds both the ring and the circle.
        Both are absolutely positioned inside, perfectly centered.
        This guarantees the ring always surrounds the circle regardless of
        flex layout, scale animations, or emoji below.
      */}
      <View style={s.circleContainer}>
        {/* Outer selection ring — sits exactly outside the circle */}
        <Animated.View
          style={[
            s.ring,
            { borderColor: hex, opacity: ringOp },
          ]}
        />

        {/* Bounce-scaled gradient circle */}
        <Animated.View style={[s.circleBounce, { transform: [{ scale: bounce }] }]}>
          <LinearGradient
            colors={[lighten(hex, 0.22), hex, darken(hex, 0.18)]}
            locations={[0, 0.45, 1]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={s.circle}
          >
            <Animated.View style={[s.checkWrap, { transform: [{ scale: checkSc }], opacity: checkSc }]}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </Animated.View>
          </LinearGradient>
        </Animated.View>
      </View>

      {emoji ? <Text style={s.swatchEmoji}>{emoji}</Text> : null}
    </Pressable>
  );
}

interface UserColorPickerProps {
  userId: UserId;
  selectedColor: string;
  onSelectColor: (hex: string) => void;
}

export function UserColorPicker({ selectedColor, onSelectColor }: UserColorPickerProps) {
  return (
    <View style={s.grid}>
      {AC_COLOR_SWATCHES.map((swatch) => (
        <Swatch
          key={swatch.id}
          hex={swatch.hex}
          emoji={swatch.emoji}
          name={swatch.name}
          selected={selectedColor === swatch.hex}
          onPress={() => onSelectColor(swatch.hex)}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    justifyContent: 'flex-start',
  },
  swatchWrap: {
    alignItems: 'center',
    gap: 2,
    width: OUTER_SIZE,
  },
  // Fixed-size box; ring and circle are both absolutely placed inside
  circleContainer: {
    width: OUTER_SIZE,
    height: OUTER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: OUTER_SIZE,
    height: OUTER_SIZE,
    borderRadius: OUTER_SIZE / 2,
    borderWidth: 2.5,
    // centered inside circleContainer automatically
  },
  circleBounce: {
    // No extra positioning — centered by parent alignItems/justifyContent
  },
  circle: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: SWATCH_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 4,
  },
  checkWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchEmoji: { fontSize: 11 },
});
