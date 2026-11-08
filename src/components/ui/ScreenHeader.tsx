import { router } from 'expo-router';
import { ChevronLeft, X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { colors, spacing } from '@/theme/tokens';

export function ScreenHeader({
  title,
  eyebrow,
  right,
  close,
}: {
  title: string;
  eyebrow?: string;
  right?: ReactNode;
  close?: boolean;
}) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={close ? 'Close' : 'Go back'}
        hitSlop={8}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        style={styles.back}>
        {close ? (
          <X size={20} color={colors.text} strokeWidth={2} />
        ) : (
          <ChevronLeft size={22} color={colors.text} strokeWidth={2} />
        )}
      </Pressable>
      <View style={styles.titleWrap}>
        {eyebrow ? <AppText variant="eyebrow">{eyebrow}</AppText> : null}
        <AppText variant="heading" numberOfLines={1}>
          {title}
        </AppText>
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

export function ModalScreen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  back: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.raised,
    borderRadius: 19,
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  right: {
    minWidth: 38,
    alignItems: 'flex-end',
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
