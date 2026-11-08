import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, fonts, radius, spacing } from '@/theme/tokens';

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <AppText variant="label" style={styles.label}>
        {label}
      </AppText>
      {children}
      {error ? <AppText style={styles.error}>{error}</AppText> : null}
      {!error && hint ? <AppText style={styles.hint}>{hint}</AppText> : null}
    </View>
  );
}

export function Input({ style, multiline, ...props }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.mutedDark}
      selectionColor={colors.primary}
      style={[styles.input, multiline && styles.multiline, style]}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },
  label: {
    color: colors.muted,
  },
  input: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.raised,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 14,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  multiline: {
    minHeight: 110,
    paddingTop: 14,
    paddingBottom: 14,
  },
  hint: {
    color: colors.mutedDark,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
});
