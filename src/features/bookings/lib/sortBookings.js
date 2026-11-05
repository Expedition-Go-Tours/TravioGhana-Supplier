/**
 * Ordering for the Bookings list.
 *
 * The list is normally newest booking first. The Refunds tab is the exception:
 * what matters there is when the money went back — a refund issued today
 * belongs above a booking made yesterday. Refunded bookings carry
 * `refundedAt`; pending or failed ones don't, so they fall back to when the
 * booking was cancelled.
 *
 * The server applies the same ordering, because sorting only the current page
 * would put the newest refund on page 2.
 */
export function sortBookings(bookings, tab) {
  const rows = [...(bookings || [])];

  if (tab === "REFUNDS") {
    const when = (booking) =>
      new Date(booking.refundedAt || booking.cancelledAt || booking.bookingDate || 0).getTime();
    return rows.sort((a, b) => when(b) - when(a));
  }

  return rows.sort(
    (a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime(),
  );
}
