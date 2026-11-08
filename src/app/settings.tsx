import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ChevronRight, CircleHelp, FileText, LockKeyhole, ShieldAlert, Trash2 } from 'lucide-react-native';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, EmptyState } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { config } from '@/config/env';
import { useAuth } from '@/context/AuthContext';
import { apiRequest, apiErrorMessage } from '@/lib/api';
import { colors, radius, spacing } from '@/theme/tokens';

type AccountStatus = {
  email: string;
  blockers: { organiserId: string; name: string; otherMembers: number; registrations: number }[];
  upcomingEntries: number;
};

export default function SettingsScreen() {
  const auth = useAuth();
  const account = useQuery({
    queryKey: ['account-deletion-status'],
    enabled: auth.status === 'authenticated',
    queryFn: ({ signal }) =>
      apiRequest<AccountStatus>('/api/user/account', { signal, auth: 'required' }),
  });

  const signOut = async () => {
    await auth.signOut();
    router.replace('/');
  };

  const deleteAccount = () => {
    if (!account.data) return;
    if (account.data.blockers.length > 0) {
      Alert.alert(
        'Transfer your organisation first',
        'You are the only owner of an organisation. Transfer ownership or delete the organisation before deleting your account.',
      );
      return;
    }

    Alert.alert(
      'Delete your Startline account?',
      `Your profile, saved events, follows and notifications will be removed.${
        account.data.upcomingEntries > 0
          ? ` You have ${account.data.upcomingEntries} upcoming entr${
              account.data.upcomingEntries === 1 ? 'y' : 'ies'
            } that will lose access from this account.`
          : ''
      } Entry records remain with the organiser. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest('/api/user/account', {
                method: 'DELETE',
                auth: 'required',
                body: { confirm: 'DELETE' },
              });
              await auth.signOut();
              router.replace('/');
            } catch (error) {
              Alert.alert('Could not delete account', apiErrorMessage(error));
            }
          },
        },
      ],
    );
  };

  if (auth.status !== 'authenticated') {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <ScreenHeader title="Settings" close />
        <EmptyState
          title="Sign in required."
          body="Open settings from your athlete account."
          action={<Button label="Sign in" onPress={() => router.replace('/auth/sign-in')} />}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Settings" eyebrow="Account" close />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.accountCard}>
          <AppText variant="meta" style={styles.muted}>
            Signed in as
          </AppText>
          <AppText variant="heading">{auth.profile?.name || auth.profile?.email || auth.identity?.email}</AppText>
          <AppText variant="bodySmall">{auth.profile?.email}</AppText>
        </Card>

        <View style={styles.section}>
          <AppText variant="eyebrow">Platform</AppText>
          <View style={styles.menu}>
            <MenuRow
              icon={<CircleHelp size={18} color={colors.primary} />}
              title="Support"
              subtitle="Refunds and help with an entry"
              onPress={() => router.push('/support')}
            />
            <MenuRow
              icon={<FileText size={18} color={colors.primary} />}
              title="Terms of Service"
              onPress={() => void WebBrowser.openBrowserAsync(config.termsUrl)}
            />
            <MenuRow
              icon={<LockKeyhole size={18} color={colors.primary} />}
              title="Privacy Policy"
              onPress={() => void WebBrowser.openBrowserAsync(config.privacyUrl)}
            />
            <MenuRow
              icon={<ShieldAlert size={18} color={colors.primary} />}
              title="Login and security"
              subtitle="Password, sign-in methods and MFA are managed on the Startline website"
              onPress={() =>
                void WebBrowser.openBrowserAsync(
                  `${config.apiUrl || 'https://startlineau.com'}/settings/security`,
                )
              }
            />
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="eyebrow">Session</AppText>
          <Button label="Sign out" variant="outline" onPress={() => void signOut()} />
        </View>

        <View style={styles.section}>
          <AppText variant="eyebrow">Danger zone</AppText>
          <Card style={styles.dangerCard}>
            <AppText variant="heading">Delete account</AppText>
            <AppText variant="bodySmall">
              Removes your profile and access. Entry records stay with the organiser.
            </AppText>
            {account.data?.blockers.length ? (
              <AppText style={styles.warning}>
                You are the only owner of {account.data.blockers.map((item) => item.name).join(', ')}.
                Transfer ownership before deleting this account.
              </AppText>
            ) : null}
            <Button
              label="Delete my account"
              variant="danger"
              icon={<Trash2 size={17} color={colors.danger} />}
              onPress={deleteAccount}
              loading={account.isLoading}
            />
          </Card>
        </View>
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
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuRow, pressed ? { opacity: 0.75 } : null]}>
      <View style={styles.menuIcon}>{icon}</View>
      <View style={styles.flex}>
        <AppText variant="bodyMedium">{title}</AppText>
        {subtitle ? <AppText variant="bodySmall">{subtitle}</AppText> : null}
      </View>
      <ChevronRight size={17} color={colors.mutedDark} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xxl, paddingBottom: spacing.xxl },
  accountCard: { gap: 4 },
  muted: { color: colors.mutedDark },
  section: { gap: spacing.md },
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
    minHeight: 62,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerCard: {
    gap: spacing.md,
    borderColor: 'rgba(248,113,113,0.28)',
  },
  warning: { color: colors.warning, fontSize: 13, lineHeight: 19 },
  flex: { flex: 1 },
});
