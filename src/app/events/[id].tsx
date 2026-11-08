import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  CalendarDays,
  ChevronLeft,
  Clock,
  ExternalLink,
  FileText,
  MapPin,
  Share2,
  Star,
  Ticket,
  Trophy,
  Users,
} from 'lucide-react-native';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventSaveButton } from '@/components/events/EventCard';
import { AppText, EmptyState, LoadingView } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useEventDetail } from '@/hooks/useEvents';
import { useNow } from '@/hooks/useNow';
import { apiErrorMessage } from '@/lib/api';
import {
  formatDateTime,
  formatDiscipline,
  formatLongDate,
  formatMoney,
  formatPrice,
  formatTime,
  stripHtml,
} from '@/lib/format';
import { colors, radius, spacing } from '@/theme/tokens';
import type { PublicWave } from '@/types/api';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const query = useEventDetail(Array.isArray(id) ? id[0] : id);
  const data = query.data;
  const event = data?.event;

  const waves: PublicWave[] = Array.isArray(event?.waves) ? (event.waves as PublicWave[]) : [];
  const openWaves = waves.filter((wave) => {
    const closes = wave.closes || wave.date;
    if (!closes) return true;
    return closes >= new Date(now).toISOString().slice(0, 10);
  });
  const free = waves.length > 0 && waves.every((wave) => Number(wave.price ?? 0) === 0);
  const registrationClosed = !event
    ? true
    : event.status !== 'APPROVED'
      ? true
      : event.startsAtUtc
        ? new Date(event.startsAtUtc).getTime() <= now
        : false;

  const openExternal = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      await Linking.openURL(url).catch(() =>
        Alert.alert('Could not open link', 'Please try again.'),
      );
    }
  };

  const share = async () => {
    if (!event) return;
    const url = `https://startlineau.com/events/${event.slug ?? event.id}`;
    await Share.share({
      title: event.title,
      message: `${event.title} — ${formatLongDate(event.eventDate)}, ${event.city}. ${url}`,
      url,
    }).catch(() => {});
  };

  if (query.isLoading) {
    return (
      <View style={styles.centered}>
        <LoadingView label="Loading event" />
      </View>
    );
  }

  if (query.isError || !event) {
    return (
      <SafeAreaView style={styles.centered} edges={['top', 'bottom']}>
        <EmptyState
          title="Event not found."
          body={query.isError ? apiErrorMessage(query.error) : 'This event is no longer available.'}
          action={
            <Button
              label="Back to events"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/discover'))}
            />
          }
        />
      </SafeAreaView>
    );
  }

  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(
    `${event.address || event.venue}, ${event.city}, Australia`,
  )}`;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 132 + insets.bottom }}
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          {event.coverImageUrl ? (
            <Image source={{ uri: event.coverImageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <LinearGradient
              colors={['#3c462f', '#20251b', colors.background]}
              style={StyleSheet.absoluteFill}
            />
          )}
          <LinearGradient
            colors={['rgba(20,20,20,0.2)', 'rgba(20,20,20,0.42)', colors.background]}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView edges={['top']} style={styles.heroTop}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/discover'))}
              style={styles.heroButton}>
              <ChevronLeft size={22} color={colors.text} />
            </Pressable>
            <View style={styles.heroActions}>
              <EventSaveButton event={event} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share event"
                onPress={() => void share()}
                style={styles.heroButton}>
                <Share2 size={18} color={colors.text} />
              </Pressable>
            </View>
          </SafeAreaView>

          <View style={styles.heroContent}>
            <View style={styles.disciplineBadge}>
              <AppText variant="meta" style={styles.disciplineBadgeText}>
                {formatDiscipline(event.discipline)}
              </AppText>
            </View>
            <AppText variant="displayItalic" style={styles.title}>
              {event.title}
            </AppText>
            <View style={styles.heroMeta}>
              <View style={styles.heroMetaRow}>
                <MapPin size={14} color={colors.primary} />
                <AppText variant="meta" style={styles.heroMetaText}>
                  {event.venue}, {event.city} {event.state.toUpperCase()}
                </AppText>
              </View>
              <View style={styles.heroMetaRow}>
                <CalendarDays size={14} color={colors.primary} />
                <AppText variant="meta" style={styles.heroMetaText}>
                  {formatDateTime(event.eventDate, event.startTime)}
                </AppText>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.statBand}>
            <View style={styles.statCell}>
              <AppText variant="meta" style={styles.statLabel}>
                From
              </AppText>
              <AppText variant="title" style={styles.statAccent}>
                {formatPrice(event.fromPrice)}
              </AppText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <AppText variant="meta" style={styles.statLabel}>
                Format
              </AppText>
              <AppText variant="title" style={styles.statValue}>
                {event.format || 'Open'}
              </AppText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <AppText variant="meta" style={styles.statLabel}>
                Entered
              </AppText>
              <AppText variant="title" style={styles.statValue}>
                {event.registrationCount.toLocaleString('en-AU')}
              </AppText>
            </View>
          </View>

          {data?.prizePool ? (
            <Card style={styles.prizeCard}>
              <Trophy size={24} color={colors.primary} />
              <View style={styles.flex}>
                <AppText variant="heading" style={styles.statAccent}>
                  {formatMoney(data.prizePool.amount * 100)} prize pool
                </AppText>
                {data.prizePool.details ? (
                  <AppText variant="bodySmall">{data.prizePool.details}</AppText>
                ) : null}
              </View>
            </Card>
          ) : null}

          <View style={styles.section}>
            <AppText variant="eyebrow">The event</AppText>
            <AppText variant="title" style={styles.sectionTitle}>
              Event overview
            </AppText>
            <AppText variant="body" style={styles.description}>
              {stripHtml(event.description) || 'The organiser has not added a description yet.'}
            </AppText>
          </View>

          <View style={styles.section}>
            <AppText variant="eyebrow">The details</AppText>
            <AppText variant="title" style={styles.sectionTitle}>
              Event information
            </AppText>
            <Card style={styles.detailCard}>
              <DetailRow icon={<CalendarDays size={17} color={colors.primary} />} label="Date" value={formatLongDate(event.eventDate)} />
              <DetailRow icon={<Clock size={17} color={colors.primary} />} label="Start time" value={formatTime(event.startTime)} />
              <DetailRow icon={<MapPin size={17} color={colors.primary} />} label="Location" value={`${event.venue}${event.address ? `, ${event.address}` : ''}, ${event.city} ${event.state.toUpperCase()}`} />
              <DetailRow icon={<Users size={17} color={colors.primary} />} label="Format" value={event.format || 'Open'} />
              <DetailRow icon={<Ticket size={17} color={colors.primary} />} label="Divisions" value={Array.isArray(event.categories) && event.categories.length > 0 ? (event.categories as string[]).join(' · ') : 'See event'} />
              {event.cap ? <DetailRow icon={<Users size={17} color={colors.primary} />} label="Capacity" value={`${event.registrationCount} / ${event.cap}`} /> : null}
              {event.minAge != null ? <DetailRow icon={<Users size={17} color={colors.primary} />} label="Minimum age" value={event.minAge === 0 ? 'All ages' : `${event.minAge}+`} /> : null}
            </Card>
            <Button
              label="View on maps"
              variant="outline"
              icon={<MapPin size={16} color={colors.text} />}
              onPress={() => void openExternal(mapsUrl)}
            />
          </View>

          {waves.length > 0 ? (
            <View style={styles.section}>
              <AppText variant="eyebrow">Tickets</AppText>
              <AppText variant="title" style={styles.sectionTitle}>
                Pricing
              </AppText>
              <View style={styles.stack}>
                {waves.map((wave) => {
                  const closes = wave.closes || wave.date;
                  const closed = Boolean(closes && closes < new Date(now).toISOString().slice(0, 10));
                  return (
                    <Card key={`${wave.label}-${closes ?? ''}`} style={[styles.ticketRow, closed ? styles.closed : null]}>
                      <View style={styles.flex}>
                        <AppText variant="heading">{wave.label || 'General entry'}</AppText>
                        <AppText variant="bodySmall">
                          {wave.startTime ? `Starts ${formatTime(wave.startTime)}` : ''}
                          {wave.startTime && closes ? ' · ' : ''}
                          {closes ? `${closed ? 'Closed' : 'Closes'} ${formatLongDate(closes)}` : ''}
                        </AppText>
                      </View>
                      <AppText variant="title" style={closed ? styles.closedPrice : styles.statAccent}>
                        {formatPrice(Number(wave.price ?? 0))}
                      </AppText>
                    </Card>
                  );
                })}
              </View>
            </View>
          ) : null}

          {event.informationPdfs?.length ? (
            <View style={styles.section}>
              <AppText variant="eyebrow">Race pack</AppText>
              <AppText variant="title" style={styles.sectionTitle}>
                Event documents
              </AppText>
              <View style={styles.stack}>
                {event.informationPdfs.map((pdf) => (
                  <Pressable
                    key={pdf.url}
                    onPress={() => void openExternal(pdf.url)}
                    style={({ pressed }) => [styles.pdfRow, pressed ? { opacity: 0.75 } : null]}>
                    <FileText size={18} color={colors.primary} />
                    <AppText variant="bodyMedium" style={styles.flex} numberOfLines={1}>
                      {pdf.label || pdf.name || 'Event information'}
                    </AppText>
                    <ExternalLink size={16} color={colors.muted} />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <AppText variant="eyebrow">Organiser</AppText>
            <AppText variant="title" style={styles.sectionTitle}>
              {data?.organiserName ?? 'Event organiser'}
            </AppText>
            <Card style={styles.organiserCard}>
              <View style={styles.organiserLogo}>
                {event.organiser?.logoUrl ? (
                  <Image
                    source={{ uri: event.organiser.logoUrl }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                  />
                ) : (
                  <AppText variant="title" style={styles.statAccent}>
                    {(data?.organiserName ?? 'S').charAt(0)}
                  </AppText>
                )}
              </View>
              <View style={styles.flex}>
                <AppText variant="heading">{data?.organiserName}</AppText>
                {data?.organiserRating ? (
                  <View style={styles.ratingRow}>
                    <Star size={13} color={colors.primary} fill={colors.primary} />
                    <AppText variant="meta">
                      {data.organiserRating.average.toFixed(1)} · {data.organiserRating.count} review
                      {data.organiserRating.count === 1 ? '' : 's'}
                    </AppText>
                  </View>
                ) : (
                  <AppText variant="bodySmall">Startline event organiser</AppText>
                )}
              </View>
            </Card>
          </View>

          {data?.organiserReviews?.length ? (
            <View style={styles.section}>
              <AppText variant="eyebrow">Athlete reviews</AppText>
              <AppText variant="title" style={styles.sectionTitle}>
                What athletes say
              </AppText>
              <View style={styles.stack}>
                {data.organiserReviews.slice(0, 3).map((review) => (
                  <Card key={review.id}>
                    <View style={styles.ratingRow}>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          size={13}
                          color={index < review.overallRating ? colors.primary : colors.raised}
                          fill={index < review.overallRating ? colors.primary : 'transparent'}
                        />
                      ))}
                    </View>
                    <AppText variant="heading" style={styles.reviewTitle}>
                      {review.title}
                    </AppText>
                    <AppText variant="bodySmall">{stripHtml(review.body)}</AppText>
                    <AppText variant="meta" style={styles.reviewer}>
                      {review.reviewerName}
                    </AppText>
                  </Card>
                ))}
              </View>
            </View>
          ) : null}

          {event.refundPolicy ? (
            <View style={styles.section}>
              <AppText variant="eyebrow">Before you enter</AppText>
              <AppText variant="title" style={styles.sectionTitle}>
                Refund policy
              </AppText>
              <AppText variant="bodySmall">{stripHtml(event.refundPolicy)}</AppText>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.stickyBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {registrationClosed ? (
          <Button label={event.status === 'IN_PROGRESS' ? 'Event in progress' : 'Registration closed'} disabled />
        ) : event.registrationType === 'startline' && openWaves.length > 0 ? (
          <Button
            label={free ? "I'm going" : 'Register now'}
            icon={<Ticket size={18} color={colors.primaryInk} />}
            onPress={() =>
              router.push(`/register/${event.id}${free ? '?rsvp=1' : ''}` as never)
            }
          />
        ) : event.registrationUrl ? (
          <Button
            label="Register now"
            icon={<ExternalLink size={18} color={colors.primaryInk} />}
            onPress={() => void openExternal(event.registrationUrl!)}
          />
        ) : (
          <Button label="Registration unavailable" disabled />
        )}
      </View>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>{icon}</View>
      <View style={styles.flex}>
        <AppText variant="meta" style={styles.statLabel}>
          {label}
        </AppText>
        <AppText variant="bodyMedium">{value}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, backgroundColor: colors.background },
  hero: {
    minHeight: 480,
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  heroActions: { flexDirection: 'row', gap: spacing.sm },
  heroButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,20,20,0.74)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  heroContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  disciplineBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  disciplineBadgeText: { color: colors.primaryInk, fontSize: 9.5 },
  title: { fontSize: 44, lineHeight: 43, letterSpacing: -2 },
  heroMeta: { gap: spacing.sm },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroMetaText: { flex: 1, color: colors.muted },
  body: { paddingHorizontal: spacing.lg },
  statBand: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
  },
  statCell: { flex: 1, paddingHorizontal: spacing.md, gap: 4 },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  statLabel: { color: colors.mutedDark, fontSize: 9 },
  statValue: { fontSize: 17, textTransform: 'capitalize' },
  statAccent: { color: colors.primary },
  prizeCard: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  section: { marginTop: spacing.xxl, gap: spacing.md },
  sectionTitle: { marginTop: -spacing.sm },
  description: { color: colors.muted },
  detailCard: { paddingVertical: spacing.sm },
  detailRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stack: { gap: spacing.sm },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  closed: { opacity: 0.5 },
  closedPrice: { color: colors.muted, textDecorationLine: 'line-through' },
  flex: { flex: 1 },
  pdfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  organiserCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  organiserLogo: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reviewTitle: { marginTop: spacing.sm },
  reviewer: { marginTop: spacing.sm, color: colors.mutedDark },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: 'rgba(20,20,20,0.97)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
