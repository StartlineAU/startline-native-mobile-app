import { StyleSheet, View, type ViewProps } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing } from '@/theme/tokens';

export function Card({ style, children, ...props }: ViewProps) {
  return (
    <View {...props} style={[styles.card, style]}>
      {children}
    </View>
  );
}

export function Badge({
  label,
  tone = 'neutral',
  dot,
}: {
  label: string;
  tone?: 'neutral' | 'primary' | 'info' | 'danger' | 'warning';
  dot?: boolean;
}) {
  return (
    <View style={[styles.badge, badgeTones[tone]]}>
      {dot ? <View style={[styles.dot, dotTones[tone]]} /> : null}
      <AppText variant="meta" style={[styles.badgeText, badgeTextTones[tone]]}>
        {label}
      </AppText>
    </View>
  );
}

export function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <AppText variant="meta" style={styles.statLabel}>
        {label}
      </AppText>
      <AppText variant="title" style={accent ? styles.accentValue : undefined}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 9.5,
    lineHeight: 12,
    letterSpacing: 1.15,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stat: {
    flex: 1,
    gap: spacing.xs,
  },
  statLabel: {
    color: colors.mutedDark,
  },
  accentValue: {
    color: colors.primary,
  },
});

const badgeTones = StyleSheet.create({
  neutral: { backgroundColor: 'rgba(255,255,255,0.06)' },
  primary: { backgroundColor: colors.primarySoft },
  info: { backgroundColor: colors.infoSoft },
  danger: { backgroundColor: colors.dangerSoft },
  warning: { backgroundColor: colors.warningSoft },
});

const badgeTextTones = StyleSheet.create({
  neutral: { color: colors.muted },
  primary: { color: colors.primary },
  info: { color: colors.info },
  danger: { color: colors.danger },
  warning: { color: colors.warning },
});

const dotTones = StyleSheet.create({
  neutral: { backgroundColor: colors.muted },
  primary: { backgroundColor: colors.primary },
  info: { backgroundColor: colors.info },
  danger: { backgroundColor: colors.danger },
  warning: { backgroundColor: colors.warning },
});
