import { describe, expect, it } from "vitest";
import { buildRecommendations } from "../recommendations";

const SUMMARY = {
  bookings: { total: 12, previousTotal: 9 },
};

const GA4 = {
  enabled: true,
  rows: [
    { itemId: "t1", itemsViewed: 900, itemsAddedToCart: 40, itemsPurchased: 3 },
    { itemId: "t2", itemsViewed: 120, itemsAddedToCart: 8, itemsPurchased: 4 },
  ],
};

const PRODUCTS = [
  { tourId: "t1", name: "Shai Hills Safari", rating: 4.6, bookings: 3 },
  { tourId: "t2", name: "Cape Coast Castle", rating: 0, bookings: 4 },
];

describe("buildRecommendations", () => {
  it("names a product that gets views but few bookings", () => {
    const actions = buildRecommendations({
      summary: SUMMARY,
      products: PRODUCTS,
      ga4: GA4,
      cancellation: { cancellationRate: 0, eligibleBookings: 40 },
    });

    const weak = actions.find((action) => action.id === "weak-conversion");
    expect(weak).toBeTruthy();
    expect(weak.title).toContain("Shai Hills Safari");
    expect(weak.detail).toContain("900 views");
    expect(weak.detail).toContain("0.3% booked");
  });

  it("asks for reviews on a product with bookings and no rating", () => {
    const actions = buildRecommendations({ summary: SUMMARY, products: PRODUCTS, ga4: GA4 });

    const reviews = actions.find((action) => action.id === "no-reviews");
    expect(reviews).toBeTruthy();
    expect(reviews.title).toContain("Cape Coast Castle");
    expect(reviews.detail).toContain("4 recent guests");
  });

  it("flags a cancellation rate above the 2% standard", () => {
    const actions = buildRecommendations({
      summary: SUMMARY,
      products: [],
      ga4: { enabled: true, rows: [] },
      cancellation: { cancellationRate: 3.4, eligibleBookings: 58 },
    });

    const cancellation = actions.find((action) => action.id === "cancellation-rate");
    expect(cancellation.title).toContain("3.4%");
    expect(cancellation.detail).toContain("58 eligible bookings");
    expect(cancellation.severity).toBe("warning");
  });

  it("tells a new supplier to connect GA4 instead of inventing conversion", () => {
    const actions = buildRecommendations({
      summary: SUMMARY,
      products: PRODUCTS,
      ga4: { enabled: false, rows: [] },
    });

    expect(actions.find((action) => action.id === "ga4")).toMatchObject({
      title: "Connect Google Analytics",
      to: null,
    });
  });

  it("sends a supplier with no bookings to availability", () => {
    const actions = buildRecommendations({
      summary: { bookings: { total: 0, previousTotal: 0 } },
      products: [],
      ga4: { enabled: true, rows: [] },
    });

    expect(actions.find((action) => action.id === "no-bookings")?.to).toBe("/availability");
  });

  it("returns nothing when there is nothing worth flagging", () => {
    const actions = buildRecommendations({
      summary: SUMMARY,
      products: [{ tourId: "t9", name: "Cape Coast Castle", rating: 4.4, bookings: 20 }],
      ga4: { enabled: true, rows: [{ itemId: "t9", itemsViewed: 300, itemsPurchased: 30 }] },
      cancellation: { cancellationRate: 0, eligibleBookings: 40 },
    });

    expect(actions).toEqual([]);
  });

  it("caps the list at four actions", () => {
    const actions = buildRecommendations({
      summary: { bookings: { total: 0 } },
      products: PRODUCTS,
      ga4: GA4,
      cancellation: { cancellationRate: 9, eligibleBookings: 10 },
    });

    expect(actions.length).toBeLessThanOrEqual(4);
  });
});
