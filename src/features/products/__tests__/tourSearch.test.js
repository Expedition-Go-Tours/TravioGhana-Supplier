import { describe, it, expect } from "vitest";
import { tourSearchText, searchTours, tourSubtitle } from "../tourSearch";

const tour = (overrides = {}) => ({
  id: "t1",
  title: "Victoria Falls Helicopter Tour",
  category: "Adventure",
  city: "Livingstone",
  country: "Zambia",
  tags: ["helicopter", "waterfall"],
  referenceCode: "VIC-HELI-001",
  description: "Fly over the world's largest curtain of falling water.",
  ...overrides,
});

describe("tourSearchText", () => {
  it("concatenates searchable fields", () => {
    const text = tourSearchText(tour());
    expect(text).toContain("victoria falls helicopter tour");
    expect(text).toContain("adventure");
    expect(text).toContain("livingstone");
    expect(text).toContain("zambia");
    expect(text).toContain("helicopter");
    expect(text).toContain("vic-heli-001");
    expect(text).toContain("curtain of falling water");
  });

  it("falls back to categorization.category", () => {
    const t = tour({ category: undefined, categorization: { category: "Cultural" } });
    expect(tourSearchText(t)).toContain("cultural");
  });

  it("handles null/empty input", () => {
    expect(tourSearchText(null)).toBe("");
    expect(tourSearchText(undefined)).toBe("");
  });

  it("includes itinerary stop names, cities and regions", () => {
    const text = tourSearchText(
      tour({
        productContent: {
          locations: [
            { name: "Cedi bead Factory Akosombo", city: "Accra", region: "Greater Accra" },
            { name: "Akosombo Shrine", city: "Koforidua", region: "Eastern" },
          ],
        },
      }),
    );
    expect(text).toContain("cedi bead factory akosombo");
    expect(text).toContain("akosombo shrine");
    expect(text).toContain("koforidua");
  });

  it("includes the server-extracted itinerary city list", () => {
    expect(tourSearchText(tour({ itineraryCities: ["Koforidua", "Akosombo"] }))).toContain("koforidua");
  });

  it("ignores missing or malformed itinerary data", () => {
    expect(() => tourSearchText(tour({ productContent: null }))).not.toThrow();
    expect(() => tourSearchText(tour({ productContent: [] }))).not.toThrow();
    expect(() => tourSearchText(tour({ productContent: { locations: [null, "x"] } }))).not.toThrow();
    expect(tourSearchText(tour({ productContent: { locations: [] } }))).toContain("victoria falls");
  });
});

describe("searchTours", () => {
  const tours = [
    tour(),
    tour({
      id: "t2",
      title: "Safari at Serengeti",
      category: "Nature",
      city: "Arusha",
      country: "Tanzania",
      tags: ["safari", "wildlife"],
      referenceCode: "SER-001",
      description: "Track the great migration.",
    }),
  ];

  it("matches by title", () => {
    expect(searchTours(tours, "safari").map((t) => t.id)).toEqual(["t2"]);
  });

  it("matches by category, city or country", () => {
    expect(searchTours(tours, "livingstone").map((t) => t.id)).toEqual(["t1"]);
    expect(searchTours(tours, "nature").map((t) => t.id)).toEqual(["t2"]);
    expect(searchTours(tours, "tanzania").map((t) => t.id)).toEqual(["t2"]);
  });

  it("matches by reference code", () => {
    expect(searchTours(tours, "VIC-HELI").map((t) => t.id)).toEqual(["t1"]);
  });

  it("is case-insensitive", () => {
    expect(searchTours(tours, "VICTORIA").map((t) => t.id)).toEqual(["t1"]);
  });

  it("returns [] for empty query or no matches", () => {
    expect(searchTours(tours, "")).toEqual([]);
    expect(searchTours(tours, "   ")).toEqual([]);
    expect(searchTours(tours, "nothing-here")).toEqual([]);
  });

  it("returns [] for null list", () => {
    expect(searchTours(null, "safari")).toEqual([]);
  });

  it("finds a tour by an itinerary stop name or stop city", () => {
    const withStops = tour({
      id: "t3",
      title: "Akosombo: African spirituality shrine experience",
      description: "Shrine experience.",
      city: "Accra",
      productContent: {
        locations: [
          { name: "Cedi bead Factory Akosombo", city: "Accra" },
          { name: "dkdkdk", city: "Koforidua" },
        ],
      },
    });

    expect(searchTours([withStops], "Cedi bead Factory Akosombo").map((t) => t.id)).toEqual(["t3"]);
    expect(searchTours([withStops], "dkdkdk").map((t) => t.id)).toEqual(["t3"]);
    expect(searchTours([withStops], "Koforidua").map((t) => t.id)).toEqual(["t3"]);
  });
});

describe("tourSubtitle", () => {
  it("combines category and location", () => {
    expect(tourSubtitle(tour())).toBe("Adventure • Livingstone, Zambia");
  });

  it("falls back to status label when no location", () => {
    expect(tourSubtitle(tour({ category: undefined, city: undefined, country: undefined, status: "PENDING_APPROVAL" }))).toBe("PENDING APPROVAL");
  });

  it("returns empty string for empty tour", () => {
    expect(tourSubtitle({})).toBe("");
  });
});
