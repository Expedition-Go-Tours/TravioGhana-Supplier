import api from "@/lib/axios";

export async function fetchPayouts(params = {}) {
  const response = await api.get("/payouts/me", {
    params,
    skipGlobalErrorHandler: true,
  });

  const payload = response.data?.data || {};
  return {
    payouts: (payload.payouts || []).map((payout) => ({
      id: payout.id,
      amount: Number(payout.amount) || 0,
      status: payout.status,
      date: payout.paidAt || payout.processedAt || payout.createdAt,
      currency: payout.currency || "USD",
      bookingNumber: payout.booking?.bookingNumber || "—",
      tour: payout.booking?.tour?.title || "—",
      method: payout.payoutMethod?.type?.replace(/_/g, " ") || payout.paymentMethod || "—",
      account:
        payout.payoutMethod?.accountNumber?.slice(-4) ||
        payout.payoutMethod?.mobileNumber?.slice(-4) ||
        payout.payoutMethod?.paypalEmail ||
        "—",
      reference: payout.reference || "",
    })),
    summary: payload.summary || {},
    pagination: payload.pagination || null,
  };
}

export async function fetchPayoutMethods() {
  const response = await api.get("/payout-methods/me", { skipGlobalErrorHandler: true });
  const payload = response.data?.data || {};
  return payload.methods || [];
}

export function createPayoutMethod(data) {
  return api.post("/payout-methods", data, { skipGlobalErrorHandler: true });
}

export function updatePayoutMethod(id, data) {
  return api.patch(`/payout-methods/${id}`, data, { skipGlobalErrorHandler: true });
}

export function deletePayoutMethod(id) {
  return api.delete(`/payout-methods/${id}`, { skipGlobalErrorHandler: true });
}

// ── Finance v2: payout cycles + batch withdrawal requests ──

export async function fetchFinanceSummary() {
  const response = await api.get("/finance/summary", { skipGlobalErrorHandler: true });
  return response.data?.data || {};
}

export async function fetchFinanceEarnings(params = {}) {
  const response = await api.get("/finance/earnings", { params, skipGlobalErrorHandler: true });
  const payload = response.data?.data || {};
  return {
    earnings: (payload.earnings || []).map((item) => ({
      id: item.id,
      bookingNumber: item.bookingNumber,
      travelDate: item.travelDate,
      paidAt: item.paidAt,
      grossAmount: Number(item.grossAmount) || 0,
      supplierPayout: Number(item.supplierPayout) || 0,
      commissionAmount: Number(item.platformCommission) || 0,
      commissionRate: Number(item.commissionRate) || 0,
      currency: item.currency || "USD",
      payoutStatus: item.payoutStatus,
      status: item.status,
      tour: item.tour?.title || "—",
      customer: item.customer?.name || "—",
      payoutRequest: item.payoutRequest || null,
      openDispute: item.openDispute || null,
    })),
    summary: payload.summary || {},
    pagination: payload.pagination || null,
  };
}

export async function fetchPayoutRequests(params = {}) {
  const response = await api.get("/finance/payouts/requests", { params, skipGlobalErrorHandler: true });
  const payload = response.data?.data || {};
  return {
    requests: (payload.requests || []).map((r) => ({
      id: r.id,
      requestNumber: r.requestNumber,
      amount: Number(r.amount) || 0,
      currency: r.currency || "USD",
      bookingCount: r.bookingCount || 0,
      status: r.status,
      cycleLabel: r.cycleLabel,
      reference: r.reference || "",
      createdAt: r.createdAt,
      completedAt: r.completedAt,
      rejectedReason: r.rejectedReason || "",
      method: r.payoutMethod
        ? r.payoutMethod.type?.replace(/_/g, " ") || "—"
        : "—",
    })),
    pagination: payload.pagination || null,
  };
}

export function createPayoutRequest(payload = {}) {
  return api.post("/finance/payout/request", payload, { skipGlobalErrorHandler: true });
}

export function cancelPayoutRequest(id) {
  return api.patch(`/finance/payouts/requests/${id}/cancel`, {}, { skipGlobalErrorHandler: true });
}

// ── Refund requests (supplier-initiated; stored as disputes) ──

export async function fetchFinanceDisputes(params = {}) {
  const response = await api.get("/finance/disputes", { params, skipGlobalErrorHandler: true });
  const payload = response.data?.data || {};
  return {
    disputes: (payload.disputes || []).map((d) => ({
      id: d.id,
      disputeNumber: d.disputeNumber,
      reason: d.reason,
      description: d.description || "",
      status: d.status,
      resolution: d.resolution || "",
      refundAmount: d.refundAmount == null ? null : Number(d.refundAmount),
      createdAt: d.createdAt,
      resolvedAt: d.resolvedAt,
      bookingNumber: d.booking?.bookingNumber || "—",
      tourTitle: d.booking?.tour?.title || "—",
      travelDate: d.booking?.travelDate,
      grossAmount: Number(d.booking?.grossAmount) || 0,
      currency: d.booking?.currency || "USD",
    })),
    pagination: payload.pagination || null,
  };
}

export function createRefundRequest(payload) {
  return api.post("/disputes", payload, { skipGlobalErrorHandler: true });
}

export function withdrawRefundRequest(id) {
  return api.patch(`/disputes/${id}/withdraw`, {}, { skipGlobalErrorHandler: true });
}
