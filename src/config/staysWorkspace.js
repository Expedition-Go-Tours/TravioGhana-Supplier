/**
 * Stays workspace — shared vocabulary.
 *
 * The supplier portal hosts two workspaces: the original Experiences one
 * (tours, transfers, activities) and Stays (accommodation listings). This
 * module is the single source of truth for:
 *
 *   - the workspace identifiers (`WORKSPACES`);
 *   - deciding whether a supplier belongs to the Stays workspace by default,
 *     from the services they applied to sell (`operatingInfo.services`);
 *   - which route each workspace owns, so the shell can pick the right chrome
 *     for deep links.
 *
 * Service matching follows the same convention as
 * `features/products/utils/productCategories.js`: the backend stores either
 * the storefront label ("Accommodation") or the legacy id ("accommodation"),
 * and matching is case-insensitive on either shape. Unknown/empty service
 * lists deliberately fall back to Experiences only — a Stays workspace is
 * never force-opened for a supplier we cannot classify.
 */

export const WORKSPACES = {
  EXPERIENCES: "experiences",
  STAYS: "stays",
};

/** Route prefix owned by each workspace. Shared routes belong to neither. */
export const WORKSPACE_ROUTES = {
  [WORKSPACES.STAYS]: "/stays",
};

/**
 * Matches the accommodation service in any of the shapes it has shipped as:
 * "Accommodation", "accommodation_provider", "Stays", "Hotels & Lodging", …
 */
const ACCOMMODATION_RE =
  /stay|accommodat|hotel|lodge|guesthouse|guest\s*house|hostel|villa|apartment|resort|homestay|bed\s*&?\s*breakfast|\bbnb\b|property|properties/;

/** "Accommodation" / "accommodation_provider" → true. */
export function isAccommodationService(service) {
  return ACCOMMODATION_RE.test(String(service ?? "").toLowerCase());
}

/** True when any of the supplier's services means "lists accommodation". */
export function hasAccommodationService(services = []) {
  const list = Array.isArray(services) ? services : [];
  return list.some(isAccommodationService);
}

/**
 * Pull `operatingInfo.services` out of a supplier profile. `businessInfo` is
 * stored either as an object or as a JSON string depending on the row's age,
 * so both shapes are accepted; everything else returns an empty list.
 */
export function extractSupplierServices(profile) {
  if (!profile) return [];
  let businessInfo = profile.businessInfo ?? profile.business_info ?? null;
  if (typeof businessInfo === "string") {
    try {
      businessInfo = JSON.parse(businessInfo);
    } catch {
      return [];
    }
  }
  const services =
    businessInfo?.operatingInfo?.services ??
    businessInfo?.operating_info?.services ??
    profile.services ??
    [];
  if (Array.isArray(services)) return services;
  if (typeof services === "string") {
    return services
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/** The workspace a supplier should land in when they have no preference yet. */
export function defaultWorkspaceForProfile(profile) {
  return hasAccommodationService(extractSupplierServices(profile))
    ? WORKSPACES.STAYS
    : WORKSPACES.EXPERIENCES;
}

/** Which workspace owns a pathname, or null when the route is shared. */
export function workspaceForPath(pathname) {
  if (/^\/stays(\/|$)/.test(pathname || "")) return WORKSPACES.STAYS;
  return null;
}

/**
 * Pages that belong to the ACCOUNT rather than to one workspace. Opening one
 * of these keeps whichever workspace is active — the Stays sidebar stays on
 * screen when you jump into Finance. Mirrors the prototype's SHARED ACCOUNT
 * group and stays in sync with `config/staysNav.js`.
 */
export const SHARED_ACCOUNT_ROUTES = [
  "/chat",
  "/finance",
  "/reviews",
  "/notifications",
  "/analytics",
  "/verification",
  "/settings",
];

/** `/finance`, `/chat/123` → true; `/products` → false. */
export function isSharedAccountRoute(pathname) {
  const path = (pathname || "").split(/[?#]/)[0];
  return SHARED_ACCOUNT_ROUTES.some(
    (route) => path === route || path.startsWith(`${route}/`),
  );
}
