import React from 'react';
import { View, StyleSheet } from 'react-native';

interface ColorDotProps {
  color: string;
  size?: number;
  glow?: boolean;
}

export function ColorDot({ color, size = 8, glow = false }: ColorDotProps) {
  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          ...(glow ? {
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.7,
            shadowRadius: size * 0.8,
            elevation: 3,
          } : {}),
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {},
});
