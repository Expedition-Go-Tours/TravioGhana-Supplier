import { config } from "@/config";

/**
 * The one permanent staging address. Its DNS already points at Vercel; it only
 * needs claiming in the dashboard.
 */
export const STAGING_HOSTNAME = "supplier-staging.travioghana.com";

export const PREVIEW_BANNER_TEXT =
  "PREVIEW · connected to production data — changes here affect real suppliers";

/**
 * Decides whether this deployment is a preview and returns the reason, or null
 * on the real site.
 *
 * Three independent triggers, checked in this order:
 *   1. VITE_APP_ENV=staging — explicit, set in Vercel's Preview scope
 *   2. the fixed staging domain — allow-listed once for Google/Firebase sign-in
 *   3. *.vercel.app — every per-branch preview, recognised with no config at all
 *
 * Deliberately hostname-driven as well as env-driven: if the Preview env scope
 * is empty (the most common way previews silently break) the banner still shows,
 * because the address alone gives it away. None of the three match localhost, so
 * local development stays quiet without a special case.
 *
 * Kept out of PreviewBanner.jsx because a component file may only export
 * components (react-refresh/only-export-components).
 */
export function detectPreview(hostname) {
  const host =
    hostname !== undefined
      ? hostname
      : (globalThis.location && globalThis.location.hostname) || "";

  if (config.isStaging()) return "app-env";
  if (host === STAGING_HOSTNAME) return "staging-domain";
  if (host.endsWith(".vercel.app")) return "vercel-preview";
  return null;
}
