import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAuthToken } from "@/stores/authStore";
import {
  deleteNotification,
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../api";
import { NOTIFICATIONS_QUERY_KEY } from "../constants";

const REFETCH_INTERVAL_MS = 60_000;
const UNREAD_COUNT_KEY = [NOTIFICATIONS_QUERY_KEY, "unread-count"];

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
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

/**
 * The header badge. Polls one number instead of the whole feed, and stops
 * polling in a background tab — the socket already pushes live changes, so a
 * hidden tab has no reason to ask.
 */
export function useUnreadCount() {
  const hasToken = Boolean(getAuthToken());

  return useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: fetchUnreadCount,
    enabled: hasToken,
    refetchInterval: REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

export function invalidateNotifications(queryClient) {
  return queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY] });
}

/**
 * Apply an optimistic change to every cached notification list and to the
 * unread-count query in one pass.
 *
 * Marking a row read used to wait for the server and then refetch every list
 * that shares the key, so the row stayed bold, the badge stayed wrong, and the
 * page's 50-item query redownloaded behind a single click.
 */
function patchNotificationCaches(queryClient, patchList, patchCount) {
  queryClient.setQueriesData({ queryKey: [NOTIFICATIONS_QUERY_KEY] }, (data) => {
    if (!data) return data;
    // The unread-count query is `{ count }`; the list queries carry
    // `{ notifications, unreadCount }`.
    if (typeof data.count === "number" && !data.notifications) {
      return { ...data, count: patchCount(data.count) };
    }
    if (!Array.isArray(data.notifications)) return data;
    const next = patchList(data);
    return next === data ? data : next;
  });
}

async function snapshotNotifications(queryClient) {
  await queryClient.cancelQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY] });
  return queryClient.getQueriesData({ queryKey: [NOTIFICATIONS_QUERY_KEY] });
}

function restoreNotifications(queryClient, previous) {
  for (const [key, value] of previous ?? []) {
    queryClient.setQueryData(key, value);
  }
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => markNotificationAsRead(id),
    onMutate: async (id) => {
      const previous = await snapshotNotifications(queryClient);
      patchNotificationCaches(
        queryClient,
        (data) => {
          const target = data.notifications.find((n) => n.id === id);
          if (!target || target.read) return data;
          return {
            ...data,
            unreadCount: Math.max(0, (data.unreadCount ?? 1) - 1),
            notifications: data.notifications.map((n) =>
              n.id === id ? { ...n, read: true } : n,
            ),
          };
        },
        (count) => Math.max(0, count - 1),
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      restoreNotifications(queryClient, context?.previous);
    },
    onSettled: () => invalidateNotifications(queryClient),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsAsRead(),
    onMutate: async () => {
      const previous = await snapshotNotifications(queryClient);
      patchNotificationCaches(
        queryClient,
        (data) => ({
          ...data,
          unreadCount: 0,
          notifications: data.notifications.map((n) =>
            n.read ? n : { ...n, read: true },
          ),
        }),
        () => 0,
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      restoreNotifications(queryClient, context?.previous);
    },
    onSettled: () => invalidateNotifications(queryClient),
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => deleteNotification(id),
    onMutate: async (id) => {
      const previous = await snapshotNotifications(queryClient);
      patchNotificationCaches(
        queryClient,
        (data) => {
          const target = data.notifications.find((n) => n.id === id);
          if (!target) return data;
          return {
            ...data,
            unreadCount: target.read
              ? data.unreadCount
              : Math.max(0, (data.unreadCount ?? 1) - 1),
            notifications: data.notifications.filter((n) => n.id !== id),
          };
        },
        (count) => count,
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      restoreNotifications(queryClient, context?.previous);
    },
    onSettled: () => invalidateNotifications(queryClient),
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
