/**
 * Product-builder categories — derived from the supplier's application
 * services (the "What would you like to sell?" step) instead of a fixed list.
 *
 * The wizard persists `operatingInfo.services` as the storefront's labels
 * ("Tours & Activities", "Airport Transfers", "Private Transport",
 * "Other Experience"), but older rows may hold the raw ids ("tours",
 * "airport_transfers", "private_transport", "other_experience"). Matching is
 * case-insensitive on either shape — the same convention the backend uses in
 * `supplierVerificationRequirements`.
 *
 * Rendering rules for the product builder's category step:
 *   - only tours selected            → Tour + Activity
 *   - only transport selected        → Transport
 *   - anything else (Other Experience
 *     present, mixes, empty/unknown) → all three (the safe default — a
 *     supplier we cannot classify still sees the full current experience)
 */
export const ALL_PRODUCT_CATEGORIES = ['tour', 'activity', 'transport']

const TOURS_RE = /tour/
const TRANSPORT_RE = /transport|transfer|airport/

/** "Tours & Activities" / "tours" — the tours card and its legacy id. */
export function isToursService(service) {
  return TOURS_RE.test(String(service ?? '').toLowerCase())
}

/** "Airport Transfers" / "Private Transport" and their legacy ids. */
export function isTransportService(service) {
  return TRANSPORT_RE.test(String(service ?? '').toLowerCase())
}

/**
 * Which product categories a supplier may create, based on what they applied
 * to sell. Always returns a non-empty list; unknown/empty/mixed selections
 * fall back to all categories.
 */
export function productCategoriesForServices(services = []) {
  const list = Array.isArray(services) ? services : []
  if (list.length === 0) return [...ALL_PRODUCT_CATEGORIES]

  if (list.every(isTransportService)) return ['transport']
  if (list.every(isToursService)) return ['tour', 'activity']
  return [...ALL_PRODUCT_CATEGORIES]
}