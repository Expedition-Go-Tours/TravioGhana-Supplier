import api from "@/lib/axios";
import { getTravelerCount } from "./lib/formatTravelers";

export function mapBookingRow(booking) {
  const travelers = booking.travelers || {};
  return {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
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
    tourPhoto: booking.tour?.photos?.[0] || "",
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
