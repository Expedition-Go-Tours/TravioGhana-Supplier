/**
 * Derives whether a supplier is an *individual* (tour guide / driver /
 * experience host) or a *registered business* — mirroring the application
 * form's supplier-choice semantics (TravioGhana-Store supplierRegistration.ts
 * and the backend's SUPPLIER_CHOICES map).
 *
 * The form stores the 6-way choice id in `businessInfo.supplierChoice` and
 * also maps it to a `SupplierType` column. Either source can be absent
 * depending on how old the row is, so both are consulted:
 *
 *   - `supplierChoice` is the most specific signal when present.
 *   - otherwise the `supplierType` enum (TOUR_GUIDE / VEHICLE_OPERATOR /
 *     OTHER_SERVICE_PROVIDER are individuals).
 *
 * Returns `true | false | null` — `null` means "cannot tell from the data",
 * and callers should keep their legacy behaviour in that case.
 */
export const INDIVIDUAL_SUPPLIER_TYPES = Object.freeze(
  new Set(["TOUR_GUIDE", "VEHICLE_OPERATOR", "OTHER_SERVICE_PROVIDER"]),
);

const CHOICE_KIND = Object.freeze({
  registered_company: "business",
  sole_proprietor: "business",
  transport_company: "business",
  individual_guide: "individual",
  experience_host: "individual",
  independent_driver: "individual",
});

export function isIndividualSupplier({ supplierType, supplierChoice } = {}) {
  if (supplierChoice && CHOICE_KIND[supplierChoice]) {
    return CHOICE_KIND[supplierChoice] === "individual";
  }
  if (supplierType) {
    return INDIVIDUAL_SUPPLIER_TYPES.has(supplierType);
  }
  return null;
}