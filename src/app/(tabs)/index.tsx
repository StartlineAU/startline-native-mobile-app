import { router } from 'expo-router';
import { ArrowRight, LocateFixed, Search } from 'lucide-react-native';
import { useMemo } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventCard } from '@/components/events/EventCard';
import { HeroBackdrop, HomeHeader, SectionHeader } from '@/components/home/HomeHeader';
import { AppText, EmptyState, LoadingView } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useEventList } from '@/hooks/useEvents';
import { apiErrorMessage } from '@/lib/api';
import { colors, radius, spacing } from '@/theme/tokens';

export default function HomeScreen() {
  const auth = useAuth();
  const query = useEventList({ limit: 50, sort: 'date' });

  const { startingSoon, popular, recommended } = useMemo(() => {
    const events = query.data?.events ?? [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = [...events].sort(
      (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime(),
    );
    const soon = upcoming
      .filter((event) => new Date(`${event.eventDate}T00:00:00`).getTime() >= today.getTime())
      .slice(0, 8);
    const mostPopular = [...events]
      .sort((a, b) => b.registrationCount - a.registrationCount)
      .slice(0, 8);
    const state = auth.profile?.state?.toLowerCase();
    const local = state ? events.filter((event) => event.state.toLowerCase() === state) : [];
    const localEvents = local.length >= 3 ? local : events.slice(0, 6);
    return { startingSoon: soon, popular: mostPopular, recommended: localEvents };
  }, [query.data?.events, auth.profile?.state]);

  const refresh = () => {
    void query.refetch();
    void auth.refreshProfile();
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <HomeHeader />
      </SafeAreaView>

      {query.isLoading ? (
        <LoadingView label="Loading events" />
      ) : query.isError ? (
        <EmptyState
          title="Couldn't load events."
          body={apiErrorMessage(query.error)}
          action={<Button label="Try again" onPress={refresh} />}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={refresh}
              tintColor={colors.primary}
            />
          }>
          <View style={styles.hero}>
            <HeroBackdrop imageUrl={startingSoon[0]?.coverImageUrl ?? popular[0]?.coverImageUrl} />
            <View style={styles.heroContent}>
              <AppText variant="eyebrow">Australia&apos;s fitness event calendar</AppText>
              <AppText variant="display" style={styles.heroTitle}>
                Find your{'\n'}
                <AppText variant="display" style={styles.heroAccent}>
                  start line.
                </AppText>
              </AppText>
              <AppText variant="body" style={styles.heroBody}>
                Search, filter and register for fitness events across Australia.
              </AppText>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Search events"
                onPress={() => router.push('/discover')}
                style={({ pressed }) => [styles.search, pressed ? styles.pressed : null]}>
                <Search size={18} color={colors.primary} strokeWidth={2} />
                <AppText variant="body" style={styles.searchText}>
                  Search events, cities or divisions
                </AppText>
                <ArrowRight size={18} color={colors.muted} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/discover')}
                style={styles.locationRow}>
                <LocateFixed size={14} color={colors.primary} />
                <AppText variant="meta" style={styles.locationText}>
                  {auth.profile?.city
                    ? `Near ${auth.profile.city}, ${auth.profile.state?.toUpperCase() ?? ''}`
                    : 'Search across Australia'}
                </AppText>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader
              eyebrow="Trending now"
              title="Most popular events"
              action="See all"
              onAction={() => router.push('/discover')}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}>
              {popular.map((event) => (
                <EventCard key={event.id} event={event} horizontal />
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <SectionHeader
              eyebrow="Coming up"
              title="Starting soon"
              action="See all"
              onAction={() => router.push('/discover')}
            />
            <View style={styles.stack}>
              {startingSoon.slice(0, 3).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader
              eyebrow={auth.profile?.state ? 'Near you' : 'Across Australia'}
              title={auth.profile?.state ? `Events in ${auth.profile.state.toUpperCase()}` : 'Explore the calendar'}
            />
            <View style={styles.stack}>
              {recommended.slice(0, 4).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </View>
          </View>

          <View style={styles.endBand}>
            <AppText variant="eyebrow">Your next start line</AppText>
            <AppText variant="titleItalic" style={styles.endTitle}>
              Ready when{'\n'}you are.
            </AppText>
            <Button
              label="Browse every event"
              onPress={() => router.push('/discover')}
              icon={<ArrowRight size={17} color={colors.primaryInk} />}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    backgroundColor: colors.background,
    zIndex: 2,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  hero: {
    minHeight: 520,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  heroContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 100,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  heroTitle: {
    marginTop: spacing.xs,
  },
  heroAccent: {
    color: colors.primary,
  },
  heroBody: {
    maxWidth: 320,
    color: colors.muted,
  },
  search: {
    marginTop: spacing.sm,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(179,225,83,0.36)',
    backgroundColor: 'rgba(31,31,31,0.92)',
  },
  searchText: {
    flex: 1,
    color: colors.muted,
  },
  pressed: {
    opacity: 0.82,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    paddingVertical: 3,
  },
  locationText: {
    color: colors.muted,
  },
  section: {
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  rail: {
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  stack: {
    gap: spacing.md,
  },
  endBand: {
    marginTop: spacing.xxl,
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  endTitle: {
    fontSize: 36,
    lineHeight: 36,
  },
});
