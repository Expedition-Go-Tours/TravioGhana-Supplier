import api from "@/lib/axios";
import { parseNotificationsResponse } from "./utils/notificationPresentation";

export async function fetchNotifications(params = {}) {
  const response = await api.get("/notifications", {
    params,
    skipGlobalErrorHandler: true,
  });

  return parseNotificationsResponse(response);
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
