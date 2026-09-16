const BACKEND_TYPE_TO_UI = {
  BOOKING_CONFIRMED: "booking",
  BOOKING_CANCELLED: "booking",
  BOOKING_STATUS_UPDATED: "booking",
  BOOKING_MODIFIED: "booking",
  BOOKING_AWAITING_CONFIRMATION: "booking",
  BOOKING_PAYMENT_FAILED: "payment",
  PICKUP_UPDATED: "booking",
  PAYMENT_RECEIVED: "payment",
  PAYMENT_COMPLETED: "payment",
  PAYMENT_FAILED: "payment",
  PAYMENT_ACTION_REQUIRED: "payment",
  REFUND_ISSUED: "payment",
  DISPUTE_OPENED: "booking",
  DISPUTE_RESOLVED: "booking",
  REFUND_CLAIM: "payment",
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
  TEAM_INVITE_ACCEPTED: "system",
  TOUR_SUBMITTED: "product",
  TOUR_APPROVED: "product",
  TOUR_FLAGGED: "product",
  DOCUMENT_REJECTED: "alert",
  DOCUMENT_EXPIRY_REMINDER: "alert",
  DOCUMENT_EXPIRED: "alert",
};

function getNotificationRoute(type, data = {}) {
  if (type === "REFUND_CLAIM" && data.claimId) {
    return { path: `/finance?tab=claims&claimId=${data.claimId}`, label: "View Refund Request" };
  }
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
  if (data.disputeId) {
    return { path: "/finance?tab=refunds", label: "View Refund" };
  }
  if (data.conversationId) {
    // Customer conversations: pass customerId so ChatPage auto-selects
    if (data.conversationType === 'SUPPLIER_CUSTOMER' && data.senderId) {
      return { path: `/chat?customerId=${data.senderId}`, label: "View Message" };
    }
    return { path: "/chat", label: "View Message" };
  }

  switch (type) {
    case "BOOKING_CONFIRMED":
    case "BOOKING_CANCELLED":
    case "BOOKING_STATUS_UPDATED":
    case "BOOKING_MODIFIED":
    case "BOOKING_PAYMENT_FAILED":
    case "PICKUP_UPDATED":
      return { path: "/bookings", label: "View Bookings" };
    case "BOOKING_AWAITING_CONFIRMATION":
    case "PAYMENT_FAILED":
    case "PAYMENT_COMPLETED":
    case "PAYMENT_ACTION_REQUIRED":
    case "REFUND_ISSUED":
      return { path: "/bookings", label: "View Booking" };
    case "DISPUTE_OPENED":
    case "DISPUTE_RESOLVED":
      return { path: "/finance?tab=refunds", label: "View Refunds" };
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

