import api from "@/lib/axios";

export async function fetchSupplierAnalytics() {
  const response = await api.get("/suppliers/dashboard", { skipGlobalErrorHandler: true });
  return response.data?.data || null;
}

/**
 * Period-scoped KPIs for the Performance page.
 *
 * Revenue is money paid inside the window; bookings are bookings created
 * inside it; `previous*` describes the same-length window immediately before,
 * which is what the deltas on the cards compare against. Rating is all-time
 * and the card says so.
 */
export async function fetchAnalyticsSummary(period = "30d") {
  const response = await api.get("/suppliers/analytics/summary", {
    params: { period },
    skipGlobalErrorHandler: true,
  });
  const data = response.data?.data;
  // A server that predates this endpoint can answer the path with some other
  // payload. Missing figures must surface as an error, not as an empty page.
  if (!data || !data.revenue || !data.bookings) {
    throw new Error("The performance summary is unavailable on this server.");
  }
  return data;
}

/**
 * Revenue and bookings over time, bucketed to match the window (day / week /
 * month), with the previous window aligned index-for-index for comparison.
 */
export async function fetchAnalyticsTimeseries(period = "30d") {
  const response = await api.get("/suppliers/analytics/timeseries", {
    params: { period },
    skipGlobalErrorHandler: true,
  });
  const data = response.data?.data;
  if (!data || !Array.isArray(data.buckets)) {
    throw new Error("The performance trend is unavailable on this server.");
  }
  return data;
}

/**
 * Per-product performance for this page. Aggregated under `analytics.view`,
 * the key the page is gated by — the page used to read the BOOKINGS LIST,
 * which is `bookings.view`, so a finance member saw a permission error.
 */
export async function fetchProductAnalytics(period) {
  const response = await api.get("/suppliers/analytics/products", {
    params: period ? { period } : undefined,
    skipGlobalErrorHandler: true,
  });
  const products = response.data?.data?.products;
  if (!Array.isArray(products)) {
    throw new Error("Product performance is unavailable on this server.");
  }
  return products;
}

export async function fetchMonthlyRevenue(months = 12) {
  const response = await api.get("/suppliers/monthly-revenue", {
    params: { months },
    skipGlobalErrorHandler: true,
  });
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
