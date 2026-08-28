const BACKEND_TYPE_TO_UI = {
  BOOKING_CONFIRMED: "booking",
  BOOKING_CANCELLED: "booking",
  PAYMENT_RECEIVED: "payment",
  REVIEW_RECEIVED: "review",
  SUPPLIER_APPROVED: "system",
  SUPPLIER_REJECTED: "alert",
  PAYOUT_PROCESSED: "payment",
  PAYOUT_APPROVED: "payment",
  PAYOUT_COMPLETED: "payment",
  PAYOUT_REQUEST_SUBMITTED: "payment",
  PAYOUT_REQUEST_APPROVED: "payment",
  PAYOUT_REQUEST_REJECTED: "alert",
  SYSTEM_ALERT: "system",
  NEW_MESSAGE: "message",
  TOUR_SUBMITTED: "product",
  TOUR_APPROVED: "product",
  TOUR_FLAGGED: "product",
  DOCUMENT_REJECTED: "alert",
  DOCUMENT_EXPIRY_REMINDER: "alert",
  DOCUMENT_EXPIRED: "alert",
};

function getNotificationRoute(type, data = {}) {
  if (data.bookingId) {
    return { path: `/bookings?bookingId=${data.bookingId}`, label: "View Booking" };
  }
  if (data.reviewId) {
    return { path: `/reviews?reviewId=${data.reviewId}`, label: "View Review" };
  }
  if (data.tourId) {
    return { path: `/products/${data.tourId}`, label: "View Product" };
  }
  if (data.payoutId) {
    return { path: `/finance?tab=payouts&payoutId=${data.payoutId}`, label: "View Payout" };
  }
  if (data.payoutRequestId) {
    return { path: `/finance?tab=requests`, label: "View Payout Request" };
  }
  if (data.conversationId) {
    return { path: "/chat", label: "View Message" };
  }

  switch (type) {
    case "BOOKING_CONFIRMED":
    case "BOOKING_CANCELLED":
      return { path: "/bookings", label: "View Bookings" };
    case "REVIEW_RECEIVED":
      return { path: "/reviews", label: "View Reviews" };
    case "PAYMENT_RECEIVED":
    case "PAYOUT_PROCESSED":
    case "PAYOUT_APPROVED":
    case "PAYOUT_COMPLETED":
      return { path: "/finance", label: "View Finance" };
    case "PAYOUT_REQUEST_SUBMITTED":
    case "PAYOUT_REQUEST_APPROVED":
    case "PAYOUT_REQUEST_REJECTED":
      return { path: "/finance?tab=requests", label: "View Payout Requests" };
    case "SUPPLIER_APPROVED":
    case "SUPPLIER_REJECTED":
      return { path: "/supplier/status", label: "View Status" };
    case "TOUR_SUBMITTED":
    case "TOUR_APPROVED":
    case "TOUR_FLAGGED":
      return { path: "/products", label: "View Products" };
    case "DOCUMENT_REJECTED":
    case "DOCUMENT_EXPIRY_REMINDER":
    case "DOCUMENT_EXPIRED":
      return { path: "/supplier/status", label: "View Status" };
    case "SYSTEM_ALERT":
      return { path: "/finance", label: "View Finance" };
    case "NEW_MESSAGE":
      return { path: "/chat", label: "View Message" };
    default:
      return { path: "/notifications", label: "View Notifications" };
  }
}

export function mapBackendNotification(notification) {
  const route = getNotificationRoute(notification.type, notification.data || {});

  return {
    id: notification.id,
    type: BACKEND_TYPE_TO_UI[notification.type] || "system",
    title: notification.title,
    message: notification.message,
    date: notification.createdAt,
    read: Boolean(notification.read),
    action: route.path,
    actionLabel: route.label,
    backendType: notification.type,
    data: notification.data || {},
  };
}

export function parseNotificationsResponse(response) {
  const payload = response?.data?.data ?? response?.data ?? {};
  const notifications = Array.isArray(payload.notifications) ? payload.notifications : [];

  return {
    notifications: notifications.map(mapBackendNotification),
    unreadCount: payload.unreadCount ?? payload.pagination?.unreadCount ?? 0,
    pagination: payload.pagination ?? null,
  };
}

