import React, { useState } from 'react';
import {
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  StyleSheet, View,
} from 'react-native';
import { ScaledText as Text } from '@/components/ui/ScaledText';
import { spacing, radius, typography } from '@/theme';
import { useAppColors } from '@/contexts/ThemeContext';

interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  accentColor?: string;
  /** Optional prefix (e.g. "$") shown to the left of the input inside the border */
  prefix?: string;
}

export function TextInput({ label, error, hint, accentColor, prefix, style, onFocus, onBlur, ...props }: TextInputProps) {
  const appColors = useAppColors();
  const accent = accentColor ?? appColors.gradientFrom;
  const [focused, setFocused] = useState(false);
  const inputStyle = [
    styles.input,
    { borderColor: appColors.separator, color: appColors.label, backgroundColor: appColors.surface },
    focused && [styles.inputFocused, { borderColor: accent }],
    error && [styles.inputError, { borderColor: appColors.destructive }],
    prefix ? styles.inputWithPrefix : null,
    style,
  ];
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={[styles.label, { color: appColors.labelSecondary }, focused && { color: accent }]}>{label}</Text> : null}
      <View style={[prefix ? styles.prefixRow : null, prefix && [styles.prefixRowBorder, { borderColor: appColors.separator, backgroundColor: appColors.surface }, focused && { borderColor: accent }, error && { borderColor: appColors.destructive }]]}>
        {prefix ? <Text style={[styles.prefix, { color: appColors.labelTertiary }]}>{prefix}</Text> : null}
        <RNTextInput
          style={inputStyle}
          placeholderTextColor={appColors.labelTertiary}
          selectionColor={accent}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          {...props}
        />
      </View>
      {error ? <Text style={[styles.error, { color: appColors.destructive }]}>{error}</Text> : hint ? <Text style={[styles.hint, { color: appColors.labelTertiary }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.lg },
  label: { ...typography.subhead, marginBottom: spacing.xs + 2 },
  input: {
    borderWidth: 1.5, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    fontSize: 15,
  },
  inputWithPrefix: { borderWidth: 0, paddingLeft: 0, flex: 1 },
  prefixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
  },
  prefixRowBorder: {},
  prefix: { fontSize: 15, marginLeft: spacing.lg, marginRight: spacing.xs },
  inputFocused: { borderWidth: 1.5 },
  inputError: { borderWidth: 1.5 },
  error: { fontSize: 12, marginTop: spacing.xs, fontWeight: '500' },
  hint: { ...typography.footnote, marginTop: spacing.xs },
});
