import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, shadow, spacing } from '@/theme/tokens';

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'lime' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled,
  loading,
  fullWidth = true,
  style,
  testID,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  testID?: string;
}) {
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (isDisabled) return;
    void Haptics.selectionAsync().catch(() => {});
    onPress?.();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={handlePress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        variant === 'primary' && !isDisabled ? shadow.machined : null,
        fullWidth && styles.fullWidth,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'lime' ? colors.primaryInk : colors.primary}
        />
      ) : null}
      {!loading && icon ? <View style={styles.icon}>{icon}</View> : null}
      <AppText
        variant="button"
        style={[
          styles.label,
          variant === 'outline' || variant === 'ghost' || variant === 'danger'
            ? variant === 'danger'
              ? styles.dangerLabel
              : styles.outlineLabel
            : null,
        ]}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  active,
  size = 42,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  active?: boolean;
  size?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2 },
        active ? styles.iconButtonActive : null,
        pressed ? styles.pressed : null,
      ]}>
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fullWidth: { alignSelf: 'stretch' },
  label: {
    textAlign: 'center',
  },
  outlineLabel: {
    color: colors.text,
  },
  dangerLabel: {
    color: colors.danger,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ translateX: 1 }, { translateY: 1 }],
  },
  disabled: {
    opacity: 0.4,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.raised,
    backgroundColor: colors.surface,
  },
  iconButtonActive: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
});

// Keep these as plain objects. Passing styles returned by StyleSheet.create
// back into another StyleSheet.create registry does not preserve the native
// styles on all platforms, which made the primary button's face transparent.
const sizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: { minHeight: 36, paddingHorizontal: spacing.md },
  md: { minHeight: 46, paddingHorizontal: spacing.lg },
  lg: { minHeight: 54, paddingHorizontal: spacing.xl },
};

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  outline: { backgroundColor: 'transparent', borderColor: colors.raised },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  lime: { backgroundColor: colors.primary, borderColor: colors.primary },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: 'rgba(248,113,113,0.32)',
  },
};
