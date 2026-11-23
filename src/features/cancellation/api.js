import api from "@/lib/axios";

export async function fetchCancellationSummary(productId, days = 90, period) {
  const params = { days };
  if (productId) params.productId = productId;
  // A calendar month from the Performance page: without it the card would
  // report a rolling window under a chart showing a specific month.
  if (period) params.period = period;
  const response = await api.get("/suppliers/cancellation/summary", {
    params,
    skipGlobalErrorHandler: true,
  });
  return response.data?.data || null;
}

export async function fetchCancellationRecords({ productId, page = 1, limit = 25, days = 90 } = {}) {
  const params = { page, limit, days };
  if (productId) params.productId = productId;
  const response = await api.get("/suppliers/cancellation/records", {
    params,
    skipGlobalErrorHandler: true,
  });
  const payload = response.data?.data || {};
  return {
    records: payload.records || [],
    pagination: payload.pagination || null,
  };
}

export async function fetchCancellationProducts() {
  const response = await api.get("/suppliers/products/list", {
    skipGlobalErrorHandler: true,
  });
  return (response.data?.data?.products || []).map((p) => ({
    id: p.id,
    name: p.title || p.name,
  }));
}
