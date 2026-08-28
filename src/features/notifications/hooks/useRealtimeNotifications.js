import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getChatSocket } from "@/features/chat/chatSocket";
import { useAuthStore } from "@/stores/authStore";
import config from "@/config";
import { invalidateNotifications } from "./useNotifications";

/**
 * Subscribes to realtime notification pushes on the shared Socket.IO
 * connection (the backend emits `notification` to `user:<id>`). Keeps the
 * bell, dashboard widget and notifications page in sync without polling or
 * manual refresh. Falls back to the query-level polling whenever the socket
 * is disconnected or the feature flag is disabled.
 */
export function useRealtimeNotifications() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const enabled = config.features.realTimeUpdates !== false;

  useEffect(() => {
    if (!enabled || !userId) return;

    const socket = getChatSocket(userId);
    const markStale = () => {
      invalidateNotifications(queryClient);
    };

    socket.on("notification", markStale);
    socket.on("connect", markStale);

    return () => {
      socket.off("notification", markStale);
      socket.off("connect", markStale);
    };
  }, [enabled, userId, queryClient]);
}