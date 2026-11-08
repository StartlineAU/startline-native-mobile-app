import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  ChevronRight,
  CircleHelp,
  LogOut,
  Settings,
  Share2,
  ShieldCheck,
  Ticket,
  UserRound,
} from 'lucide-react-native';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, EmptyState } from '@/components/ui/AppText';
import { Badge, Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { formatEventDate } from '@/lib/format';
import { colors, radius, spacing } from '@/theme/tokens';

export default function ProfileScreen() {
  const auth = useRequireAuth('/profile');
  const insets = useSafeAreaInsets();
  const profile = auth.profile;

  if (auth.status === 'loading' || (auth.status === 'authenticated' && auth.profileLoading)) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (auth.status !== 'authenticated') {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <EmptyState
          title="Your Startline profile."
          body="Sign in to manage your details and see your race history."
          action={<Button label="Sign in" onPress={() => router.push('/auth/sign-in')} />}
        />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <EmptyState
          title="Profile unavailable."
          body="Your sign-in is active, but Startline could not load your athlete profile."
          action={<Button label="Try again" onPress={() => void auth.refreshProfile()} />}
        />
      </SafeAreaView>
    );
  }

  const displayName =
    profile.username || profile.name?.trim() || profile.email.split('@')[0] || 'Athlete';
  const initial = displayName.charAt(0).toUpperCase();
  const completed = profile.history.completed;

  const share = () => {
    const handle = profile.username ? `/${profile.username}` : '';
    void Share.share({
      title: `${displayName} on Startline`,
      message: `Follow ${displayName}'s race calendar on Startline. https://startlineau.com/profile${handle}`,
    }).catch(() => {});
  };

  const signOut = () => {
    void auth.signOut().then(() => router.replace('/'));
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            tintColor={colors.primary}
            refreshing={auth.profileLoading}
            onRefresh={() => void auth.refreshProfile()}
          />
        }>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <AppText variant="eyebrow">Athlete profile</AppText>
            <View style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share profile"
                onPress={share}
                style={styles.smallButton}>
                <Share2 size={17} color={colors.text} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Settings"
                onPress={() => router.push('/settings')}
                style={styles.smallButton}>
                <Settings size={17} color={colors.text} />
              </Pressable>
            </View>
          </View>

          <View style={styles.profileBand}>
            <View style={styles.avatarWrap}>
              {profile.profilePicUrl ? (
                <Image source={{ uri: profile.profilePicUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <AppText variant="displayItalic" style={styles.avatarInitial}>
                  {initial}
                </AppText>
              )}
            </View>
            <View style={styles.profileInfo}>
              <AppText variant="title" numberOfLines={2}>
                {displayName}
              </AppText>
              {profile.username ? (
                <AppText variant="meta" style={styles.accent}>
                  @{profile.username}
                </AppText>
              ) : (
                <AppText variant="meta" style={styles.muted}>
                  {profile.email}
                </AppText>
              )}
              {profile.bio ? (
                <AppText variant="bodySmall" numberOfLines={3} style={styles.bio}>
                  {profile.bio}
                </AppText>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <AppText variant="displayItalic" style={styles.statValue}>
              {completed}
            </AppText>
            <AppText variant="meta" style={styles.muted}>
              Entries
            </AppText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <AppText variant="displayItalic" style={styles.statValue}>
              {profile.history.registrations.filter((entry) => entry.resultTime).length}
            </AppText>
            <AppText variant="meta" style={styles.muted}>
              Results
            </AppText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <AppText variant="displayItalic" style={styles.statValue}>
              {profile.state?.toUpperCase() ?? 'AUS'}
            </AppText>
            <AppText variant="meta" style={styles.muted}>
              Region
            </AppText>
          </View>
        </View>

        <View style={styles.actions}>
          <Button label="Edit profile" onPress={() => router.push('/profile/edit')} />
          <Button
            label="View my entries"
            variant="outline"
            icon={<Ticket size={16} color={colors.text} />}
            onPress={() => router.push('/activity')}
          />
        </View>

        <View style={styles.section}>
          <AppText variant="eyebrow">Race history</AppText>
          <AppText variant="title">Your results</AppText>
          {profile.history.registrations.length === 0 ? (
            <Card>
              <AppText variant="bodySmall">
                Your confirmed entries and organiser-published results will appear here.
              </AppText>
            </Card>
          ) : (
            <View style={styles.historyList}>
              {profile.history.registrations.slice(0, 10).map((entry) => (
                <Pressable
                  key={entry.id}
                  onPress={() => router.push(`/events/${entry.event.id}` as never)}
                  style={styles.historyRow}>
                  <View style={styles.historyDate}>
                    <AppText variant="meta" style={styles.accent}>
                      {formatEventDate(entry.event.eventDate)}
                    </AppText>
                  </View>
                  <View style={styles.flex}>
                    <AppText variant="bodyMedium" numberOfLines={1}>
                      {entry.event.title}
                    </AppText>
                    <AppText variant="bodySmall" numberOfLines={1}>
                      {entry.event.city}, {entry.event.state.toUpperCase()}
                    </AppText>
                  </View>
                  {entry.resultTime || entry.wave ? (
                    <Badge label={entry.resultTime || entry.wave || ''} tone="neutral" />
                  ) : (
                    <ChevronRight size={16} color={colors.mutedDark} />
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <AppText variant="eyebrow">Account</AppText>
          <View style={styles.menu}>
            <MenuRow
              icon={<UserRound size={18} color={colors.primary} />}
              title="Personal details"
              subtitle="Registration prefill and emergency contact"
              onPress={() => router.push('/profile/edit')}
            />
            <MenuRow
              icon={<ShieldCheck size={18} color={colors.primary} />}
              title="Settings and account"
              subtitle="Privacy, security and account deletion"
              onPress={() => router.push('/settings')}
            />
            <MenuRow
              icon={<CircleHelp size={18} color={colors.primary} />}
              title="Support"
              subtitle="Refund requests and help with an entry"
              onPress={() => router.push('/support')}
            />
          </View>
        </View>

        <Pressable onPress={signOut} style={styles.signOut}>
          <LogOut size={17} color={colors.muted} />
          <AppText variant="meta">Sign out</AppText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed ? { opacity: 0.75 } : null]}>
      <View style={styles.menuIcon}>{icon}</View>
      <View style={styles.flex}>
        <AppText variant="bodyMedium">{title}</AppText>
        <AppText variant="bodySmall">{subtitle}</AppText>
      </View>
      <ChevronRight size={17} color={colors.mutedDark} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  smallButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.raised,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBand: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatarWrap: {
    width: 92,
    height: 92,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: colors.primary, fontSize: 42, lineHeight: 44 },
  profileInfo: { flex: 1, gap: 4 },
  bio: { marginTop: 5 },
  accent: { color: colors.primary },
  muted: { color: colors.muted },
  statsRow: {
    marginTop: spacing.xxl,
    marginHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontSize: 30, lineHeight: 31 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 38, backgroundColor: colors.border },
  actions: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xxl,
    gap: spacing.md,
  },
  historyList: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  historyDate: { width: 54 },
  menu: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: 68,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOut: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxl,
    padding: spacing.md,
  },
  flex: { flex: 1 },
});
