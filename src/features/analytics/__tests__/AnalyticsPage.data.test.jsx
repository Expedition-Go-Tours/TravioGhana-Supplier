/**
 * The Performance page's data sources and period model.
 *
 * Two rules these pin:
 *   - the page reads `analytics.view` endpoints, never the Bookings list
 *     (`bookings.view`) — a finance member holds only the former;
 *   - every number on screen belongs to the selected period, so switching the
 *     period refetches the summary, the series, the products and GA4 together.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const fetchAnalyticsSummary = vi.fn();
const fetchAnalyticsTimeseries = vi.fn();
const fetchProductAnalytics = vi.fn();
const fetchGa4Funnel = vi.fn();
const fetchCancellationSummary = vi.fn();
const fetchSupplierBookings = vi.fn();

vi.mock("../api", () => ({
  fetchAnalyticsSummary: (...args) => fetchAnalyticsSummary(...args),
  fetchAnalyticsTimeseries: (...args) => fetchAnalyticsTimeseries(...args),
  fetchProductAnalytics: (...args) => fetchProductAnalytics(...args),
  fetchGa4Funnel: (...args) => fetchGa4Funnel(...args),
}));

vi.mock("@/features/cancellation/api", () => ({
  fetchCancellationSummary: (...args) => fetchCancellationSummary(...args),
}));

vi.mock("@/features/bookings/api", () => ({
  fetchSupplierBookings: (...args) => fetchSupplierBookings(...args),
}));

import AnalyticsPage from "../pages/AnalyticsPage";

const SUMMARY = {
  period: { key: "30d", label: "Last 30 days", from: "2026-10-06T00:00:00.000Z", to: "2026-11-05T00:00:00.000Z" },
  revenue: { gross: 1000, payout: 850, previousGross: 800, previousPayout: 680, currency: "USD" },
  bookings: { total: 10, previousTotal: 8, confirmed: 7, pending: 2, completed: 1, cancelled: 0, paid: 6, avgValue: 166.67 },
  rating: { average: 4.6, count: 12, lowShare: 8.3 },
};

const SERIES = {
  granularity: "day",
  buckets: [
    { label: "1 Nov", revenue: 500, bookings: 5 },
    { label: "2 Nov", revenue: 500, bookings: 5 },
  ],
  previous: [
    { revenue: 400, bookings: 4 },
    { revenue: 400, bookings: 4 },
  ],
};

const PRODUCTS = [
  { tourId: "tour-1", name: "Shai Hills Safari", photo: null, rating: 4.5, bookings: 7, revenue: 2100, payout: 1470 },
  { tourId: "tour-2", name: "Cape Coast Castle", photo: null, rating: 4.1, bookings: 2, revenue: 300, payout: 210 },
];

const GA4 = {
  enabled: true,
  from: "2026-10-06",
  to: "2026-11-05",
  rows: [
    {
      itemId: "tour-1",
      itemName: "Shai Hills Safari",
      itemsViewed: 100,
      itemsAddedToCart: 10,
      itemsPurchased: 7,
      itemRevenue: 2100,
      itemsPurchasedSharePct: 70,
      itemRevenueSharePct: 80,
    },
  ],
  totals: { itemsViewed: 100, itemsAddedToCart: 10, itemsPurchased: 7, itemRevenue: 2100 },
  excludedCount: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  fetchAnalyticsSummary.mockResolvedValue(SUMMARY);
  fetchAnalyticsTimeseries.mockResolvedValue(SERIES);
  fetchProductAnalytics.mockResolvedValue(PRODUCTS);
  fetchGa4Funnel.mockResolvedValue(GA4);
  fetchCancellationSummary.mockResolvedValue({
    cancellationRate: 0,
    supplierCausedCount: 0,
    eligibleBookings: 50,
  });
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <AnalyticsPage />
    </MemoryRouter>,
  );

describe("the Performance page's data sources", () => {
  it("asks for the analytics endpoints, not the Bookings list", async () => {
    renderPage();

    await waitFor(() => expect(fetchProductAnalytics).toHaveBeenCalled());
    expect(fetchAnalyticsSummary).toHaveBeenCalledWith("30d");
    expect(fetchAnalyticsTimeseries).toHaveBeenCalledWith("30d");
    expect(fetchCancellationSummary).toHaveBeenCalledWith(undefined, 30);
    expect(fetchSupplierBookings).not.toHaveBeenCalled();
  });

  it("renders the period-scoped cards", async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByText("Revenue").length).toBeGreaterThan(0));
    expect(screen.getAllByText("$1,000.00").length).toBeGreaterThan(0);
    expect(screen.getByText("Payout $850.00")).toBeInTheDocument();
    expect(screen.getAllByText("10").length).toBeGreaterThan(0);
    expect(screen.getByText("7 confirmed · 2 pending")).toBeInTheDocument();
    expect(screen.getByText("4.6 ★")).toBeInTheDocument();
    expect(screen.getByText("0.0%")).toBeInTheDocument();
    expect(screen.getByText("0 of 50 eligible bookings")).toBeInTheDocument();
  });

  it("computes the deltas from the previous window", async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByText("25%").length).toBe(2));
  });

  it("says New when the previous window was empty", async () => {
    fetchAnalyticsSummary.mockResolvedValue({
      ...SUMMARY,
      revenue: { ...SUMMARY.revenue, previousGross: 0 },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText(/New/)).toBeInTheDocument());
  });

  it("refetches every section when the period changes", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(fetchAnalyticsSummary).toHaveBeenCalledWith("30d"));
    await user.click(screen.getByRole("button", { name: "90 days" }));

    await waitFor(() => expect(fetchAnalyticsSummary).toHaveBeenCalledWith("90d"));
    expect(fetchAnalyticsTimeseries).toHaveBeenCalledWith("90d");
    expect(fetchProductAnalytics).toHaveBeenCalledWith("90d");
    expect(fetchCancellationSummary).toHaveBeenCalledWith(undefined, 90);

    const ga4Params = fetchGa4Funnel.mock.calls.at(-1)[0];
    const span = (new Date(ga4Params.to) - new Date(ga4Params.from)) / 86_400_000;
    expect(Math.round(span)).toBe(90);
  });
});

describe("the product table", () => {
  it("shows views and conversion from GA4 beside the booking figures", async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByText("Shai Hills Safari").length).toBeGreaterThan(0));
    expect(screen.getAllByText("100").length).toBeGreaterThan(0);
    expect(screen.getAllByText("7.0%").length).toBeGreaterThan(0);
  });

  it("keeps two tours with the same title as two products", async () => {
    fetchProductAnalytics.mockResolvedValue([
      { tourId: "tour-1", name: "City Tour", photo: null, rating: 4.5, bookings: 7, revenue: 2100 },
      { tourId: "tour-3", name: "City Tour", photo: null, rating: 2.0, bookings: 3, revenue: 900 },
    ]);

    renderPage();

    await waitFor(() => expect(screen.getAllByText("City Tour").length).toBe(2));
    expect(screen.getAllByText(/4\.5 ★/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2\.0 ★/).length).toBeGreaterThan(0);
  });

  it("says the rows are missing, not zero, when the call fails", async () => {
    fetchProductAnalytics.mockRejectedValue(new Error("boom"));

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Couldn't load product performance")).toBeInTheDocument(),
    );
  });
});

describe("Google Analytics states", () => {
  it("shows an explanation, not zeros, when GA4 is not connected", async () => {
    fetchGa4Funnel.mockResolvedValue({ enabled: false, reason: "GA4 reporting is not configured." });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Google Analytics not connected")).toBeInTheDocument(),
    );
    expect(screen.getByText("Not connected to Google Analytics")).toBeInTheDocument();
  });

  it("shows a retry when the funnel request fails", async () => {
    fetchGa4Funnel.mockRejectedValue(new Error("GA4 timeout"));

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Couldn't load the storefront funnel")).toBeInTheDocument(),
    );
    expect(screen.getByText("GA4 timeout")).toBeInTheDocument();
  });
});
