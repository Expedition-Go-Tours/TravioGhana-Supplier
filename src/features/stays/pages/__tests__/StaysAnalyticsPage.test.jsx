/**
 * Analytics — the Stays mirror of the Experiences analytics page: the four
 * stat cards, the revenue-trend bar chart, the bookings-by-property donut and
 * the best-selling-properties table, all fed by the workspace mock and shown
 * in USD.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { formatCurrency } from "@/lib/utils";

import StaysAnalyticsPage from "../StaysAnalyticsPage";
import { staysMock } from "../../mock/store";

beforeEach(() => {
  staysMock.reset();
  localStorage.setItem("auth_token", "test-token");
});

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/stays/analytics"]}>
      <LocationProbe />
      <Routes>
        <Route path="/stays/analytics" element={<StaysAnalyticsPage />} />
        <Route path="/stays/properties/build/:id" element={<div>Builder</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("StaysAnalyticsPage — experiences-parity analytics", () => {
  it("renders the four stat cards from the workspace data", async () => {
    const summary = await staysMock.getAnalyticsSummary();
    renderPage();

    expect(await screen.findByRole("heading", { name: "Analytics" })).toBeTruthy();
    expect(
      screen.getByText("Track revenue, bookings and property growth with modern analytics."),
    ).toBeTruthy();

    await screen.findAllByText(formatCurrency(summary.earnings.totalEarnings));
    expect(screen.getAllByText(String(summary.bookings.total)).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(`${summary.reviews.averageRating} ★`).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(String(summary.properties.active)).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Earnings").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rating").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Live Properties").length).toBeGreaterThan(0);
  });

  it("renders the revenue trend, the property donut and the best sellers", async () => {
    const properties = await staysMock.getPropertyAnalytics();
    const first = properties[0];
    renderPage();

    expect(await screen.findByText("Revenue Trend")).toBeTruthy();
    expect(screen.getByText("Bookings by Property")).toBeTruthy();
    expect(screen.getByText("Best Selling Properties")).toBeTruthy();

    // The best-sellers table row: full name + USD revenue + the drill-in action.
    expect((await screen.findAllByText(first.name)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(formatCurrency(first.revenue)).length).toBeGreaterThan(0);
    expect(await screen.findByRole("button", { name: "View details" })).toBeTruthy();
  });

  it("opens the property builder from a best seller's View details", async () => {
    const properties = await staysMock.getPropertyAnalytics();
    const user = userEvent.setup();
    renderPage();

    const viewDetails = await screen.findByRole("button", { name: "View details" });
    await user.click(viewDetails);

    expect(screen.getByTestId("location").textContent).toBe(
      `/stays/properties/build/${properties[0].propertyId}`,
    );
  });
});
