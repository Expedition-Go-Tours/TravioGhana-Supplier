import api from "@/lib/axios";

export async function fetchSupplierAnalytics() {
  const response = await api.get("/suppliers/dashboard", { skipGlobalErrorHandler: true });
  return response.data?.data || null;
}

/**
 * Per-product performance for this page's charts.
 *
 * The page used to build them from the supplier's BOOKINGS LIST, which is
 * `bookings.view` (admin + editor) — so a finance member, who may open Analytics
 * but not the Bookings page, got a permission error instead of the charts. The
 * backend aggregates these under `analytics.view`, the key the page is gated by.
 */
export async function fetchProductAnalytics() {
  const response = await api.get("/suppliers/analytics/products", {
    skipGlobalErrorHandler: true,
  });
  return response.data?.data?.products || [];
}

export async function fetchMonthlyRevenue(months = 12) {
  const response = await api.get("/suppliers/monthly-revenue", {
    params: { months },
    skipGlobalErrorHandler: true,
  });
  return response.data?.data?.months || [];
}
