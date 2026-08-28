/**
 * Shared map configuration + warm-up helpers for the MapLibre pickers
 * (pickup geoshape editor, location picker, read-only previews).
 *
 * A single source of truth for the tile style and default camera so the
 * per-file constants never drift. All helpers are pure/side-effect-light so
 * they are easy to unit-test; `warmMapResources` is idempotent and safe to
 * call from anywhere.
 */

export const DEFAULT_CENTER = { lng: -0.187, lat: 5.6037 };

export const TILE_STYLE = "https://tiles.openfreemap.org/styles/liberty";

const TILE_ORIGIN = "https://tiles.openfreemap.org";

let warmed = false;

/**
 * Warm the map's connection + style cache ahead of the modal opening so the
 * first paint feels instant. Idempotent: runs once per page load. Injects a
 * preconnect hint for the tile host and force-caches the style JSON. The
 * fetch result is intentionally ignored — this is purely a cache warmer.
 */
export function warmMapResources() {
  if (warmed) return;
  warmed = true;

  if (typeof document !== "undefined") {
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = TILE_ORIGIN;
    document.head.appendChild(link);
  }

  if (typeof window !== "undefined") {
    window
      .fetch(TILE_STYLE, { cache: "force-cache", mode: "cors" })
      .catch(() => {
        // Best-effort warm-up; a failed prefetch must never break the app.
      });
  }
}

/**
 * Compute the camera to open a geoshape map on, purely from the saved data:
 * - A drawn zone (>= 3 vertices) → bounds that frame it.
 * - A location point → centered at street zoom.
 * - Otherwise → the app default at city zoom.
 *
 * Returns MapLibre-compatible options: `{ bounds }` or `{ center, zoom }`.
 * `bounds` is a plain [sw, ne] LngLatBoundsLike pair (pure, no maplibre
 * import needed, unit-testable in jsdom).
 */
export function cameraFromGeoshape(zone, location) {
  if (Array.isArray(zone) && zone.length >= 3) {
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    for (const [lat, lng] of zone) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }
    return { bounds: [[minLng, minLat], [maxLng, maxLat]] };
  }
  if (location && location.lat != null && location.lng != null) {
    return { center: [location.lng, location.lat], zoom: 12 };
  }
  return { center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat], zoom: 11 };
}
