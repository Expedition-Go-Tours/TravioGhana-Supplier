/**
 * Stays notification presentation — the Stays twin of
 * `features/notifications/utils/notificationPresentation.js`.
 *
 * The backend payload is the same account-level shape; what changes in the
 * Stays workspace is where each notification LANDS: bookings, reviews, finance,
 * properties and the customers inbox all have Stays routes. The mapping keeps
 * the cancellation-decision copy logic identical so admin decisions read the
 * same in both workspaces.
 */
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
  PAYOUT_SCHEDULE_UPDATED: "payment",
  SYSTEM_ALERT: "system",
  NEW_MESSAGE: "message",
  TEAM_INVITE_ACCEPTED: "system",
  // Listing events — the backend has shipped both naming families, so both
  // resolve to the "Property" type in the Stays workspace.
  TOUR_SUBMITTED: "product",
  TOUR_APPROVED: "product",
  TOUR_FLAGGED: "product",
  STAY_SUBMITTED: "product",
  STAY_APPROVED: "product",
  STAY_FLAGGED: "product",
  PROPERTY_SUBMITTED: "product",
  PROPERTY_APPROVED: "product",
  PROPERTY_FLAGGED: "product",
  DOCUMENT_REJECTED: "alert",
  DOCUMENT_EXPIRY_REMINDER: "alert",
  DOCUMENT_EXPIRED: "alert",
  // Supplier cancellation approval flow (admin decided on a parked request).
  CANCELLATION_REQUEST_APPROVED: "cancellation_approved",
  CANCELLATION_REQUEST_REJECTED: "cancellation_rejected",
};

const CANCELLATION_DECISION_TYPES = [
  "CANCELLATION_REQUEST_APPROVED",
  "CANCELLATION_REQUEST_REJECTED",
];

function getStaysNotificationRoute(type, data = {}) {
  if (CANCELLATION_DECISION_TYPES.includes(type)) {
    if (data.bookingId) {
      return { path: `/stays/bookings?bookingId=${data.bookingId}`, label: "View booking" };
    }
    if (data.bookingUrl) {
      return { path: data.bookingUrl, label: "View booking" };
    }
  }
  if (type === "REFUND_CLAIM" && data.claimId) {
    return { path: `/stays/finance?tab=claims&claimId=${data.claimId}`, label: "View Refund Request" };
  }
  if (data.bookingId) {
    return { path: `/stays/bookings?bookingId=${data.bookingId}`, label: "View Booking" };
  }
  if (data.reviewId) {
    return { path: `/stays/reviews?reviewId=${data.reviewId}`, label: "View Review" };
  }
  if (data.propertyId || data.tourId) {
    const id = data.propertyId || data.tourId;
    return { path: `/stays/properties/${id}`, label: "View Property" };
  }
  if (data.payoutId) {
    return { path: `/stays/finance?tab=payouts&payoutId=${data.payoutId}`, label: "View Payout" };
  }
  if (data.payoutRequestId) {
    return { path: "/stays/finance?tab=requests", label: "View Payout Request" };
  }
  if (data.disputeId) {
    return { path: "/stays/finance?tab=refunds", label: "View Refund" };
  }
  if (data.conversationId) {
    return { path: `/stays/customers?conversation=${data.conversationId}`, label: "View Message" };
  }

  switch (type) {
    case "BOOKING_CONFIRMED":
    case "BOOKING_CANCELLED":
    case "BOOKING_STATUS_UPDATED":
    case "BOOKING_MODIFIED":
    case "BOOKING_PAYMENT_FAILED":
    case "PICKUP_UPDATED":
      return { path: "/stays/bookings", label: "View Bookings" };
    case "BOOKING_AWAITING_CONFIRMATION":
    case "PAYMENT_FAILED":
    case "PAYMENT_COMPLETED":
    case "PAYMENT_ACTION_REQUIRED":
    case "REFUND_ISSUED":
      return { path: "/stays/bookings", label: "View Booking" };
    case "DISPUTE_OPENED":
    case "DISPUTE_RESOLVED":
      return { path: "/stays/finance?tab=refunds", label: "View Refunds" };
    case "REVIEW_RECEIVED":
      return { path: "/stays/reviews", label: "View Reviews" };
    case "PAYMENT_RECEIVED":
    case "PAYOUT_PROCESSED":
    case "PAYOUT_APPROVED":
    case "PAYOUT_COMPLETED":
    case "PAYOUT_SCHEDULE_UPDATED":
      return { path: "/stays/finance", label: "View Finance" };
    case "PAYOUT_REQUEST_SUBMITTED":
    case "PAYOUT_REQUEST_APPROVED":
    case "PAYOUT_REQUEST_REJECTED":
      return { path: "/stays/finance?tab=requests", label: "View Payout Requests" };
    case "SUPPLIER_APPROVED":
    case "SUPPLIER_REJECTED":
      return { path: "/supplier/status", label: "View Status" };
    case "DOCUMENT_REJECTED":
    case "DOCUMENT_EXPIRY_REMINDER":
    case "DOCUMENT_EXPIRED":
      return { path: "/stays/verification", label: "View Verification" };
    case "SYSTEM_ALERT":
      return { path: "/stays/finance", label: "View Finance" };
    case "NEW_MESSAGE":
      return { path: "/stays/customers", label: "View Message" };
    case "TOUR_SUBMITTED":
    case "TOUR_APPROVED":
    case "TOUR_FLAGGED":
    case "STAY_SUBMITTED":
    case "STAY_APPROVED":
    case "STAY_FLAGGED":
    case "PROPERTY_SUBMITTED":
    case "PROPERTY_APPROVED":
    case "PROPERTY_FLAGGED":
      return { path: "/stays/properties", label: "View Properties" };
    default:
      return { path: "/stays/notifications", label: "View Notifications" };
  }
}

function cancellationDecisionCopy(type, data = {}) {
  const approved = type === "CANCELLATION_REQUEST_APPROVED";
  const bookingNumber = data.bookingNumber ? ` for booking ${data.bookingNumber}` : "";
  const propertyTitle = data.propertyName ? ` (${data.propertyName})` : "";
  const note = data.note ? ` Note: ${data.note}` : "";
  return {
    title: approved ? "Cancellation approved" : "Cancellation rejected",
    message: approved
      ? `Your cancellation request${bookingNumber}${propertyTitle} was approved. The booking is now cancelled and the guest has been notified.`
      : `Your cancellation request${bookingNumber}${propertyTitle} was rejected. The booking stays as it is.${note}`,
  };
}

export function mapStaysNotification(notification) {
  const data = notification.data || {};
  const route = getStaysNotificationRoute(notification.type, data);
  const isCancellationDecision = CANCELLATION_DECISION_TYPES.includes(
    notification.type
  );
  const fallback = isCancellationDecision
    ? cancellationDecisionCopy(notification.type, data)
    : null;

  return {
    id: notification.id,
    type: BACKEND_TYPE_TO_UI[notification.type] || "system",
    title: notification.title || fallback?.title || "",
    message: notification.message || fallback?.message || "",
    date: notification.createdAt,
    read: Boolean(notification.read),
    action: route.path,
    actionLabel: route.label,
    backendType: notification.type,
    data,
  };
}

export function parseStaysNotificationsResponse(response) {
  const payload = response?.data?.data ?? response?.data ?? {};
  const notifications = Array.isArray(payload.notifications) ? payload.notifications : [];

  return {
    notifications: notifications.map(mapStaysNotification),
    unreadCount: payload.unreadCount ?? payload.pagination?.unreadCount ?? 0,
    pagination: payload.pagination ?? null,
  };
}
