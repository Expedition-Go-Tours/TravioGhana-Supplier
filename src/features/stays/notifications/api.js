/**
 * Stays notifications API — the Stays twin of `features/notifications/api.js`.
 *
 * Notifications are per-account alerts, so the live endpoints are the same
 * shared ones; in mock mode the whole inbox reads and writes the Stays mock so
 * the workspace keeps working without a backend.
 */
import api from "@/lib/axios";
import { staysMock } from "../mock/store";
import { staysUsesMockData } from "../api";
import { mapStaysNotification, parseStaysNotificationsResponse } from "./presentation";

const requestConfig = { skipGlobalErrorHandler: true };

export async function fetchStaysNotifications(params = {}) {
  if (staysUsesMockData) {
    const payload = await staysMock.listNotifications(params);
    return {
      notifications: (payload.notifications || []).map(mapStaysNotification),
      unreadCount: payload.unreadCount ?? 0,
    };
  }
  const response = await api.get("/notifications", { ...requestConfig, params });
  return parseStaysNotificationsResponse(response);
}

export function markStaysNotificationAsRead(id) {
  if (staysUsesMockData) return staysMock.markNotificationRead(id);
  return api.patch(`/notifications/${id}/read`, null, requestConfig);
}

export function markAllStaysNotificationsAsRead() {
  if (staysUsesMockData) return staysMock.markAllNotificationsRead();
  return api.patch("/notifications/mark-all-read", null, requestConfig);
}

export function deleteStaysNotification(id) {
  if (staysUsesMockData) return staysMock.deleteNotification(id);
  return api.delete(`/notifications/${id}`, requestConfig);
}
