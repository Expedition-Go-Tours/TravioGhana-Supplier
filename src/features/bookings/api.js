import api from "@/lib/axios";
import { getTravelerCount } from "./lib/formatTravelers";

export function mapBookingRow(booking) {
  const travelers = booking.travelers || {};
  return {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    // MARKETPLACE | SUPPLIER_CREATED. The detail panel uses this to show the
    // commission ledger, which only exists for money the supplier collected
    // offline.
    origin: booking.origin || null,
    // Which storefront the customer booked through: 'GHANA' | 'EXPEDITION'.
    // Fallback parses the booking-number prefix so older rows still label correctly.
    // TRG is the Ghana prefix (config/brands.js bookingPrefix); EXP is Expedition's.
    // This used to test for "GHA", which no brand has ever minted, so the fallback
    // could never label anything GHANA. See __tests__/mapBookingRow.source.test.js.
    source: booking.source || (booking.bookingNumber?.startsWith("TRG") ? "GHANA" : "EXPEDITION"),
    customerId: booking.customer?.id || "",
    customerName: booking.customer?.name || "—",
    // The account that placed the booking. Its phone is optional and is only
    // set from account settings, so it is NOT the person the supplier calls.
    customerEmail: booking.customer?.email || "",
    customerPhone: booking.customer?.phone || "",
    customerPhoto: booking.customer?.photoURL || "",
    // Who the supplier should actually contact for this booking. The email and
    // phone entered at checkout belong to the lead traveller and are stored on
    // the booking row; the account often has neither. `travelers.phoneNumber`
    // is the last resort for rows written before `leadTravelerPhone` was always
    // populated. Everything that displays a contact detail reads these two, so
    // the list, drawer, pickup planner and manifest cannot disagree.
    contactPhone: booking.leadTravelerPhone || booking.customer?.phone || travelers.phoneNumber || "",
    contactEmail: booking.leadTravelerEmail || booking.customer?.email || "",
    // Lead traveler entered on the storefront (the person going on the trip).
    // Falls back to the booking-owner account when not provided (legacy pay-now).
    leadTravelerName: booking.leadTravelerName || booking.customer?.name || "—",
    // Strictly what the lead traveller entered. Use `contactEmail` /
    // `contactPhone` for anything the supplier will act on.
    leadTravelerEmail: booking.leadTravelerEmail || "",
    leadTravelerPhone: booking.leadTravelerPhone || "",
    tourName: booking.tour?.title || "—",
    // Per-tour confirmation mode (from bookingAndTickets). Missing/unset => instant.
    instantConfirmation: booking.tour?.bookingAndTickets?.instantConfirmation !== false,
    tourId: booking.tourId,
    // The Ghana supplier bookings endpoint selects coverPhoto but not the
    // full photos array — prefer coverPhoto, fall back to the first photo.
    tourPhoto: booking.tour?.coverPhoto || booking.tour?.photos?.[0] || "",
    travelDate: booking.travelDate,
    bookingDate: booking.createdAt,
    travelers: getTravelerCount(travelers),
    travelersRaw: travelers,
    total: Number(booking.grossAmount) || 0,
    subtotal: Number(booking.subtotal) || 0,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    paymentTiming: booking.paymentTiming || "now",
    currency: booking.currency || "USD",
    // Server-authoritative attention projection. The UI renders this exactly;
    // it never derives "action needed" from paymentStatus alone.
    attention: booking.attention || null,
    paymentFailureCode: booking.paymentFailureCode || null,
    recoveryEmailCount: booking.recoveryEmailCount ?? null,
    supplierNotes: booking.supplierNotes || "",
    specialRequests: booking.specialRequests || "",
    selectedTime: booking.selectedTime || "",
    pickup: typeof booking.pickup === 'string' ? (() => { try { return JSON.parse(booking.pickup); } catch { return null; } })() : booking.pickup || null,
    pickupStatus: booking.pickupStatus || null,
    pickupDeferred: !!booking.pickupDeferred,
    isIncomplete: booking.isIncomplete != null ? booking.isIncomplete : null,
    // Server-derived planner state: 'deferred' | 'incomplete' | 'confirmed'.
    pickupState: booking.pickupState || null,
    // Supplier stop order within the day + "picked up" marker.
    pickupOrder: booking.pickupOrder ?? null,
    pickedUpAt: booking.pickedUpAt || null,
    pickupConfig: typeof booking.tour?.bookingAndTickets === 'string'
      ? (() => { try { return JSON.parse(booking.tour.bookingAndTickets); } catch { return null; } })()
      : booking.tour?.bookingAndTickets || null,
    // Cancellation detail. These are plain Booking scalars that the supplier
    // bookings endpoint already returns (it hands back raw Prisma rows), but
    // this mapper is an explicit whitelist and was dropping all four — so every
    // `booking.cancellationReason` / `.cancellationNote` / `.cancelledAt` /
    // `.refundStatus` read in BookingCard was undefined and the whole
    // "Cancellation" section silently never rendered.
    cancellationReason: booking.cancellationReason || null,
    cancellationNote: booking.cancellationNote || null,
    cancelledAt: booking.cancelledAt || null,
    refundStatus: booking.refundStatus || null,
    discount: Number(booking.discounts) || 0,
    offerId: booking.appliedOfferId || null,
    offerName: booking.offerName || booking.appliedOffer?.name || null,
    offerPromoCode: booking.offerPromoCode || booking.appliedOffer?.promoCode || null,
    offerType: booking.appliedOffer?.offerType || null,
    offerDiscountType: booking.offerDiscountType || booking.appliedOffer?.discountType || null,
    offerDiscountPct: booking.offerDiscountPct ?? booking.appliedOffer?.discountPercentage ?? null,
    offerDiscountFix: booking.offerDiscountFix ?? booking.appliedOffer?.fixedDiscountValue ?? null,
    // Set when SUPPLIER_CANCEL_REQUIRES_APPROVAL is on and this booking has a
    // parked cancellation request awaiting an admin decision. Shape:
    // { id, status:'PENDING_APPROVAL', createdAt, payload, preview, stopSellingApplied } | null
    pendingCancellation: booking.pendingCancellation || null,
    // The customer's own review of this experience (detail panel only — the
    // list endpoint does not include it).
    review: booking.review || null,
  };
}

export async function fetchSupplierBookings(params = {}) {
  const response = await api.get("/bookings/supplier/bookings", {
    params,
    skipGlobalErrorHandler: true,
  });
  const payload = response.data?.data || {};
  return {
    bookings: (payload.bookings || []).map(mapBookingRow),
    summary: payload.summary || null,
    pagination: payload.pagination || null,
  };
}

/**
 * GET /bookings/supplier/bookings/:id (rewritten into the brand namespace).
 * One booking in full for the detail panel. Rejects rather than falling back:
 * a stale row must never be presented as "the booking".
 */
export async function fetchBookingDetail(id) {
  const response = await api.get(`/bookings/supplier/bookings/${id}`, {
    skipGlobalErrorHandler: true,
  });
  const booking = response.data?.data?.booking;
  if (!booking) {
    throw new Error("The server did not return this booking");
  }
  return mapBookingRow(booking);
}

/**
 * PATCH /bookings/:id/status with no status — notes-only. The schema requires
 * a status change OR notes, so this can never be an empty write.
 */
export function updateBookingNotes(id, supplierNotes) {
  return api.patch(
    `/bookings/${id}/status`,
    { supplierNotes },
    { skipGlobalErrorHandler: true }
  );
}

/**
 * POST /bookings/supplier/bookings/:id/reschedule — move one booking to another
 * date/time. The server re-prices the target date and REFUSES when the price
 * would change (a supplier move never changes what the customer paid), and
 * re-checks capacity without this booking's own travellers.
 *
 * Deliberately not retried automatically: a second application of the same
 * move is indistinguishable from a no-op failure to the user.
 */
export function rescheduleBooking(id, { travelDate, selectedTime, reason }) {
  return api.post(
    `/bookings/supplier/bookings/${id}/reschedule`,
    { travelDate, ...(selectedTime ? { selectedTime } : {}), ...(reason ? { reason } : {}) },
    { skipGlobalErrorHandler: true }
  );
}

/**
 * GET /bookings/supplier/bookings/export — the filtered list as CSV, generated
 * server-side so the file cannot be truncated by whatever happened to be in the
 * browser tab. Returns the blob plus the filename the server named it.
 */
export async function exportSupplierBookingsCsv(params = {}) {
  const response = await api.get("/bookings/supplier/bookings/export", {
    params,
    responseType: "blob",
    skipGlobalErrorHandler: true,
  });

  const disposition = response.headers?.["content-disposition"] || "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return {
    blob: response.data,
    filename: match?.[1] || `travio-bookings-${new Date().toISOString().slice(0, 10)}.csv`,
  };
}

/**
 * Supplier-hosted payment link. `mode` is create | resend | regenerate. The
 * server owns eligibility, amount, expiry and delivery; the response carries
 * the refreshed attention projection. The Idempotency-Key is required so a
 * network retry cannot send a second email or create a second session.
 */
export function sendBookingPaymentLink(id, { mode = "create", sendInChat = false, idempotencyKey }) {
  const path =
    mode === "resend"
      ? `/bookings/supplier/bookings/${id}/payment-link/resend`
      : mode === "regenerate"
        ? `/bookings/supplier/bookings/${id}/payment-link/regenerate`
        : `/bookings/supplier/bookings/${id}/payment-link`;
  return api.post(
    path,
    { sendInChat: Boolean(sendInChat) },
    {
      headers: { "Idempotency-Key": idempotencyKey },
      skipGlobalErrorHandler: true,
    },
  );
}

export function newPaymentLinkIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `pl-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function updateBookingStatus(id, { status, supplierNotes, reason }) {
  return api.patch(
    `/bookings/${id}/status`,
    { status, supplierNotes, reason },
    { skipGlobalErrorHandler: true }
  );
}

// ── Structured supplier cancellation (GYG-style wizard) ──

/**
 * GET /bookings/cancellation-reasons — the taxonomy that drives the wizard.
 * Cached module-wide so the single-cancel modal and the bulk-cancel wizard
 * fetch it once per session.
 */
let cancellationTaxonomyPromise = null;

export function getCancellationTaxonomy() {
  if (!cancellationTaxonomyPromise) {
    cancellationTaxonomyPromise = api
      .get("/bookings/cancellation-reasons", { skipGlobalErrorHandler: true })
      .then((response) => response.data?.data || null)
      .catch((err) => {
        cancellationTaxonomyPromise = null; // allow a retry on the next attempt
        throw err;
      });
  }
  return cancellationTaxonomyPromise;
}

/**
 * PATCH /bookings/:id/status with status=CANCELLED — requires the structured
 * payload (cancellationCode + agreedToTerms + category-conditional fields).
 * Resolves to { booking, cancellation } inside response.data.data.
 */
export function cancelBookingStructured(id, payload) {
  return api.patch(
    `/bookings/${id}/status`,
    { status: "CANCELLED", ...payload },
    { skipGlobalErrorHandler: true }
  );
}

/**
 * POST /bookings/supplier/cancel-batch — one tour, one date range, one
 * structured reason. Resolves to { matched, cancelled, failed, totalRefunded,
 * totalFees, blockedDates, overflow, results } inside response.data.data.
 */
export function cancelBookingsBatch(payload) {
  return api.post("/bookings/supplier/cancel-batch", payload, {
    skipGlobalErrorHandler: true,
  });
}

// ── Admin-approval cancellation requests (flag ON) ──

/**
 * GET /bookings/supplier/cancellation-requests — the supplier's parked
 * cancellation requests, newest first. `status` is one of PENDING_APPROVAL |
 * APPROVED | REJECTED | WITHDRAWN | SUPERSEDED | ALL. Resolves to
 * { requests, pagination } inside response.data.data.
 */
export async function fetchCancellationRequests({ status, page = 1, limit = 25 } = {}) {
  const params = { page, limit };
  if (status && status !== "ALL") params.status = status;
  const response = await api.get("/bookings/supplier/cancellation-requests", {
    params,
    skipGlobalErrorHandler: true,
  });
  const payload = response.data?.data || {};
  return {
    requests: payload.requests || [],
    pagination: payload.pagination || null,
    pendingCount: payload.pendingCount ?? null,
  };
}

/**
 * POST /bookings/supplier/cancellation-requests/:id/withdraw — pulls back a
 * PENDING_APPROVAL request. Nothing was ever changed, so withdrawing only
 * re-opens any dates the batch request had blocked. 404 means the request was
 * already decided (or belongs to another supplier).
 * Resolves to { request, revertedDates } inside response.data.data.
 */
export function withdrawCancellationRequest(id) {
  return api.post(
    `/bookings/supplier/cancellation-requests/${id}/withdraw`,
    null,
    { skipGlobalErrorHandler: true }
  );
}

export async function fetchCustomerBookings(customerId) {
  const response = await api.get("/bookings/supplier/bookings", {
    params: { customerId },
    skipGlobalErrorHandler: true,
  });
  const payload = response.data?.data || {};
  return (payload.bookings || []).map(mapBookingRow);
}

export async function fetchPickupPlanner({ signal, ...params } = {}) {
  const response = await api.get("/bookings/supplier/pickup-planner", {
    params,
    signal,
    skipGlobalErrorHandler: true,
  });
  const payload = response.data?.data || {};
  return {
    bookings: (payload.bookings || []).map(mapBookingRow),
    counts: payload.counts || null,
    truncated: !!payload.truncated,
    pagination: payload.pagination || null,
  };
}

/**
 * Page through the planner endpoint for exports and full-day reorders.
 * The server caps a single response at 200 rows; exports must not silently
 * contain only the visible page.
 */
export async function fetchAllPickupPlanner(params = {}) {
  const limit = 200;
  const maxPages = 25; // 5,000 rows; the server itself caps the range at 2,000
  let page = 1;
  let totalPages;
  let totalCount;
  let truncated = false;
  const bookings = [];

  do {
    const result = await fetchPickupPlanner({ ...params, page, limit });
    bookings.push(...result.bookings);
    totalCount = result.pagination?.totalCount ?? bookings.length;
    totalPages = result.pagination?.totalPages ?? 1;
    truncated = truncated || !!result.truncated;
    page += 1;
  } while (page <= totalPages && page <= maxPages);

  if (page - 1 < totalPages) truncated = true;
  return { bookings, totalCount: totalCount ?? bookings.length, truncated };
}

/** Persist the supplier's stop order for one service day. */
export function reorderPickupStops(date, order) {
  return api.patch(
    `/bookings/supplier/pickup-planner/reorder`,
    { date, order },
    { skipGlobalErrorHandler: true }
  );
}

export function updateBookingPickup(id, payload) {
  return api.patch(
    `/bookings/supplier/pickup-planner/${id}`,
    payload,
    { skipGlobalErrorHandler: true }
  );
}

// ── Supplier-created bookings (walk-ins, offline collection) ────────────────
//
// Everything authoritative is computed server-side: the quote below is the
// only price the UI may show, and `create` never accepts a total, a supplier,
// an origin or a commission. Money a supplier collects is reported through
// `recordBookingCollection`; that is a different fact from a platform payment
// and never becomes one.

/**
 * Server-authoritative price + availability verdict. The wizard displays this
 * and re-quotes whenever the party or the date changes.
 */
export async function quoteSupplierBooking(payload) {
  const response = await api.post("/bookings/supplier/bookings/quote", payload, {
    skipGlobalErrorHandler: true,
  });
  return response.data?.data || null;
}

/**
 * GET /finance/commission-cover
 * How much of the supplier's money the platform is holding, per currency,
 * against the commission a supplier-created booking would raise. Commission is
 * never extended on credit, so this is what decides whether "Create booking"
 * can even be pressed — the backend re-checks the same balance under a lock.
 */
export async function fetchCommissionCover() {
  const response = await api.get("/finance/commission-cover", {
    skipGlobalErrorHandler: true,
  });
  const data = response.data?.data || {};
  return {
    usable: Boolean(data.usable),
    currencies: Array.isArray(data.currencies) ? data.currencies : [],
  };
}

/**
 * Create the booking. `idempotencyKey` travels in the header so a retried
 * submit replays the same booking instead of creating a second one — the
 * button's disabled state is not the safety net.
 */
export async function createSupplierBooking(payload, idempotencyKey) {
  const response = await api.post("/bookings/supplier/bookings", payload, {
    headers: { "Idempotency-Key": idempotencyKey },
    skipGlobalErrorHandler: true,
  });
  return response.data?.data?.booking || null;
}

export async function fetchBookingCollections(bookingId) {
  const response = await api.get(`/bookings/supplier/bookings/${bookingId}/collections`, {
    skipGlobalErrorHandler: true,
  });
  return response.data?.data || null;
}

/** Record money the supplier reports collecting. Partial collections are separate rows. */
export async function recordBookingCollection(bookingId, payload, idempotencyKey) {
  const response = await api.post(`/bookings/supplier/bookings/${bookingId}/collections`, payload, {
    headers: { "Idempotency-Key": idempotencyKey },
    skipGlobalErrorHandler: true,
  });
  return response.data?.data?.collection || null;
}

/** Record money the supplier returned to the customer outside the platform. */
export async function recordBookingRefund(bookingId, payload, idempotencyKey) {
  const response = await api.post(`/bookings/supplier/bookings/${bookingId}/refunds`, payload, {
    headers: { "Idempotency-Key": idempotencyKey },
    skipGlobalErrorHandler: true,
  });
  return response.data?.data?.refund || null;
}
