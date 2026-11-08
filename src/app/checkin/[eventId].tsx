import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, CheckCircle2, LogIn, MapPin, UserCheck } from 'lucide-react-native';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, EmptyState, LoadingView } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { apiRequest, apiErrorMessage } from '@/lib/api';
import { formatLongDate, formatTime } from '@/lib/format';
import { colors, spacing } from '@/theme/tokens';

type CheckInResponse = {
  event: {
    title: string;
    eventDate: string;
    startTime: string;
    venue: string;
    city: string;
    state: string;
    timeZone: string;
  };
  registration: {
    id: string;
    athleteName: string;
    waveLabel: string | null;
    bibNumber: string | null;
    checkedInAt: string | null;
  } | null;
  checkIn: {
    state: 'before' | 'open' | 'closed' | 'unavailable';
    opensAt: string | null;
    closesAt: string | null;
  };
};

export default function CheckInScreen() {
  const auth = useAuth();
  const params = useLocalSearchParams<{ eventId: string; registration?: string }>();
  const eventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId;
  const registrationId = Array.isArray(params.registration)
    ? params.registration[0]
    : params.registration;

  const query = useQuery({
    queryKey: ['checkin', eventId, registrationId, auth.status],
    enabled: Boolean(eventId) && auth.status === 'authenticated',
    queryFn: ({ signal }) => {
      const suffix = registrationId
        ? `?registrationId=${encodeURIComponent(registrationId)}`
        : '';
      return apiRequest<CheckInResponse>(
        `/api/checkin/${encodeURIComponent(eventId)}${suffix}`,
        { signal, auth: 'required' },
      );
    },
  });

  const checkIn = useMutation({
    mutationFn: () =>
      apiRequest<{ checkedInAt: string }>(`/api/checkin/${encodeURIComponent(eventId)}`, {
        method: 'POST',
        auth: 'required',
        body: registrationId ? { registrationId } : {},
      }),
    onSuccess: () => void query.refetch(),
    onError: (error) => Alert.alert('Could not check in', apiErrorMessage(error)),
  });

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Check in" eyebrow="Race day" close />
      {auth.status === 'unauthenticated' ? (
        <EmptyState
          icon={<LogIn size={24} color={colors.primary} />}
          title="Sign in to check in."
          body="Check-in is tied to your Startline account so you can only confirm your own attendance."
          action={
            <Button
              label="Sign in"
              onPress={() =>
                router.push({
                  pathname: '/auth/sign-in',
                  params: { returnTo: `/checkin/${eventId}` },
                })
              }
            />
          }
        />
      ) : query.isLoading ? (
        <LoadingView label="Loading check-in" />
      ) : query.isError ? (
        <EmptyState
          title="Check-in unavailable."
          body={apiErrorMessage(query.error)}
          action={<Button label="Try again" onPress={() => void query.refetch()} />}
        />
      ) : !query.data?.registration ? (
        <EmptyState
          title="You're not registered."
          body="This check-in code belongs to an event your account has not entered."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <View style={styles.iconWrap}>
              <UserCheck size={27} color={colors.primary} />
            </View>
            <AppText variant="eyebrow">Race-day check-in</AppText>
            <AppText variant="displayItalic" style={styles.title}>
              {query.data.registration.checkedInAt ? "You're checked in." : "You're here."}
            </AppText>
            <AppText variant="body" style={styles.muted}>
              {query.data.event.title}
            </AppText>
          </View>

          <Card style={styles.details}>
            <AppText variant="heading">{query.data.registration.athleteName}</AppText>
            <View style={styles.detailRow}>
              <CalendarDays size={16} color={colors.primary} />
              <AppText variant="bodySmall">
                {formatLongDate(query.data.event.eventDate)} ·{' '}
                {formatTime(query.data.event.startTime)}
              </AppText>
            </View>
            <View style={styles.detailRow}>
              <MapPin size={16} color={colors.primary} />
              <AppText variant="bodySmall">
                {query.data.event.venue}, {query.data.event.city}{' '}
                {query.data.event.state.toUpperCase()}
              </AppText>
            </View>
            {query.data.registration.bibNumber ? (
              <View style={styles.detailRow}>
                <UserCheck size={16} color={colors.primary} />
                <AppText variant="bodySmall">Bib {query.data.registration.bibNumber}</AppText>
              </View>
            ) : null}
          </Card>

          {query.data.registration.checkedInAt ? (
            <Card style={styles.success}>
              <CheckCircle2 size={22} color={colors.primary} />
              <AppText variant="bodyMedium" style={styles.accent}>
                Checked in
              </AppText>
            </Card>
          ) : query.data.checkIn.state === 'open' ? (
            <Button
              label="Confirm check-in"
              onPress={() => checkIn.mutate()}
              loading={checkIn.isPending}
            />
          ) : (
            <Card>
              <AppText variant="bodySmall">
                {query.data.checkIn.state === 'before'
                  ? 'Check-in opens one hour before the event starts.'
                  : 'The check-in window is closed.'}
              </AppText>
            </Card>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { textAlign: 'center', fontSize: 36, lineHeight: 35 },
  muted: { color: colors.muted },
  details: { gap: spacing.md },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  success: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  accent: { color: colors.primary },
});
