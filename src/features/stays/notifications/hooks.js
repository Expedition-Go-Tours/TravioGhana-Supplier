/**
 * Stays notifications hooks — the Stays twin of
 * `features/notifications/hooks/useNotifications.js`.
 *
 * Query key is `["stays", "notifications", params]` so the shared bell never
 * mixes the two workspaces' inboxes. In mock mode the query runs without an
 * auth token, like every other Stays page.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAuthToken } from "@/stores/authStore";
import { staysUsesMockData } from "../api";
import {
  deleteStaysNotification,
  fetchStaysNotifications,
  markAllStaysNotificationsAsRead,
  markStaysNotificationAsRead,
} from "./api";
import { STAYS_NOTIFICATIONS_QUERY_KEY } from "./constants";

const REFETCH_INTERVAL_MS = 60_000;

function notificationsQueryKey(params = {}) {
  return [...STAYS_NOTIFICATIONS_QUERY_KEY, params];
}

export function useStaysNotifications(params = {}, options = {}) {
  const enabled = staysUsesMockData || Boolean(getAuthToken());

  return useQuery({
    queryKey: notificationsQueryKey(params),
    queryFn: () => fetchStaysNotifications(params),
    enabled: enabled && (options.enabled ?? true),
    refetchInterval: options.refetchInterval ?? REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

export function invalidateStaysNotifications(queryClient) {
  return queryClient.invalidateQueries({
    queryKey: STAYS_NOTIFICATIONS_QUERY_KEY,
  });
}

export function useMarkStaysNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => markStaysNotificationAsRead(id),
    onSuccess: () => invalidateStaysNotifications(queryClient),
  });
}

export function useMarkAllStaysNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllStaysNotificationsAsRead(),
    onSuccess: () => invalidateStaysNotifications(queryClient),
  });
}

export function useDeleteStaysNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => deleteStaysNotification(id),
    onSuccess: () => invalidateStaysNotifications(queryClient),
  });
}

export function useDeleteAllStaysNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map((id) => deleteStaysNotification(id)));
    },
    onSuccess: () => invalidateStaysNotifications(queryClient),
  });
}
