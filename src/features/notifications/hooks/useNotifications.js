import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAuthToken } from "@/stores/authStore";
import {
  deleteNotification,
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../api";
import { NOTIFICATIONS_QUERY_KEY } from "../constants";

const REFETCH_INTERVAL_MS = 60_000;

function notificationsQueryKey(params = {}) {
  return [NOTIFICATIONS_QUERY_KEY, params];
}

export function useNotifications(params = {}, options = {}) {
  const hasToken = Boolean(getAuthToken());

  return useQuery({
    queryKey: notificationsQueryKey(params),
    queryFn: () => fetchNotifications(params),
    enabled: hasToken && (options.enabled ?? true),
    refetchInterval: options.refetchInterval ?? REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

export function invalidateNotifications(queryClient) {
  return queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY] });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => markNotificationAsRead(id),
    onSuccess: () => invalidateNotifications(queryClient),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsAsRead(),
    onSuccess: () => invalidateNotifications(queryClient),
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => deleteNotification(id),
    onSuccess: () => invalidateNotifications(queryClient),
  });
}

export function useDeleteAllNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map((id) => deleteNotification(id)));
    },
    onSuccess: () => invalidateNotifications(queryClient),
  });
}
