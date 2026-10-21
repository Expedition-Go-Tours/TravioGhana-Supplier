import api from "@/lib/axios";
import { withIdempotencyKey } from "@/lib/idempotency";
import { formatCurrency } from "@/lib/utils";

export function mapClaim(claim) {
  const booking = claim?.booking || {};
  return {
    id: claim.id,
    claimNumber: claim.claimNumber,
    reason: claim.reason,
    details: claim.details || "",
    type: claim.type,
    requestedAmount: Number(claim.requestedAmount) || 0,
    status: claim.status,
    createdAt: claim.createdAt,
    reviewNote: claim.reviewNote || null,
    releasedAmount: Number(claim.releasedAmount) || 0,
    booking: {
      bookingNumber: booking.bookingNumber || "",
      total: Number(booking.grossAmount) || 0,
      currency: booking.currency || "USD",
      customerName: booking.customer?.name || "Customer",
      customerEmail: booking.customer?.email || "",
      tourTitle: booking.tour?.title || "",
    },
  };
}

export async function fetchSupplierClaims(status) {
  const res = await api.get("/refund-claims/supplier", {
    params: status && status !== "ALL" ? { status } : {},
    skipGlobalErrorHandler: true,
  });
  return ((res.data?.data?.claims) || []).map(mapClaim);
}

export async function approveClaim(id) {
  // Approving releases money to the customer. A retried approval must not
  // release it twice, so the attempt carries one Idempotency-Key.
  const res = await api.patch(`/refund-claims/supplier/${id}/approve`, {}, {
    ...withIdempotencyKey("refund-claim-approve"),
    skipGlobalErrorHandler: true,
  });
  return mapClaim(res.data?.data?.claim);
}

export async function declineClaim(id, note) {
  const res = await api.patch(`/refund-claims/supplier/${id}/decline`, { note }, { skipGlobalErrorHandler: true });
  return mapClaim(res.data?.data?.claim);
}

export { formatCurrency };
