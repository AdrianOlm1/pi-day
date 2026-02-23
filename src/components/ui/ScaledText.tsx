import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Text that respects the app's display font size setting (compact / default / large).
 * Scales fontSize and lineHeight from the style prop by the theme fontScale.
 */
export function ScaledText({ style, ...props }: TextProps) {
  const { fontScale } = useTheme();
  const flattened = StyleSheet.flatten(style ?? {});
  const scaled =
    fontScale === 1.0
      ? style
      : {
          ...flattened,
          ...(typeof flattened.fontSize === 'number' && {
            fontSize: Math.round(flattened.fontSize * fontScale),
          }),
          ...(typeof flattened.lineHeight === 'number' && {
            lineHeight: Math.round(flattened.lineHeight * fontScale),
          }),
        };
  return <Text {...props} style={scaled} />;
}
