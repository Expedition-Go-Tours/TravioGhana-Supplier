import { describe, expect, it } from "vitest";
import { isIndividualSupplier, INDIVIDUAL_SUPPLIER_TYPES } from "../supplierKind";

describe("isIndividualSupplier", () => {
  it("treats individual guide / experience host / driver choices as individuals", () => {
    expect(isIndividualSupplier({ supplierChoice: "individual_guide" })).toBe(true);
    expect(isIndividualSupplier({ supplierChoice: "experience_host" })).toBe(true);
    expect(isIndividualSupplier({ supplierChoice: "independent_driver" })).toBe(true);
  });

  it("treats company choices as businesses", () => {
    expect(isIndividualSupplier({ supplierChoice: "registered_company" })).toBe(false);
    expect(isIndividualSupplier({ supplierChoice: "sole_proprietor" })).toBe(false);
    expect(isIndividualSupplier({ supplierChoice: "transport_company" })).toBe(false);
  });

  it("falls back to supplierType when the choice is absent", () => {
    expect(isIndividualSupplier({ supplierType: "TOUR_GUIDE" })).toBe(true);
    expect(isIndividualSupplier({ supplierType: "VEHICLE_OPERATOR" })).toBe(true);
    expect(isIndividualSupplier({ supplierType: "OTHER_SERVICE_PROVIDER" })).toBe(true);
    expect(isIndividualSupplier({ supplierType: "TOUR_COMPANY" })).toBe(false);
    expect(isIndividualSupplier({ supplierType: "TRANSPORTATION_PROVIDER" })).toBe(false);
    expect(isIndividualSupplier({ supplierType: "ACCOMMODATION_PROVIDER" })).toBe(false);
  });

  it("prefers the explicit choice over the mapped type", () => {
    // sole_proprietor is a business even though the enum alone cannot tell.
    expect(
      isIndividualSupplier({ supplierType: "TOUR_COMPANY", supplierChoice: "sole_proprietor" }),
    ).toBe(false);
    expect(
      isIndividualSupplier({ supplierType: "TOUR_COMPANY", supplierChoice: "individual_guide" }),
    ).toBe(true);
  });

  it("returns null when neither signal is present", () => {
    expect(isIndividualSupplier({})).toBeNull();
    expect(isIndividualSupplier()).toBeNull();
    expect(isIndividualSupplier({ supplierType: null, supplierChoice: null })).toBeNull();
  });

  it("exposes the individual supplier types for callers", () => {
    expect(INDIVIDUAL_SUPPLIER_TYPES.has("TOUR_GUIDE")).toBe(true);
    expect(INDIVIDUAL_SUPPLIER_TYPES.has("TOUR_COMPANY")).toBe(false);
  });
});