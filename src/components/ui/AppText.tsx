import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  type TextProps,
  type TextStyle,
  View,
  type ViewProps,
} from 'react-native';

import { colors, fonts, radius, spacing } from '@/theme/tokens';

export type TextVariant =
  | 'display'
  | 'displayItalic'
  | 'title'
  | 'titleItalic'
  | 'heading'
  | 'body'
  | 'bodyMedium'
  | 'bodySmall'
  | 'eyebrow'
  | 'label'
  | 'meta'
  | 'button';

const variants: Record<TextVariant, TextStyle> = {
  display: {
    fontFamily: fonts.displayItalic,
    fontSize: 48,
    lineHeight: 47,
    letterSpacing: -2,
    color: colors.text,
  },
  displayItalic: {
    fontFamily: fonts.displayItalic,
    fontSize: 40,
    lineHeight: 40,
    letterSpacing: -1.6,
    color: colors.text,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.6,
    color: colors.text,
  },
  titleItalic: {
    fontFamily: fonts.displayItalic,
    fontSize: 28,
    lineHeight: 29,
    letterSpacing: -0.8,
    color: colors.text,
  },
  heading: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: -0.2,
    color: colors.text,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    color: colors.text,
  },
  bodyMedium: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    lineHeight: 23,
    color: colors.text,
  },
  bodySmall: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
  },
  eyebrow: {
    fontFamily: fonts.display,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  label: {
    fontFamily: fonts.display,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.65,
    textTransform: 'uppercase',
    color: colors.text,
  },
  meta: {
    fontFamily: fonts.displayMedium,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.25,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  button: {
    fontFamily: fonts.display,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.25,
    textTransform: 'uppercase',
    color: colors.primaryInk,
  },
};

export function AppText({
  variant = 'body',
  color,
  style,
  children,
  ...props
}: TextProps & {
  variant?: TextVariant;
  color?: string;
  children?: ReactNode;
}) {
  return (
    <Text {...props} style={[variants[variant], color ? { color } : null, style]}>
      {children}
    </Text>
  );
}

export function LoadingView({ label = 'Loading' }: { label?: string }) {
  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.primary} />
      <AppText variant="meta" style={styles.stateText}>
        {label}
      </AppText>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.state}>
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <AppText variant="title" style={styles.center}>
        {title}
      </AppText>
      {body ? (
        <AppText variant="bodySmall" style={[styles.center, styles.body]}>
          {body}
        </AppText>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

export function Divider({ style }: Pick<ViewProps, 'style'>) {
  return <View style={[styles.divider, style]} />;
}

const styles = StyleSheet.create({
  state: {
    flex: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
    gap: spacing.sm,
  },
  stateText: {
    marginTop: spacing.sm,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  center: {
    textAlign: 'center',
  },
  body: {
    maxWidth: 320,
    marginTop: spacing.xs,
  },
  action: {
    marginTop: spacing.lg,
    width: '100%',
    maxWidth: 280,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
