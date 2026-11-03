/**
 * Who can open which page — one source of truth for the whole shell.
 *
 * The sidebar, the search palette and the route guards all read this map, so a
 * page can never end up in one place and not the other. Two bugs motivated it:
 *
 *   - the sidebar asked for `tours.manage`, a permission no role grants, which
 *     hid Special Offers from the very editors allowed to use it;
 *   - pages listed with no permission at all loaded for every role and then
 *     either 403'd or rendered an empty shell.
 *
 * A `null` permission means "every signed-in supplier can open this" — use it
 * only for pages that genuinely work for every role (the dashboard overview,
 * the cancellation gauge, the per-account notifications page and settings,
 * whose tabs are gated individually). Everything else must name the permission
 * the API enforces, using the keys from the API's permission model
 * (see config/teamPermissions.js on the backend).
 */
export const PAGE_ACCESS = {
  // Business overview — every role reads the same supplier numbers.
  "/": "dashboard.view",
  // Catalogue and bookings.
  "/products": "tours.view",
  "/bookings": "bookings.view",
  "/pickup-planner": "pickup.view",
  "/availability": "availability.view",
  // Special offers are a product edit, not a tour edit: products.update.
  "/special-offers": "products.update",
  // Cancellation gauge is a read-only rollup of the supplier's own rate.
  "/cancellation-rate": "cancellation.view",
  // Customer conversations (support) and public feedback.
  "/chat": "chat.view",
  "/reviews": "reviews.view",
  // Money.
  "/finance": "finance.view",
  // Business performance — the reporting page, not a per-booking tool.
  "/analytics": "analytics.view",
  // KYC documents and fleet/guides belong to the account owner.
  "/verification": "verification.view",
  // Notifications are per-account alerts: every member has their own inbox,
  // and it is filtered to the categories assigned to their role — so this page
  // opens for every role (`null`), exactly as the header note promises. The
  // `notifications.view` key stays in the catalog for stored roles but gates
  // nothing: a member with notifications assigned must not be refused by it.
  "/notifications": null,
  // Settings tabs are gated inside the page (each tab has its own key).
  "/settings": null,
};

/**
 * The permission a path needs, honouring nested routes (`/products/:id`,
 * `/special-offers/build/:id`) by matching the longest declared prefix.
 * Returns undefined for paths the map says nothing about (unknown routes).
 */
export function pageAccessFor(pathname) {
  const path = (pathname || "/").split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (path === "/") return { permission: PAGE_ACCESS["/"] };

  const match = Object.keys(PAGE_ACCESS)
    .filter((key) => key !== "/" && (path === key || path.startsWith(`${key}/`)))
    .sort((a, b) => b.length - a.length)[0];

  if (!match) return { permission: undefined };
  return { permission: PAGE_ACCESS[match] };
}

/** `canOpenPath(hasPermission, "/finance")` — true when no rule blocks it. */
export function canOpenPath(hasPermission, pathname) {
  const { permission } = pageAccessFor(pathname);
  if (permission === undefined) return true; // unknown route: let the 404 handle it
  if (!permission) return true;
  return hasPermission(permission);
}

/**
 * Why a button the role may not use is inert.
 *
 * Opening a page and changing it are separate permissions (the catalog's
 * `requires` only runs one way), so a role can legitimately hold, say,
 * `availability.view` without `availability.manage`. The route guard cannot
 * hide a button inside a page the role is allowed to open, so each button
 * carries this reason itself:
 *   - as a `title` on a wrapper SPAN when the button is icon-sized (a disabled
 *     button emits no pointer events, so `title` on the button never renders);
 *   - as visible text next to the control when there is room for a line.
 */
export const DENIED_ACTION_REASON =
  "Your role can't do this. Ask the business owner to update your role.";

/**
 * Settings tabs follow the same idea, one rule per tab: the key is what the
 * tab's WRITES require in the API, so nobody opens a form whose Save button is
 * guaranteed to 403. `security` carries no rule — every member may change
 * their own password and manage their own session.
 */
export const SETTINGS_TAB_ACCESS = {
  profile: "settings.business",
  notifications: "settings.notifications",
  payouts: "payout-methods.view",
  security: null,
  tax: "settings.tax",
  team: "team.view",
};

/** `canOpenSettingsTab(hasPermission, "team")` */
export function canOpenSettingsTab(hasPermission, tab) {
  const permission = SETTINGS_TAB_ACCESS[tab];
  if (permission === undefined) return true; // unknown tab: not our call to hide
  if (!permission) return true;
  return hasPermission(permission);
}

/**
 * A safe default when a role has no explicit landing page. The order matches
 * what a supplier is most likely to need first, and always ends at a page the
 * role can actually open. `/no-access` is the only path that needs no rules.
 */
export const LANDING_PRIORITY = [
  "/",
  "/bookings",
  "/products",
  "/pickup-planner",
  "/availability",
  "/chat",
  "/reviews",
  "/finance",
  "/analytics",
  // Settings last-but-one on purpose: `/notifications` is open to every role
  // (it is a member's own inbox), so listing it first would make it the
  // landing page for any role that can open nothing else — and Settings,
  // where a locked-out member can still see who they are and change their
  // password, is the more useful destination.
  "/settings",
  "/notifications",
];

export function firstAllowedPath(hasPermission) {
  return LANDING_PRIORITY.find((path) => canOpenPath(hasPermission, path)) || "/no-access";
}

/** Validate a role/member landing path against the permission map. */
export function isAllowedLandingPath(hasPermission, pathname) {
  if (!pathname || typeof pathname !== "string") return false;
  if (pathname === "/no-access") return true;
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return false;
  return canOpenPath(hasPermission, pathname);
}
