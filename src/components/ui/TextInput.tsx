import React, { useState } from 'react';
import {
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  StyleSheet, View,
} from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { spacing, radius, typography, colors } from '@/theme';

interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  accentColor?: string;
}

export function TextInput({ label, error, hint, accentColor = '#3B82F6', style, onFocus, onBlur, ...props }: TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={[styles.label, focused && { color: accentColor }]}>{label}</Text> : null}
      <RNTextInput
        style={[styles.input, focused && [styles.inputFocused, { borderColor: accentColor }], error && styles.inputError, style]}
        placeholderTextColor={colors.labelTertiary}
        selectionColor={accentColor}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.lg },
  label: { ...typography.subhead, color: colors.labelSecondary, marginBottom: spacing.xs + 2 },
  input: {
    borderWidth: 1.5, borderColor: colors.separator, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    fontSize: 15, color: colors.label, backgroundColor: colors.surface,
  },
  inputFocused: { borderWidth: 1.5, backgroundColor: colors.surface },
  inputError: { borderColor: '#EF4444', borderWidth: 1.5 },
  error: { fontSize: 12, color: '#EF4444', marginTop: spacing.xs, fontWeight: '500' },
  hint: { ...typography.footnote, color: colors.labelTertiary, marginTop: spacing.xs },
});
