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
  // Normalise the backend's `grossAmount`/`bookingCount` onto the `revenue`/
  // `bookings` keys the charts read. They used to look for `revenue`, which the
  // endpoint has never returned, so the trend chart rendered "No revenue
  // recorded in the last 12 months" for suppliers who had plenty.
  return (response.data?.data?.months || []).map((month) => ({
    ...month,
    revenue: Number(month.revenue ?? month.grossAmount) || 0,
    bookings: Number(month.bookings ?? month.bookingCount) || 0,
  }));
}
