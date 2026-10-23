/**
 * Customer rows for the header search palette.
 *
 * The palette could jump to pages and products but had no notion of people, so
 * searching a customer's name found nothing even when they had bookings. The
 * data comes from the same server-side booking search the Bookings page uses
 * (`GET /bookings/supplier/bookings?search=`), which matches booking number,
 * customer name, customer email and tour title.
 *
 * Two honesty rules:
 *
 *  - NO FABRICATED COUNTS. The endpoint returns a page of bookings, not a
 *    per-customer total, so "3 bookings" would be "3 of however many we
 *    happened to fetch". The row shows what is true: the customer's email and
 *    their most relevant activity date.
 *  - ONE ROW PER PERSON. Several bookings in the sample collapse to a single
 *    customer row — searching a name must not return the same face five times.
 */

/** A booking row as `mapBookingRow` produces it (see features/bookings/api). */
function activityOf(row) {
  return {
    travelDate: row.travelDate || null,
    tourName: row.tourName || "",
    bookingNumber: row.bookingNumber || "",
    bookingId: row.id || "",
  };
}

function isFuture(iso) {
  return Boolean(iso) && new Date(iso).getTime() > Date.now();
}

/**
 * The activity line: the next upcoming trip if there is one (that is what a
 * supplier is about to have to deal with), else the most recent past trip.
 */
export function customerActivityLine(bookings) {
  const upcoming = bookings
    .filter((b) => isFuture(b.travelDate))
    .sort((a, b) => new Date(a.travelDate) - new Date(b.travelDate))[0];
  const chosen = upcoming
    || [...bookings]
      .filter((b) => b.travelDate)
      .sort((a, b) => new Date(b.travelDate) - new Date(a.travelDate))[0];
  if (!chosen) return "";

  const date = new Date(chosen.travelDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${upcoming ? "Next" : "Last"}: ${date}${chosen.tourName ? ` · ${chosen.tourName}` : ""}`;
}

/** The one-line subtitle: email first (it is what separates two "Kwames"). */
export function customerSubtitle(customer) {
  const activity = customerActivityLine(customer.bookings || []);
  return [customer.email, activity].filter(Boolean).join(" · ");
}

/**
 * Collapse a page of booking rows into distinct customers, keeping every
 * booking of theirs that was in the sample (the activity line picks from
 * them). Order is preserved — the server already ranked the matches.
 */
export function groupCustomerResults(rows) {
  const byCustomer = new Map();
  for (const row of rows || []) {
    const key = row.customerId || row.customerEmail || row.customerName;
    if (!key) continue;

    const existing = byCustomer.get(key);
    if (existing) {
      existing.bookings.push(activityOf(row));
      continue;
    }
    byCustomer.set(key, {
      id: row.customerId || "",
      name: row.customerName || "Unknown customer",
      email: row.customerEmail || "",
      bookings: [activityOf(row)],
    });
  }

  return [...byCustomer.values()].map((customer) => ({
    ...customer,
    subtitle: customerSubtitle(customer),
  }));
}

/**
 * Where a customer row goes: their bookings, scoped to that CUSTOMER.
 *
 * It used to deep-link with `?search=<email>`, but the address the palette now
 * shows is the RELAY (the customer's real inbox never reaches a supplier
 * payload), and the server's search matches the real address — so searching
 * for the relay would find nothing. `customerId` is exact and needs no name
 * matching, which also means two "Kwames" never share a link.
 */
export function customerBookingsPath(customer) {
  if (customer.id) return `/bookings?customerId=${encodeURIComponent(customer.id)}`;
  // Legacy rows without an id: fall back to a name search.
  return `/bookings?search=${encodeURIComponent(customer.name || "")}`;
}

/** The secondary action: open the conversation with this customer. */
export function customerChatPath(customer) {
  return customer.id ? `/chat?customerId=${encodeURIComponent(customer.id)}` : "/chat";
}
