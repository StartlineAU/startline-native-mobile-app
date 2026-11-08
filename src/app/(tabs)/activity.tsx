import { router } from 'expo-router';
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Clock,
  Flag,
  Megaphone,
  Ticket,
  Undo2,
  UserCheck,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventCard } from '@/components/events/EventCard';
import { AppText, EmptyState } from '@/components/ui/AppText';
import { Badge, Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  useFollowing,
  useSavedEventIds,
  useSavedEventsHydrated,
  useUserNotifications,
  useUserRegistrations,
} from '@/hooks/useEvents';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { apiRequest, apiErrorMessage } from '@/lib/api';
import { formatEventDate, formatMoney, relativeTime } from '@/lib/format';
import { queryClient } from '@/lib/query-client';
import { colors, radius, spacing } from '@/theme/tokens';
import type { FollowingOrganiser, UserNotification, UserRegistration } from '@/types/api';

type Tab = 'registered' | 'saved' | 'following';

export default function ActivityScreen() {
  const auth = useRequireAuth('/activity');
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('registered');
  const authenticated = auth.status === 'authenticated';

  const registrationsQuery = useUserRegistrations(authenticated);
  const savedIdsQuery = useSavedEventIds(authenticated);
  const savedEventsQuery = useSavedEventsHydrated(savedIdsQuery.data);
  const followingQuery = useFollowing(authenticated);
  const notificationsQuery = useUserNotifications(authenticated);

  const registrations = registrationsQuery.data ?? [];
  const savedEvents = savedEventsQuery.data ?? [];
  const following = followingQuery.data ?? [];
  const notifications = notificationsQuery.data?.notifications ?? [];
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;
  const activeRegistrations = registrations.filter((entry) => entry.status === 'CONFIRMED');

  const counts = useMemo(
    () => ({
      registered: activeRegistrations.length,
      saved: savedEvents.length,
      following: following.length,
    }),
    [activeRegistrations.length, savedEvents.length, following.length],
  );

  const refreshing =
    registrationsQuery.isRefetching ||
    savedIdsQuery.isRefetching ||
    followingQuery.isRefetching ||
    notificationsQuery.isRefetching;

  const refresh = () => {
    void registrationsQuery.refetch();
    void savedIdsQuery.refetch();
    void followingQuery.refetch();
    void notificationsQuery.refetch();
  };

  const markNotificationsRead = async () => {
    try {
      await apiRequest('/api/user/notifications', {
        method: 'PATCH',
        body: {},
        auth: 'required',
      });
      await queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
    } catch {
      // The feed is supplementary; a failed read marker must not block the screen.
    }
  };

  if (auth.status === 'loading') {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!authenticated) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <EmptyState
          title="Your race calendar."
          body="Sign in to see your entries, saved events and updates."
          action={
            <Button
              label="Sign in"
              onPress={() =>
                router.push({ pathname: '/auth/sign-in', params: { returnTo: '/activity' } })
              }
            />
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }>
        <View style={styles.header}>
          <AppText variant="eyebrow">Your entries</AppText>
          <AppText variant="displayItalic" style={styles.title}>
            Your activity{'\n'}
            <AppText variant="displayItalic" style={styles.accent}>
              calendar.
            </AppText>
          </AppText>
        </View>

        {notifications.length > 0 ? (
          <View style={styles.notifications}>
            <View style={styles.notificationHeader}>
              <View style={styles.notificationTitle}>
                <Bell size={15} color={colors.primary} />
                <AppText variant="label" style={styles.accent}>
                  Updates
                </AppText>
                {unreadCount > 0 ? (
                  <View style={styles.unreadPill}>
                    <AppText variant="meta" style={styles.unreadText}>
                      {unreadCount}
                    </AppText>
                  </View>
                ) : null}
              </View>
              {unreadCount > 0 ? (
                <Pressable onPress={() => void markNotificationsRead()} hitSlop={8}>
                  <AppText variant="meta" style={styles.markRead}>
                    Mark all read
                  </AppText>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.notificationList}>
              {notifications.slice(0, 5).map((notification) => (
                <NotificationRow key={notification.id} notification={notification} />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.tabs}>
          {(['registered', 'saved', 'following'] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => setTab(value)}
              style={[styles.tab, tab === value ? styles.tabActive : null]}>
              <AppText variant="meta" style={tab === value ? styles.tabTextActive : undefined}>
                {value === 'registered' ? 'Registered' : value === 'saved' ? 'Saved' : 'Following'}
              </AppText>
              <AppText variant="meta" style={[styles.tabCount, tab === value ? styles.accent : null]}>
                {counts[value]}
              </AppText>
            </Pressable>
          ))}
        </View>

        {registrationsQuery.isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.listLoader} />
        ) : registrationsQuery.isError ? (
          <EmptyState
            title="Couldn't load your entries."
            body={apiErrorMessage(registrationsQuery.error)}
            action={<Button label="Try again" onPress={refresh} />}
          />
        ) : tab === 'registered' ? (
          registrations.length === 0 ? (
            <EmptyState
              icon={<Ticket size={24} color={colors.primary} />}
              title="No entries yet."
              body="When you register for an event, your entry and race-day details live here."
              action={<Button label="Find an event" onPress={() => router.push('/discover')} />}
            />
          ) : (
            <View style={styles.list}>
              {registrations.map((registration) => (
                <RegistrationCard key={registration.id} registration={registration} />
              ))}
            </View>
          )
        ) : tab === 'saved' ? (
          savedIdsQuery.isLoading || savedEventsQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.listLoader} />
          ) : savedEvents.length === 0 ? (
            <EmptyState
              icon={<Ticket size={24} color={colors.primary} />}
              title="Nothing saved yet."
              body="Tap the heart on an event to keep it here for later."
              action={<Button label="Browse events" onPress={() => router.push('/discover')} />}
            />
          ) : (
            <View style={styles.list}>
              {savedEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </View>
          )
        ) : followingQuery.isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.listLoader} />
        ) : following.length === 0 ? (
          <EmptyState
            title="Not following anyone yet."
            body="Follow organisers to hear when they publish their next event."
          />
        ) : (
          <View style={styles.list}>
            {following.map((organiser) => (
              <FollowingRow key={organiser.followId} organiser={organiser} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotificationRow({ notification }: { notification: UserNotification }) {
  const icon =
    notification.type === 'WAVE_UPDATE' ? (
      <Flag size={16} color={colors.text} />
    ) : notification.type === 'ORGANISER_EVENT_LIVE' ? (
      <Megaphone size={16} color={colors.primary} />
    ) : notification.type === 'ORGANISER_REFUND_REQUEST' ? (
      <Undo2 size={16} color={colors.warning} />
    ) : (
      <Bell size={16} color={colors.muted} />
    );

  return (
    <View style={[styles.notificationRow, !notification.read ? styles.notificationUnread : null]}>
      <View style={styles.notificationIcon}>{icon}</View>
      <View style={styles.flex}>
        <AppText variant="heading" style={styles.notificationTitleText}>
          {notification.title}
        </AppText>
        <AppText variant="bodySmall" numberOfLines={2}>
          {notification.body}
        </AppText>
        <AppText variant="meta" style={styles.notificationTime}>
          {relativeTime(notification.createdAt)}
        </AppText>
      </View>
      {!notification.read ? <View style={styles.unreadDot} /> : null}
    </View>
  );
}

function RegistrationCard({ registration }: { registration: UserRegistration }) {
  const [withdrawing, setWithdrawing] = useState(false);
  const event = registration.event;
  const active = registration.status === 'CONFIRMED';
  const freeEntry = registration.paidCents === 0;
  const checkInOpen = registration.checkInState === 'open' && active;

  const withdraw = async () => {
    setWithdrawing(true);
    try {
      await apiRequest(`/api/user/registrations/${registration.id}/refund-request`, {
        method: 'POST',
        auth: 'required',
      });
      await queryClient.invalidateQueries({ queryKey: ['user-registrations'] });
    } catch (error) {
      Alert.alert('Could not withdraw entry', apiErrorMessage(error));
    } finally {
      setWithdrawing(false);
    }
  };

  const confirmWithdraw = () => {
    Alert.alert(
      'Withdraw your entry?',
      'You will come out of the start list and free your spot. Free entries are not refunded.',
      [
        { text: 'Keep my spot', style: 'cancel' },
        { text: 'Withdraw', style: 'destructive', onPress: () => void withdraw() },
      ],
    );
  };

  return (
    <Card style={styles.registrationCard}>
      <View style={styles.registrationTop}>
        <View style={styles.dateBlock}>
          <AppText variant="meta" style={styles.accent}>
            {formatEventDate(event.eventDate)}
          </AppText>
          <AppText variant="meta" style={styles.mutedDark}>
            {event.city.toUpperCase()}
          </AppText>
        </View>
        <View style={styles.flex}>
          <AppText variant="heading" numberOfLines={2}>
            {event.title}
          </AppText>
          <AppText variant="bodySmall" numberOfLines={1}>
            {event.startTime} · {event.state.toUpperCase()}
          </AppText>
        </View>
        <Badge
          label={
            registration.status === 'CONFIRMED'
              ? 'Entered'
              : registration.status === 'REFUNDED'
                ? 'Refunded'
                : registration.status === 'REFUND_REQUESTED'
                  ? 'Withdrawn'
                  : 'Cancelled'
          }
          tone={active ? 'primary' : 'warning'}
          dot
        />
      </View>

      {active ? (
        <View style={styles.entryDetails}>
          <View style={styles.entryDetail}>
            <AppText variant="meta" style={styles.mutedDark}>
              Wave
            </AppText>
            <AppText variant="label">{registration.wave || 'To be assigned'}</AppText>
          </View>
          <View style={styles.entryDetail}>
            <AppText variant="meta" style={styles.mutedDark}>
              Bib
            </AppText>
            <AppText variant="label" style={registration.bibNumber ? styles.accent : undefined}>
              {registration.bibNumber ? `#${registration.bibNumber}` : 'Not assigned'}
            </AppText>
          </View>
          <View style={styles.entryDetail}>
            <AppText variant="meta" style={styles.mutedDark}>
              Paid
            </AppText>
            <AppText variant="label">
              {freeEntry ? 'Free' : formatMoney(registration.paidCents)}
            </AppText>
          </View>
        </View>
      ) : (
        <AppText variant="bodySmall">
          {registration.status === 'REFUNDED'
            ? 'Your refund has been processed.'
            : freeEntry
              ? 'Your spot has been released.'
              : 'Your refund request is awaiting review.'}
        </AppText>
      )}

      <View style={styles.entryActions}>
        <Pressable
          onPress={() =>
            router.push(`/events/${event.id}` as never)
          }
          style={styles.inlineAction}>
          <AppText variant="meta" style={styles.accent}>
            View event
          </AppText>
          <ChevronRight size={14} color={colors.primary} />
        </Pressable>

        {checkInOpen ? (
          <Pressable
            onPress={() =>
              router.push(`/checkin/${event.id}?registration=${registration.id}` as never)
            }
            style={styles.inlineAction}>
            <UserCheck size={14} color={colors.primary} />
            <AppText variant="meta" style={styles.accent}>
              Check in
            </AppText>
          </Pressable>
        ) : active && registration.checkedInAt ? (
          <View style={styles.inlineAction}>
            <CheckCheck size={14} color={colors.primary} />
            <AppText variant="meta" style={styles.accent}>
              Checked in
            </AppText>
          </View>
        ) : active && registration.checkInState === 'before' ? (
          <View style={styles.inlineAction}>
            <Clock size={14} color={colors.muted} />
            <AppText variant="meta">Opens before the event</AppText>
          </View>
        ) : null}

        {active ? (
          freeEntry ? (
            <Pressable
              onPress={confirmWithdraw}
              disabled={withdrawing}
              style={styles.inlineAction}>
              <AppText variant="meta" style={styles.mutedDark}>
                {withdrawing ? 'Withdrawing…' : 'Withdraw entry'}
              </AppText>
            </Pressable>
          ) : (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/support',
                  params: {
                    eventId: event.id,
                    eventName: event.title,
                    eventDate: event.eventDate,
                  },
                })
              }
              style={styles.inlineAction}>
              <AppText variant="meta" style={styles.mutedDark}>
                Request refund
              </AppText>
            </Pressable>
          )
        ) : null}
      </View>
    </Card>
  );
}

function FollowingRow({ organiser }: { organiser: FollowingOrganiser }) {
  const [removing, setRemoving] = useState(false);

  const unfollow = async () => {
    setRemoving(true);
    try {
      await apiRequest(`/api/public/organisers/${organiser.id}/follow`, {
        method: 'DELETE',
        auth: 'required',
      });
      await queryClient.invalidateQueries({ queryKey: ['user-following'] });
    } catch (error) {
      Alert.alert('Could not unfollow', apiErrorMessage(error));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Card style={styles.followingRow}>
      <View style={styles.organiserLogo}>
        <AppText variant="heading" style={styles.accent}>
          {(organiser.orgName ?? 'O').charAt(0)}
        </AppText>
      </View>
      <View style={styles.flex}>
        <AppText variant="heading" numberOfLines={1}>
          {organiser.orgName ?? 'Organiser'}
        </AppText>
        <AppText variant="meta" style={styles.mutedDark}>
          {organiser.eventsHosted} events · {organiser.followers} followers
        </AppText>
      </View>
      <Pressable
        onPress={() => void unfollow()}
        disabled={removing}
        style={styles.unfollowButton}>
        <AppText variant="meta" style={styles.mutedText}>
          {removing ? 'Removing…' : 'Unfollow'}
        </AppText>
      </Pressable>
    </Card>
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
    gap: spacing.sm,
  },
  title: { fontSize: 42, lineHeight: 41 },
  accent: { color: colors.primary },
  notifications: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  unreadPill: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: { color: colors.primaryInk, fontSize: 9 },
  markRead: { color: colors.muted },
  notificationList: { gap: spacing.sm },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  notificationUnread: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  notificationIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationTitleText: { fontSize: 14 },
  notificationTime: { marginTop: 5, color: colors.mutedDark, fontSize: 9 },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 5,
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xxl,
  },
  tab: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: spacing.sm,
  },
  tabActive: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  tabTextActive: { color: colors.primary },
  tabCount: { color: colors.mutedDark, fontSize: 9.5 },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  listLoader: { marginTop: spacing.xxl },
  registrationCard: { gap: spacing.lg },
  registrationTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  dateBlock: {
    width: 52,
    gap: 4,
  },
  mutedDark: { color: colors.mutedDark },
  entryDetails: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  entryDetail: { flex: 1, gap: 4 },
  entryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.lg,
  },
  inlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  followingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  organiserLogo: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unfollowButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.raised,
  },
  mutedText: { color: colors.muted },
  flex: { flex: 1 },
});
