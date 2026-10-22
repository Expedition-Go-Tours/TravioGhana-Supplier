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

/**
 * GET /suppliers/analytics/ga4-funnel — the storefront funnel GA4 measures:
 * items viewed → added to cart → purchased → item revenue, per product.
 *
 * `enabled: false` means this server cannot see GA4: those columns are UNKNOWN
 * and `reason` says so. Callers must render that as its own state — never as a
 * table of zeros, which would read as "nobody looked at my products".
 */
export async function fetchGa4Funnel(params = {}) {
  const response = await api.get("/suppliers/analytics/ga4-funnel", {
    params,
    skipGlobalErrorHandler: true,
  });
  return response.data?.data || null;
}
