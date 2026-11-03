import { formatTravelDate } from "@/lib/utils";

/**
 * Customer rows for the header search palette.
 *
 * The palette could jump to pages and products but had no notion of people, so
 * searching a customer's name found nothing even when they had bookings. The
 * data comes from the same server-side booking search the Bookings page uses
 * (`GET /bookings/supplier/bookings?search=`), which matches the reference,
 * the account name and email, the LEAD TRAVELLER'S name and email, the guest
 * identity on a supplier-created reservation, and the tour title.
 *
 * Three honesty rules:
 *
 *  - NO FABRICATED COUNTS. The endpoint returns a page of bookings, not a
 *    per-customer total, so "3 bookings" would be "3 of however many we
 *    happened to fetch". The row shows what is true: the customer's email and
 *    their most relevant activity date.
 *  - ONE ROW PER PERSON. Several bookings in the sample collapse to a single
 *    customer row — searching a name must not return the same face five times.
 *  - NO PLACEHOLDER PEOPLE. `mapBookingRow` answers "—" for a name it does not
 *    have. A row built from that is not a person, and its link would be
 *    `?search=—`, which can only ever return nothing: a booking with no
 *    account is grouped by its traveller, and a row with neither is dropped.
 */

/** `mapBookingRow`'s fallbacks are placeholders, not identities. */
function cleanName(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  return name && name !== '—' && name !== '-' ? name : '';
}

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

  const date = formatTravelDate(chosen.travelDate);
  return `${upcoming ? "Next" : "Last"}: ${date}${chosen.tourName ? ` · ${chosen.tourName}` : ""}`;
}

/** The one-line subtitle: email first (it is what separates two "Kwames"). */
export function customerSubtitle(customer) {
  const activity = customerActivityLine(customer.bookings || []);
  // A booking with no account is named for its traveller, so the line says so
  // rather than implying there is a customer profile behind the row.
  const kind = customer.guest ? "Guest booking" : "";
  return [kind, customer.email, activity].filter(Boolean).join(" · ");
}

/**
 * Collapse a page of booking rows into distinct people, keeping every booking
 * of theirs that was in the sample (the activity line picks from them). Order
 * is preserved — the server already ranked the matches.
 *
 * Accountless rows (guest checkouts, supplier-created reservations) group by
 * the LEAD TRAVELLER: that is who the booking is for, and it is the name the
 * card and the search both use.
 */
export function groupCustomerResults(rows) {
  const byPerson = new Map();
  for (const row of rows || []) {
    const accountName = cleanName(row.customerName);
    const travellerName = cleanName(row.leadTravelerName);
    const hasAccount = Boolean(row.customerId || row.customerEmail || accountName);
    const name = hasAccount ? accountName || travellerName : travellerName;
    const email = (hasAccount ? row.customerEmail : row.leadTravelerEmail) || "";
    const key = (hasAccount && (row.customerId || row.customerEmail)) || name || email;
    if (!key) continue;

    const existing = byPerson.get(key);
    if (existing) {
      existing.bookings.push(activityOf(row));
      continue;
    }
    byPerson.set(key, {
      id: row.customerId || "",
      name: name || "Unknown customer",
      email,
      guest: !hasAccount,
      bookings: [activityOf(row)],
    });
  }

  return [...byPerson.values()].map((customer) => ({
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
 *
 * A booking with no account has no id to scope by, so it falls back to a
 * search for the traveller's name — which the server matches — and to the bare
 * page when there is no usable name at all, never to `?search=—`.
 */
export function customerBookingsPath(customer) {
  if (customer.id) return `/bookings?customerId=${encodeURIComponent(customer.id)}`;
  const term = cleanName(customer.name);
  return term ? `/bookings?search=${encodeURIComponent(term)}` : "/bookings";
}

/** The secondary action: open the conversation with this customer. */
export function customerChatPath(customer) {
  return customer.id ? `/chat?customerId=${encodeURIComponent(customer.id)}` : "/chat";
}
