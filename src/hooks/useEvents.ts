import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiRequest } from '@/lib/api';
import type {
  EventDetailResponse,
  EventListResponse,
  FollowingOrganiser,
  PublicEvent,
  PublicWave,
  UserNotification,
  UserRegistration,
} from '@/types/api';

export function useEventList(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const query = search.toString();
  return useQuery({
    queryKey: ['events', query],
    queryFn: ({ signal }) =>
      apiRequest<EventListResponse>(`/api/events${query ? `?${query}` : ''}`, {
        signal,
        auth: 'optional',
      }),
  });
}

export function useInfiniteEventList(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const query = search.toString();
  return useInfiniteQuery({
    queryKey: ['events-infinite', query],
    initialPageParam: 1,
    queryFn: ({ signal, pageParam }) => {
      const pageSearch = new URLSearchParams(query);
      pageSearch.set('page', String(pageParam));
      return apiRequest<EventListResponse>(`/api/events?${pageSearch.toString()}`, {
        signal,
        auth: 'optional',
      });
    },
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  });
}

type RawDetailEvent = Partial<PublicEvent> & {
  date?: string;
  time?: string;
  location?: string;
  image?: string;
  ticketDrops?: PublicWave[];
};

/**
 * The detail endpoint returns the web app's UserEvent shape (ticketDrops,
 * date, time, location), while the listing returns PublicEvent (waves,
 * eventDate, venue). Normalise it once here so every native screen has one
 * event shape.
 */
function normaliseDetailEvent(raw: RawDetailEvent): PublicEvent {
  return {
    ...raw,
    eventDate: raw.eventDate ?? raw.date ?? '',
    startTime: raw.startTime ?? raw.time ?? '',
    endTime: raw.endTime ?? raw.time ?? '',
    venue: raw.venue ?? raw.location ?? '',
    waves: Array.isArray(raw.waves)
      ? raw.waves
      : Array.isArray(raw.ticketDrops)
        ? raw.ticketDrops
        : [],
    coverImageUrl: raw.coverImageUrl ?? raw.image ?? null,
    photos: Array.isArray(raw.photos) ? raw.photos : [],
    categories: Array.isArray(raw.categories) ? raw.categories : [],
    informationPdfs: Array.isArray(raw.informationPdfs) ? raw.informationPdfs : [],
    registrationCount: raw.registrationCount ?? 0,
    fromPrice: raw.fromPrice ?? null,
    cap: raw.cap ?? null,
    minAge: raw.minAge ?? null,
    organiser: raw.organiser ?? {
      id: raw.organiserId ?? '',
      orgName: null,
      logoUrl: null,
    },
    organiserId: raw.organiserId ?? raw.organiser?.id ?? '',
    registrationType: raw.registrationType ?? 'startline',
    registrationUrl: raw.registrationUrl ?? null,
    feeStructure: raw.feeStructure ?? 'athlete',
    refundPolicy: raw.refundPolicy ?? null,
    refundTiers: raw.refundTiers ?? null,
    description: raw.description ?? null,
    status: raw.status ?? 'APPROVED',
    title: raw.title ?? 'Event',
    discipline: raw.discipline ?? '',
    city: raw.city ?? '',
    state: raw.state ?? '',
    format: raw.format ?? '',
    level: raw.level ?? '',
    slug: raw.slug ?? null,
    latitude: raw.latitude ?? null,
    longitude: raw.longitude ?? null,
    address: raw.address ?? null,
    endDate: raw.endDate ?? null,
    timeZone: raw.timeZone ?? 'Australia/Sydney',
    startsAtUtc: raw.startsAtUtc ?? null,
    endsAtUtc: raw.endsAtUtc ?? null,
    extras: raw.extras ?? null,
    id: raw.id ?? '',
  };
}

export function useEventDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['event', id],
    enabled: Boolean(id),
    queryFn: async ({ signal }) => {
      const result = await apiRequest<
        Omit<EventDetailResponse, 'event'> & { event: RawDetailEvent }
      >(`/api/events/${encodeURIComponent(id!)}/detail`, {
        signal,
        auth: 'optional',
      });
      return {
        ...result,
        event: normaliseDetailEvent(result.event),
      } satisfies EventDetailResponse;
    },
  });
}

export function useEventAvailability(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event-availability', eventId],
    enabled: Boolean(eventId),
    queryFn: ({ signal }) =>
      apiRequest<import('@/types/api').AvailabilityResponse>(
        `/api/events/${encodeURIComponent(eventId!)}/availability`,
        { signal, auth: 'none' },
      ),
  });
}

export function useSavedEventIds(enabled: boolean) {
  return useQuery({
    queryKey: ['saved-events'],
    enabled,
    queryFn: ({ signal }) =>
      apiRequest<{ eventIds: string[] }>('/api/user/saved-events', {
        signal,
        auth: 'required',
      }).then((result) => result.eventIds),
  });
}

export function useToggleSavedEvent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, saved }: { eventId: string; saved: boolean }) =>
      apiRequest<{ saved: boolean }>('/api/user/saved-events', {
        method: saved ? 'DELETE' : 'POST',
        body: { eventId },
        auth: 'required',
      }),
    onMutate: async ({ eventId, saved }) => {
      await client.cancelQueries({ queryKey: ['saved-events'] });
      const previous = client.getQueryData<string[]>(['saved-events']) ?? [];
      client.setQueryData<string[]>(
        ['saved-events'],
        saved ? previous.filter((id) => id !== eventId) : [eventId, ...previous],
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) client.setQueryData(['saved-events'], context.previous);
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ['saved-events'] });
    },
  });
}

export function useUserRegistrations(enabled: boolean) {
  return useQuery({
    queryKey: ['user-registrations'],
    enabled,
    queryFn: ({ signal }) =>
      apiRequest<{ registrations: UserRegistration[] }>('/api/user/registrations', {
        signal,
        auth: 'required',
      }).then((result) => result.registrations),
  });
}

export function useUserNotifications(enabled: boolean) {
  return useQuery({
    queryKey: ['user-notifications'],
    enabled,
    queryFn: ({ signal }) =>
      apiRequest<{ notifications: UserNotification[]; unreadCount: number }>(
        '/api/user/notifications',
        { signal, auth: 'required' },
      ),
  });
}

export function useFollowing(enabled: boolean) {
  return useQuery({
    queryKey: ['user-following'],
    enabled,
    queryFn: ({ signal }) =>
      apiRequest<{ organisers: FollowingOrganiser[] }>('/api/user/following', {
        signal,
        auth: 'required',
      }).then((result) => result.organisers),
  });
}

export function useSavedEventsHydrated(ids: string[] | undefined) {
  const unique = [...new Set(ids ?? [])];
  return useQuery({
    queryKey: ['events-by-ids', unique.sort().join(',')],
    enabled: unique.length > 0,
    queryFn: ({ signal }) =>
      apiRequest<EventListResponse>(
        `/api/events?ids=${encodeURIComponent(unique.join(','))}`,
        { signal, auth: 'optional' },
      ).then((result) => result.events),
  });
}
