/**
 * The cancellation card must not present a supplier-caused rate in isolation.
 *
 * A live 30-day card showed "11 of 56 bookings cancelled" next to 0% because
 * every one of those 11 cancellations was customer-initiated and the 56
 * included future travel dates. The headline therefore has to name all three
 * numbers, and the card must never claim a no-show target that belongs to a
 * different metric (ours counts traveller no-shows, not supplier no-shows).
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CancellationCard from "../components/CancellationCard";

const BASE_SUMMARY = {
  cancellationRate: 0,
  status: "Excellent",
  confirmed: 0,
  upcomingConfirmed: 5,
  cancelled: 11,
  supplierCausedCount: 0,
  excludedCancellations: 11,
  completed: 40,
  noShow: 0,
  noShowRate: 0,
  eligibleBookings: 51,
};

function renderCard(summary = BASE_SUMMARY, props = {}) {
  return render(<CancellationCard summary={summary} days={30} {...props} />);
}

describe("CancellationCard — headline", () => {
  it("shows all cancellations, supplier-caused cancellations and the rate together", () => {
    const { container } = renderCard();
    const text = container.textContent.replace(/\s+/g, " ");

    expect(text).toContain("11 cancellations");
    expect(text).toContain("0 supplier-caused");
    expect(text).toContain("0% rate");
    expect(text).toContain("Based on 51 eligible bookings in the last 30 days");
  });

  it("uses the singular noun for one cancellation", () => {
    const { container } = renderCard({
      ...BASE_SUMMARY,
      cancelled: 1,
      supplierCausedCount: 1,
      cancellationRate: 2,
      eligibleBookings: 50,
      status: "Above standard",
    });

    expect(container.textContent.replace(/\s+/g, " ")).toContain("1 cancellation ·");
  });

  it("shows the server grade and the 1% standard", () => {
    const { container } = renderCard();
    const text = container.textContent.replace(/\s+/g, " ");

    expect(text).toContain("Excellent");
    expect(text).toContain("GetYourGuide's standard is 1% or lower");
  });

  it("translates the pre-deploy status vocabulary instead of showing a blank badge", () => {
    const { container } = renderCard({ ...BASE_SUMMARY, status: "Good" });

    expect(container.textContent).toContain("Above standard");
    expect(container.textContent).not.toContain("Good");
  });

  it("does not claim a supplier no-show target for traveller no-shows", () => {
    const { container } = renderCard({ ...BASE_SUMMARY, noShowRate: 0.5 });
    const text = container.textContent.replace(/\s+/g, " ");

    expect(text).toContain("Traveller no-show");
    expect(text).toContain("You are still paid");
    expect(text).not.toContain("0.2%");
    expect(text).not.toContain("target");
  });
});

describe("CancellationCard — threshold legend", () => {
  it("labels the 1–2% band as above standard, not as good", () => {
    const { container } = renderCard();
    const text = container.textContent.replace(/\s+/g, " ");

    expect(text).toContain("Above standard ≤2%");
    expect(text).toContain("At risk ≤5%");
    expect(text).not.toContain("Good ≤2%");
    expect(text).not.toContain("Needs attention");
  });

  it("waives the grade below 10 eligible bookings without hiding the rate", () => {
    const { container } = renderCard({
      ...BASE_SUMMARY,
      eligibleBookings: 4,
      cancelled: 0,
      supplierCausedCount: 0,
      status: "Building performance record",
    });
    const text = container.textContent.replace(/\s+/g, " ");

    expect(text).toContain("Building performance record");
    expect(text).toContain("waived until you have 10 eligible bookings");
    expect(text).toContain("0 cancellations · 0 supplier-caused · 0% rate");
  });
});
