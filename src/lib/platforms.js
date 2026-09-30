/**
 * Public tour platforms — where a product can be live.
 *
 * - Travio Ghana  (travioghana.com): the Ghana catalog. Every ACTIVE Ghana tour is
 *   automatically live here.
 * - ExpeditionGo   (expeditiongotours.com): live whenever the tour is
 *   published on Expedition Go (`expeditionTour.isActive === true`), regardless
 *   of its booking flow (DIRECT or EXTERNAL).
 *
 * URL shapes:
 *   - https://travioghana.com/tour/{slug}          (matches the Travio Ghana router — singular)
 *   - https://expeditiongotours.com/tour/{slug} (matches the ExpeditionGo router)
 */
import { Compass, Plane } from "lucide-react";
import { config } from "@/config";

// Env-backed with hard production fallbacks: a stale config module or a missing
// env value must never disable the preview link for a live tour.
// This was TRAVIO_AFRICA_URL until now. It always held the Ghana URL, but
// Travio Africa is a separate brand on travioafrica.com (config/brands.js), so
// the old name read as a bug the moment anyone looked at it.
export const TRAVIO_GHANA_URL = config.VITE_TRAVIO_GHANA_URL || "https://travioghana.com";
export const EXPEDITION_GO_URL = config.VITE_EXPEDITION_GO_URL || "https://expeditiongotours.com";

export const TOUR_PLATFORMS = [
  {
    key: "travio_ghana",
    name: "Travio Ghana",
    domain: "travioghana.com",
    baseUrl: TRAVIO_GHANA_URL,
    icon: Compass,
    accent: "emerald",
    pathFor: (slug) => `/tour/${slug}`,
  },
  {
    key: "expedition_go",
    name: "ExpeditionGo",
    domain: "expeditiongotours.com",
    baseUrl: EXPEDITION_GO_URL,
    icon: Plane,
    accent: "sky",
    pathFor: (slug) => `/tour/${slug}`,
  },
];

/**
 * The "Live Site" destinations offered in the supplier sidebar.
 *
 * Filtered by the storefronts the API reports for the BUSINESS
 * (`/settings/team/my-role` → `storefronts`, derived from the owner's brand
 * roles in config/brands.js: ghana | expedition). `key` is that API value.
 *
 * Order is menu order — Travio Ghana first. Favicons are bundled rather than
 * hotlinked: the sidebar must paint without a round trip to either store, and
 * a dead link must not leave a broken image next to "Live Site".
 */
export const LIVE_SITES = [
  {
    key: "GHANA",
    name: "Travio Ghana",
    domain: "travioghana.com",
    url: TRAVIO_GHANA_URL,
    favicon: "/icons/v2/favicon-32x32.png",
  },
  {
    key: "EXPEDITION",
    name: "ExpeditionGo",
    domain: "expeditiongotours.com",
    url: EXPEDITION_GO_URL,
    favicon: "/icons/store/expedition-32x32.png",
  },
];

export function platformUrl(platform, slug) {
  const base = platform?.baseUrl;
  if (!base || !/^https?:\/\//.test(base)) return null;
  const clean = base.replace(/\/$/, "");
  return `${clean}${platform.pathFor(encodeURIComponent(slug))}`;
}

/**
 * Determine which platform(s) a product is currently live on.
 *   - Travio Africa: every ACTIVE tour is automatically live there.
 *   - ExpeditionGo: shown whenever `expeditionTour.isActive === true`, regardless
 *     of booking flow (DIRECT or EXTERNAL).
 * @param {{ slug?: string, status?: string, expeditionTour?: { isActive?: boolean, bookingFlow?: string } }} product
 * @returns {{ platform: typeof TOUR_PLATFORMS[number], url: string }[]}
 */
export function getLivePlatforms(product) {
  const slug = product?.slug;
  if (!slug) return [];

  const status = product?.status;
  const exp = product?.expeditionTour || {};

  const [travio, expedition] = TOUR_PLATFORMS;

  const live = [];
  if (status === "ACTIVE") {
    const url = platformUrl(travio, slug);
    if (url) live.push({ platform: travio, url });
  }
  if (exp.isActive === true) {
    const url = platformUrl(expedition, slug);
    if (url) live.push({ platform: expedition, url });
  }
  return live;
}
