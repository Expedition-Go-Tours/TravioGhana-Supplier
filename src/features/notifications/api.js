import api from "@/lib/axios";
import { parseNotificationsResponse } from "./utils/notificationPresentation";

export async function fetchNotifications(params = {}) {
  const response = await api.get("/notifications", {
    params,
    skipGlobalErrorHandler: true,
  });

  return parseNotificationsResponse(response);
}

/**
 * The badge needs a number, not eight notification bodies. The list endpoint
 * returns both, so every open tab used to download the feed once a minute just
 * to count it.
 */
export async function fetchUnreadCount() {
  const response = await api.get("/notifications/unread-count", {
    skipGlobalErrorHandler: true,
  });
  const payload = response?.data?.data ?? response?.data ?? {};
  return { count: payload.unreadCount ?? payload.count ?? 0 };
}

export function markNotificationAsRead(id) {
  return api.patch(`/notifications/${id}/read`, null, {
    skipGlobalErrorHandler: true,
  });
}

export function markAllNotificationsAsRead() {
  return api.patch("/notifications/mark-all-read", null, {
    skipGlobalErrorHandler: true,
  });
}

export function deleteNotification(id) {
  return api.delete(`/notifications/${id}`, {
    skipGlobalErrorHandler: true,
  });
}
