/**
 * Product-builder category gating — the category step renders only what the
 * supplier applied to sell: tours-only → Tour + Activity, transport-only →
 * Transport, everything else (Other Experience, mixes, unknown/empty) → all.
 */
import { describe, expect, it } from "vitest";
import {
  ALL_PRODUCT_CATEGORIES,
  isToursService,
  isTransportService,
  productCategoriesForServices,
} from "../productCategories";

describe("isToursService / isTransportService", () => {
  it("matches storefront labels case-insensitively", () => {
    expect(isToursService("Tours & Activities")).toBe(true);
    expect(isToursService("TOURS & ACTIVITIES")).toBe(true);
    expect(isToursService("Airport Transfers")).toBe(false);
    expect(isToursService("Private Transport")).toBe(false);
    expect(isToursService("Other Experience")).toBe(false);

    expect(isTransportService("Airport Transfers")).toBe(true);
    expect(isTransportService("Private Transport")).toBe(true);
    expect(isTransportService("Tours & Activities")).toBe(false);
    expect(isTransportService("Other Experience")).toBe(false);
  });

  it("matches legacy ids", () => {
    expect(isToursService("tours")).toBe(true);
    expect(isToursService("airport_transfers")).toBe(false);
    expect(isTransportService("airport_transfers")).toBe(true);
    expect(isTransportService("private_transport")).toBe(true);
    expect(isTransportService("other_experience")).toBe(false);
  });

  it("treats nullish entries as non-matches", () => {
    expect(isToursService(null)).toBe(false);
    expect(isToursService(undefined)).toBe(false);
    expect(isTransportService("")).toBe(false);
  });
});

describe("productCategoriesForServices", () => {
  it.each([
    // Tours-only → Tour + Activity
    [["Tours & Activities"], ["tour", "activity"]],
    [["tours"], ["tour", "activity"]],
    [["TOURS & ACTIVITIES"], ["tour", "activity"]],
    // Transport-only → Transport
    [["Airport Transfers"], ["transport"]],
    [["Private Transport"], ["transport"]],
    [["airport_transfers"], ["transport"]],
    [["private_transport"], ["transport"]],
    [["Airport Transfers", "Private Transport"], ["transport"]],
    [["Private Transport", "airport_transfers"], ["transport"]],
    // Other Experience alone → all three
    [["Other Experience"], ["tour", "activity", "transport"]],
    [["other_experience"], ["tour", "activity", "transport"]],
    // Mixes → all three
    [["Tours & Activities", "Airport Transfers"], ["tour", "activity", "transport"]],
    [["Tours & Activities", "Private Transport"], ["tour", "activity", "transport"]],
    [["Tours & Activities", "Other Experience"], ["tour", "activity", "transport"]],
    [["Airport Transfers", "Other Experience"], ["tour", "activity", "transport"]],
    [["Tours & Activities", "Airport Transfers", "Private Transport", "Other Experience"], ["tour", "activity", "transport"]],
    // Unknown/legacy noise → all three (safe default)
    [["Bungee jumping"], ["tour", "activity", "transport"]],
    [["Tours & Activities", null], ["tour", "activity", "transport"]],
  ])("%j → %j", (services, expected) => {
    expect(productCategoriesForServices(services)).toEqual(expected);
  });

  it("falls back to all categories when services are missing", () => {
    expect(productCategoriesForServices()).toEqual(ALL_PRODUCT_CATEGORIES);
    expect(productCategoriesForServices([])).toEqual(ALL_PRODUCT_CATEGORIES);
    expect(productCategoriesForServices(null)).toEqual(ALL_PRODUCT_CATEGORIES);
    expect(productCategoriesForServices(undefined)).toEqual(ALL_PRODUCT_CATEGORIES);
    expect(productCategoriesForServices("Tours & Activities")).toEqual(ALL_PRODUCT_CATEGORIES);
  });

  it("returns a fresh array each call (no shared mutable state)", () => {
    const a = productCategoriesForServices(["tours"]);
    const b = productCategoriesForServices(["tours"]);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});