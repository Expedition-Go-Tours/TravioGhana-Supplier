import api from "@/lib/axios";
import { getTravelerCount } from "./lib/formatTravelers";

export function mapBookingRow(booking) {
  const travelers = booking.travelers || {};
  return {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    // Which storefront the customer booked through: 'GHANA' | 'EXPEDITION'.
    // Fallback parses the booking-number prefix so older rows still label correctly.
    source: booking.source || (booking.bookingNumber?.startsWith("GHA") ? "GHANA" : "EXPEDITION"),
    customerId: booking.customer?.id || "",
    customerName: booking.customer?.name || "—",
    customerEmail: booking.customer?.email || "",
    customerPhone: booking.customer?.phone || "",
    customerPhoto: booking.customer?.photoURL || "",
    // Lead traveler entered on the storefront (the person going on the trip).
    // Falls back to the booking-owner account when not provided (legacy pay-now).
    leadTravelerName: booking.leadTravelerName || booking.customer?.name || "—",
    leadTravelerEmail: booking.leadTravelerEmail || booking.customer?.email || "",
    leadTravelerPhone: booking.leadTravelerPhone || booking.customer?.phone || "",
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
    supplierNotes: booking.supplierNotes || "",
    specialRequests: booking.specialRequests || "",
    selectedTime: booking.selectedTime || "",
    pickup: typeof booking.pickup === 'string' ? (() => { try { return JSON.parse(booking.pickup); } catch { return null; } })() : booking.pickup || null,
    pickupStatus: booking.pickupStatus || null,
    pickupDeferred: !!booking.pickupDeferred,
    isIncomplete: booking.isIncomplete != null ? booking.isIncomplete : null,
    pickupConfig: typeof booking.tour?.bookingAndTickets === 'string'
      ? (() => { try { return JSON.parse(booking.tour.bookingAndTickets); } catch { return null; } })()
      : booking.tour?.bookingAndTickets || null,
    discount: Number(booking.discounts) || 0,
    offerId: booking.appliedOfferId || null,
    offerName: booking.offerName || booking.appliedOffer?.name || null,
    offerPromoCode: booking.offerPromoCode || booking.appliedOffer?.promoCode || null,
    offerType: booking.appliedOffer?.offerType || null,
    offerDiscountType: booking.offerDiscountType || booking.appliedOffer?.discountType || null,
    offerDiscountPct: booking.offerDiscountPct ?? booking.appliedOffer?.discountPercentage ?? null,
    offerDiscountFix: booking.offerDiscountFix ?? booking.appliedOffer?.fixedDiscountValue ?? null,
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

export async function fetchCustomerBookings(customerId) {
  const response = await api.get("/bookings/supplier/bookings", {
    params: { customerId },
    skipGlobalErrorHandler: true,
  });
  const payload = response.data?.data || {};
  return (payload.bookings || []).map(mapBookingRow);
}

export async function fetchPickupPlanner(params = {}) {
  const response = await api.get("/bookings/supplier/pickup-planner", {
    params,
    skipGlobalErrorHandler: true,
  });
  const payload = response.data?.data || {};
  return {
    bookings: (payload.bookings || []).map(mapBookingRow),
    pagination: payload.pagination || null,
  };
}

export function updateBookingPickup(id, payload) {
  return api.patch(
    `/bookings/supplier/pickup-planner/${id}`,
    payload,
    { skipGlobalErrorHandler: true }
  );
}
