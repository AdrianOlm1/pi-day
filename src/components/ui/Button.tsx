import React, { useRef } from 'react';
import {
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Animated,
  ViewStyle,
  StyleProp,
  TextStyle,
} from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { radius, spacing, typography } from '@/theme';
import { useAppColors } from '@/contexts/ThemeContext';
import { hapticLight, hapticMedium } from '@/utils/haptics';

interface ButtonProps {
  title: string;
  onPress: () => void;
  color?: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'filled' | 'outline' | 'ghost' | 'tinted';
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  color: colorProp,
  loading = false,
  disabled = false,
  variant = 'filled',
  size = 'md',
  style,
  textStyle,
}: ButtonProps) {
  const appColors = useAppColors();
  const color = colorProp ?? appColors.gradientFrom;
  const isDisabled = disabled || loading;
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      damping: 20,
      stiffness: 400,
      mass: 0.7,
    }).start();

  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      damping: 18,
      stiffness: 300,
    }).start();

  const containerStyle: ViewStyle = {
    ...styles.base,
    ...sizeMap[size],
    ...(variant === 'filled'
      ? { backgroundColor: isDisabled ? color + '60' : color }
      : variant === 'tinted'
      ? { backgroundColor: color + '14' }
      : variant === 'outline'
      ? { borderWidth: 1.5, borderColor: isDisabled ? color + '50' : color, backgroundColor: 'transparent' }
      : { backgroundColor: 'transparent' }),
    ...(style as ViewStyle),
  };

  const labelColor =
    variant === 'filled'
      ? '#fff'
      : isDisabled
      ? color + '60'
      : color;

  const labelStyle: TextStyle = {
    ...typography[size === 'sm' ? 'subhead' : size === 'lg' ? 'callout' : 'bodyEmphasis'],
    color: labelColor,
    ...(textStyle as TextStyle),
  };

  const handlePress = () => {
    if (isDisabled) return;
    if (variant === 'filled') hapticMedium();
    else hapticLight();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={containerStyle}
    >
      <Animated.View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale }],
          opacity: isDisabled ? 0.55 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === 'filled' ? '#fff' : color}
            size="small"
          />
        ) : (
          <Text style={labelStyle} numberOfLines={1}>
            {title}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

const sizeMap: Record<string, ViewStyle> = {
  sm: { paddingHorizontal: spacing.lg,  paddingVertical: spacing.sm  },
  md: { paddingHorizontal: spacing.xl,  paddingVertical: spacing.md + 1 },
  lg: { paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg  },
};
