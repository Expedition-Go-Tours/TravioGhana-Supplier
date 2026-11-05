/**
 * The GA4 funnel panel.
 *
 * The states must stay distinct, because this panel is the only place a
 * supplier can see "people looked at my product and did not buy" — and a
 * rendering bug there turns a measurement into a claim:
 *   not configured  → an explanation, NEVER a table of zeros
 *   request failed  → an error with Retry, never an empty funnel
 *   no activity     → an explicit "measured zero", with the dates
 *
 * The page owns the request and the period; the panel only renders props.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Ga4FunnelPanel from "../components/Ga4FunnelPanel";

const ROWS = [
  {
    itemId: "tour-1",
    itemName: "Accra Guided City Tour",
    itemsViewed: 120,
    itemsAddedToCart: 30,
    itemsPurchased: 6,
    itemRevenue: 420,
  },
  {
    itemId: "tour-2",
    itemName: "Waterfalls & Aburi Gardens",
    itemsViewed: 80,
    itemsAddedToCart: 20,
    itemsPurchased: 4,
    itemRevenue: 320,
  },
];

const DATA = {
  enabled: true,
  from: "2026-10-06",
  to: "2026-11-05",
  rows: ROWS,
  totals: { itemsViewed: 200, itemsAddedToCart: 50, itemsPurchased: 10, itemRevenue: 740 },
  excludedCount: 0,
};

const renderPanel = (props = {}) =>
  render(
    <Ga4FunnelPanel
      data={DATA}
      loading={false}
      error={null}
      onRetry={vi.fn()}
      periodLabel="Last 30 days"
      {...props}
    />,
  );

describe("Ga4FunnelPanel", () => {
  it("shows the three funnel steps with step-to-step conversion", () => {
    renderPanel();

    expect(screen.getAllByText("Viewed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Added to cart").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Booked").length).toBeGreaterThan(0);
    expect(screen.getAllByText("200").length).toBeGreaterThan(0);
    expect(screen.getAllByText("50").length).toBeGreaterThan(0);
    expect(screen.getByText(/25\.0% of previous step/)).toBeInTheDocument();
    expect(screen.getByText(/20\.0% of previous step/)).toBeInTheDocument();
  });

  it("names the biggest drop-off", () => {
    renderPanel();

    expect(screen.getByText(/Biggest drop-off/)).toBeInTheDocument();
    // 50 carted → 10 booked is the weaker step (80% lost vs 75%).
    expect(screen.getByText(/Added to cart → Booked/)).toBeInTheDocument();
  });

  it("lists every product with its revenue", () => {
    renderPanel();

    expect(screen.getByText("Accra Guided City Tour")).toBeInTheDocument();
    expect(screen.getByText("Waterfalls & Aburi Gardens")).toBeInTheDocument();
    expect(screen.getAllByText("$420.00").length).toBeGreaterThan(0);
  });

  it("explains a missing GA4 connection instead of printing zeros", () => {
    renderPanel({ data: { enabled: false, reason: "GA4 reporting is not configured." } });

    expect(screen.getByText("Not connected to Google Analytics")).toBeInTheDocument();
    expect(screen.getByText("GA4 reporting is not configured.")).toBeInTheDocument();
    expect(screen.queryByText("0")).toBeNull();
  });

  it("offers a retry when the request failed", async () => {
    const onRetry = vi.fn();
    renderPanel({ error: "GA4 timeout", onRetry });

    expect(screen.getByText("Couldn't load the storefront funnel")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("says there was no activity rather than showing an empty table", () => {
    renderPanel({ data: { ...DATA, rows: [], totals: { itemsViewed: 0, itemsAddedToCart: 0, itemsPurchased: 0, itemRevenue: 0 } } });

    expect(screen.getByText("No product activity in this period")).toBeInTheDocument();
  });
});
