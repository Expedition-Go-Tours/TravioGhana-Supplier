/**
 * The product drill-down page.
 *
 * Business performance answers "how am I doing"; this page answers "what is
 * happening with this product", including the one number GA4 cannot see — how
 * far ahead people book.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const fetchProductPerformance = vi.fn();
const fetchGa4Funnel = vi.fn();

vi.mock("../api", () => ({
  fetchProductPerformance: (...args) => fetchProductPerformance(...args),
  fetchGa4Funnel: (...args) => fetchGa4Funnel(...args),
}));

import ProductPerformancePage from "../pages/ProductPerformancePage";

const PRODUCT = {
  period: { key: "30d", label: "Last 30 days", from: "2026-10-06T00:00:00.000Z", to: "2026-11-05T00:00:00.000Z" },
  product: { id: "tour-1", name: "Shai Hills Safari", photo: null, rating: 4.6 },
  revenue: {
    gross: 1200,
    payout: 1020,
    paid: 6,
    previousGross: 900,
    previousPayout: 765,
    avgValue: 200,
    currency: "USD",
  },
  bookings: {
    total: 8,
    previousTotal: 6,
    confirmed: 6,
    pending: 2,
    completed: 0,
    cancelled: 0,
    leadTime: {
      averageDays: 12.4,
      distribution: [
        { label: "0–3 days", count: 1 },
        { label: "4–7 days", count: 2 },
        { label: "8–14 days", count: 3 },
        { label: "15–30 days", count: 2 },
        { label: "30+ days", count: 0 },
      ],
    },
  },
  rating: { average: 4.6, count: 12, lowShare: 8.3 },
  cancellations: { rate: 0, total: 0, supplierCaused: 0, atRisk: 20, lostValue: 0 },
  series: {
    granularity: "day",
    buckets: [
      { label: "1 Nov", revenue: 600, bookings: 4 },
      { label: "2 Nov", revenue: 600, bookings: 4 },
    ],
    previous: [
      { revenue: 450, bookings: 3 },
      { revenue: 450, bookings: 3 },
    ],
  },
};

const GA4 = {
  enabled: true,
  from: "2026-10-06",
  to: "2026-11-05",
  rows: [
    {
      itemId: "tour-1",
      itemName: "Shai Hills Safari",
      itemsViewed: 500,
      itemsAddedToCart: 40,
      itemsPurchased: 8,
      itemRevenue: 1200,
    },
  ],
  totals: { itemsViewed: 500, itemsAddedToCart: 40, itemsPurchased: 8, itemRevenue: 1200 },
  excludedCount: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  fetchProductPerformance.mockResolvedValue(PRODUCT);
  fetchGa4Funnel.mockResolvedValue(GA4);
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/analytics/tour-1"]}>
      <Routes>
        <Route path="/analytics/:tourId" element={<ProductPerformancePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProductPerformancePage", () => {
  it("loads the product and its period figures", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Shai Hills Safari" })).toBeInTheDocument();
    expect(fetchProductPerformance).toHaveBeenCalledWith("tour-1", "30d");
    expect(screen.getAllByText("$1,200.00").length).toBeGreaterThan(0);
    expect(screen.getByText("1.6%")).toBeInTheDocument();
  });

  it("shows the funnel and the booking window under conversion", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("heading", { name: "Shai Hills Safari" });
    await user.click(screen.getByRole("tab", { name: "Bookings & conversion" }));

    expect(screen.getByText("Booking window")).toBeInTheDocument();
    expect(screen.getByText(/average 12.4 days/)).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
    expect(screen.getByText("8% of previous step")).toBeInTheDocument();
  });

  it("shows rating and cancellation detail on their tabs", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("heading", { name: "Shai Hills Safari" });

    await user.click(screen.getByRole("tab", { name: "Rating" }));
    expect(screen.getByText("4.6 ★")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("8.3%")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Cancellations" }));
    expect(screen.getByText("0 of 20 at risk")).toBeInTheDocument();
    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });

  it("says the product is unavailable instead of rendering an empty page", async () => {
    fetchProductPerformance.mockRejectedValue(new Error("Product not found or not yours"));

    renderPage();

    expect(await screen.findByText("Could not load this product")).toBeInTheDocument();
    expect(screen.getByText("Product not found or not yours")).toBeInTheDocument();
  });
});
