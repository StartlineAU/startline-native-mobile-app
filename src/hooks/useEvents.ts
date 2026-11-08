import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiRequest } from '@/lib/api';
import type {
  EventDetailResponse,
  EventListResponse,
  FollowingOrganiser,
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

export function useEventDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['event', id],
    enabled: Boolean(id),
    queryFn: ({ signal }) =>
      apiRequest<EventDetailResponse>(`/api/events/${encodeURIComponent(id!)}/detail`, {
        signal,
        auth: 'optional',
      }),
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
