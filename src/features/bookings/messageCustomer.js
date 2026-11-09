/**
 * Where "Message customer" goes.
 *
 * A registered customer has a real conversation, so the button deep-links into
 * chat. A guest checkout has no `customerId` and therefore no thread; the
 * backend gives the supplier a working relay address instead, so the button
 * mails that address directly.
 */
export function mailtoHrefFor(booking) {
  if (!booking?.contactEmail) return null;
  const reference = booking.bookingNumber || booking.id || "";
  const subject = encodeURIComponent(`Booking ${reference}`.trim());
  return `mailto:${booking.contactEmail}?subject=${subject}`;
}
