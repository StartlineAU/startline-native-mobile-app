import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { CalendarDays, Heart, MapPin } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useAuth } from '@/context/AuthContext';
import { useSavedEventIds, useToggleSavedEvent } from '@/hooks/useEvents';
import { formatDateRange, formatPrice } from '@/lib/format';
import { colors, fonts, radius, spacing } from '@/theme/tokens';
import type { PublicEvent } from '@/types/api';

function saveEvent(event: PublicEvent, saved: boolean, toggle: ReturnType<typeof useToggleSavedEvent>) {
  if (!saved) {
    toggle.mutate({ eventId: event.id, saved: false });
    return;
  }
  toggle.mutate({ eventId: event.id, saved: true });
}

export function EventSaveButton({ event }: { event: PublicEvent }) {
  const auth = useAuth();
  const savedQuery = useSavedEventIds(auth.status === 'authenticated');
  const toggle = useToggleSavedEvent();
  const saved = savedQuery.data?.includes(event.id) ?? false;

  const onPress = () => {
    if (auth.status !== 'authenticated') {
      router.push({
        pathname: '/auth/sign-in',
        params: { returnTo: `/events/${event.slug ?? event.id}` },
      });
      return;
    }
    saveEvent(event, saved, toggle);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? 'Remove saved event' : 'Save event'}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.save,
        saved ? styles.saveActive : null,
        pressed ? { opacity: 0.7 } : null,
      ]}>
      <Heart
        size={17}
        color={saved ? colors.primary : colors.text}
        fill={saved ? colors.primary : 'transparent'}
        strokeWidth={2}
      />
    </Pressable>
  );
}

export function EventCard({
  event,
  horizontal = false,
}: {
  event: PublicEvent;
  horizontal?: boolean;
}) {
  const eventHref = `/events/${event.slug ?? event.id}` as const;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${event.eventDate}, ${event.city}`}
      onPress={() => router.push(eventHref)}
      style={({ pressed }) => [
        styles.card,
        horizontal ? styles.horizontal : null,
        pressed ? styles.pressed : null,
      ]}>
      <View style={styles.imageWrap}>
        {event.coverImageUrl ? (
          <Image
            source={{ uri: event.coverImageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={220}
          />
        ) : (
          <LinearGradient
            colors={['#30362a', '#1F1F1F']}
            style={[styles.image, styles.placeholder]}>
            <AppText variant="eyebrow">Startline</AppText>
            <AppText variant="titleItalic" style={styles.placeholderTitle}>
              {event.discipline}
            </AppText>
          </LinearGradient>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(20,20,20,0.92)']}
          style={styles.imageScrim}
        />
        <View style={styles.imageTop}>
          <View style={styles.disciplinePill}>
            <AppText variant="meta" style={styles.disciplineText}>
              {event.discipline}
            </AppText>
          </View>
          <EventSaveButton event={event} />
        </View>
        <View style={styles.imageBottom}>
          <AppText variant="meta" style={styles.price}>
            {formatPrice(event.fromPrice)}
          </AppText>
        </View>
      </View>

      <View style={styles.body}>
        <AppText variant="title" numberOfLines={2} style={styles.title}>
          {event.title}
        </AppText>
        <View style={styles.metaRow}>
          <CalendarDays size={13} color={colors.primary} strokeWidth={2} />
          <AppText variant="meta" numberOfLines={1} style={styles.metaText}>
            {event.endDate && event.endDate !== event.eventDate
              ? formatDateRange(event.eventDate, event.endDate)
              : new Date(`${event.eventDate}T00:00:00`).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'short',
                })}
          </AppText>
        </View>
        <View style={styles.metaRow}>
          <MapPin size={13} color={colors.primary} strokeWidth={2} />
          <AppText variant="meta" numberOfLines={1} style={styles.metaText}>
            {event.city}, {event.state.toUpperCase()}
          </AppText>
        </View>
        {event.organiser?.orgName ? (
          <AppText variant="bodySmall" numberOfLines={1} style={styles.organiser}>
            {event.organiser.orgName}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  horizontal: {
    width: 282,
  },
  pressed: {
    opacity: 0.88,
  },
  imageWrap: {
    aspectRatio: 16 / 8.7,
    position: 'relative',
    backgroundColor: colors.surfaceAlt,
  },
  image: {
    ...StyleSheet.absoluteFill,
  },
  placeholder: {
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    padding: spacing.lg,
    gap: 4,
  },
  placeholderTitle: {
    color: colors.text,
  },
  imageScrim: {
    ...StyleSheet.absoluteFill,
  },
  imageTop: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  disciplinePill: {
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  disciplineText: {
    color: colors.primaryInk,
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 1.15,
  },
  save: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(20,20,20,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  imageBottom: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  price: {
    color: colors.primary,
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 1.1,
  },
  body: {
    padding: spacing.lg,
    gap: 7,
  },
  title: {
    fontSize: 20,
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    flex: 1,
  },
  organiser: {
    marginTop: 2,
    color: colors.mutedDark,
  },
});
