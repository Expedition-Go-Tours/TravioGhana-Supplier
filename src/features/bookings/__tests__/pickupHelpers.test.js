import { describe, expect, it } from "vitest";
import {
  isPickupIncomplete,
  pickupCoords,
  pickupDisplay,
  pickupMapsUrl,
} from "../lib/pickupHelpers";

describe("pickupDisplay", () => {
  it("prioritises the canonical street address over the legacy place label", () => {
    const display = pickupDisplay({
      place: "Kempinski Hotel",
      areaName: "East Legon",
      address: {
        name: "Kempinski Hotel",
        address: "12 Akuafo St, East Legon, Accra",
        lat: 5.6037,
        lng: -0.187,
      },
    });

    expect(display.primary).toBe("12 Akuafo St, East Legon, Accra");
    expect(display.secondary).toBe("Kempinski Hotel");
    expect(display.zone).toBe("East Legon");
    expect(display.hasAddress).toBe(true);
  });

  it("falls back through place, zone and coordinates", () => {
    expect(pickupDisplay({ place: "Blue gate" }).primary).toBe("Blue gate");
    expect(pickupDisplay({ areaName: "Airport" }).primary).toBe("Airport");
    expect(pickupDisplay({ lat: 5.6, lng: -0.2 }).primary).toBe("5.60000, -0.20000");
  });

  it("does not duplicate the same label as both primary and secondary", () => {
    const display = pickupDisplay({
      place: "Marriott Hotel",
      address: { name: "Marriott Hotel", address: "Marriott Hotel" },
    });
    expect(display.primary).toBe("Marriott Hotel");
    expect(display.secondary).toBe("");
  });
});

describe("pickupCoords", () => {
  it("prefers the address coordinates and falls back to top-level", () => {
    expect(pickupCoords({ address: { lat: 5.1, lng: -0.1 }, lat: 9.9, lng: 9.9 })).toEqual({
      lat: 5.1,
      lng: -0.1,
    });
    expect(pickupCoords({ lat: 5.2, lng: -0.2 })).toEqual({ lat: 5.2, lng: -0.2 });
  });

  it("treats 0 as a valid coordinate and rejects half a pair", () => {
    expect(pickupCoords({ address: { lat: 0, lng: 0 } })).toEqual({ lat: 0, lng: 0 });
    expect(pickupCoords({ address: { lat: 5.1, lng: null } })).toEqual({ lat: null, lng: null });
  });
});

describe("pickupMapsUrl", () => {
  it("uses exact coordinates when present", () => {
    expect(pickupMapsUrl({ address: { lat: 5.1, lng: -0.1 } })).toBe(
      "https://www.google.com/maps/search/?api=1&query=5.1,-0.1"
    );
  });

  it("falls back to an encoded address", () => {
    expect(pickupMapsUrl({ address: { address: "12 Akuafo St, Accra" } })).toBe(
      "https://www.google.com/maps/search/?api=1&query=12%20Akuafo%20St%2C%20Accra"
    );
    expect(pickupMapsUrl({})).toBeNull();
  });
});

describe("isPickupIncomplete", () => {
  it("requires a location and a time, but not instructions", () => {
    expect(
      isPickupIncomplete({ address: { address: "12 Akuafo St" }, time: "08:00" })
    ).toBe(false);
    expect(isPickupIncomplete({ address: { address: "12 Akuafo St" } })).toBe(true);
    expect(isPickupIncomplete({ time: "08:00" })).toBe(true);
    expect(isPickupIncomplete({ pickupLater: true })).toBe(true);
    expect(
      isPickupIncomplete({ address: { lat: 5.1, lng: -0.1 }, time: "08:00" })
    ).toBe(false);
  });
});
