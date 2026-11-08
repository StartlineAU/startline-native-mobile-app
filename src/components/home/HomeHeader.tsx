import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Bell, MapPin } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing } from '@/theme/tokens';

export function HomeHeader() {
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const initial = (auth.profile?.username || auth.profile?.name || auth.identity?.email || '')
    .charAt(0)
    .toUpperCase();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <Image
        source={require('@/assets/images/startline-title-white.png')}
        style={styles.logo}
        contentFit="contain"
      />
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Updates"
          onPress={() =>
            router.push(auth.status === 'authenticated' ? '/activity' : '/auth/sign-in')
          }
          style={({ pressed }) => [styles.circle, pressed ? styles.pressed : null]}>
          <Bell size={18} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={auth.status === 'authenticated' ? 'Your profile' : 'Sign in'}
          onPress={() => router.push(auth.status === 'authenticated' ? '/profile' : '/auth/sign-in')}
          style={({ pressed }) => [
            styles.circle,
            auth.status === 'authenticated' ? styles.avatar : null,
            pressed ? styles.pressed : null,
          ]}>
          {initial ? (
            <AppText variant="heading" style={styles.initial}>
              {initial}
            </AppText>
          ) : (
            <MapPin size={17} color={colors.text} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  action,
  onAction,
}: {
  eyebrow?: string;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitles}>
        {eyebrow ? <AppText variant="eyebrow">{eyebrow}</AppText> : null}
        <AppText variant="title">{title}</AppText>
      </View>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <AppText variant="meta" style={styles.sectionAction}>
            {action}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function HeroBackdrop({ imageUrl }: { imageUrl?: string | null }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <LinearGradient
          colors={['#303a26', '#1e2419', colors.background]}
          style={StyleSheet.absoluteFill}
        />
      )}
      <LinearGradient
        colors={['rgba(20,20,20,0.15)', 'rgba(20,20,20,0.72)', colors.background]}
        locations={[0, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.grid} pointerEvents="none">
        {Array.from({ length: 7 }).map((_, index) => (
          <View key={`v-${index}`} style={[styles.gridLineV, { left: `${(index + 1) * 12.5}%` }]} />
        ))}
        {Array.from({ length: 9 }).map((_, index) => (
          <View key={`h-${index}`} style={[styles.gridLineH, { top: `${(index + 1) * 10}%` }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
  },
  logo: {
    width: 154,
    height: 28,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  circle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.raised,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  initial: {
    color: colors.primary,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.7,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitles: {
    gap: 4,
    flex: 1,
  },
  sectionAction: {
    color: colors.primary,
    paddingBottom: 3,
  },
  grid: {
    ...StyleSheet.absoluteFill,
    opacity: 0.5,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(179,225,83,0.18)',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(179,225,83,0.12)',
  },
});
