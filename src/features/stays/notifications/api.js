/**
 * Stays notifications API — the Stays twin of `features/notifications/api.js`.
 *
 * Notifications are per-account alerts, but the Stays bell must never mix in
 * tour activity: the live branch uses the Stays-only endpoints that force the
 * STAYS product domain. In mock mode the whole inbox reads and writes the Stays
 * mock so the workspace keeps working without a backend.
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
  const response = await api.get("/stays/supplier/notifications", { ...requestConfig, params });
  return parseStaysNotificationsResponse(response);
}

export function markStaysNotificationAsRead(id) {
  if (staysUsesMockData) return staysMock.markNotificationRead(id);
  return api.patch(`/stays/supplier/notifications/${id}/read`, null, requestConfig);
}

export function markAllStaysNotificationsAsRead() {
  if (staysUsesMockData) return staysMock.markAllNotificationsRead();
  return api.patch("/stays/supplier/notifications/mark-all-read", null, requestConfig);
}

export function deleteStaysNotification(id) {
  if (staysUsesMockData) return staysMock.deleteNotification(id);
  return api.delete(`/stays/supplier/notifications/${id}`, requestConfig);
}
