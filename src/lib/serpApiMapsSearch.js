/**
 * Client wrapper for the backend's `/locations/google-search` route (SerpApi
 * Google Maps search, Ghana-only).
 *
 * Why this exists: the supplier's pickup planner searches a curated places
 * catalog plus three free geocoders. A small hotel, a village junction or a
 * landmark can exist on Google Maps and in none of those — until now the only
 * way to set such a pickup was to click a pin on the map and hope the reverse
 * geocoder named it correctly. The storefront solved this months ago with an
 * explicit "Search Google Maps" fallback; this is the same thing here.
 *
 * The SerpApi key lives on the API server and NEVER reaches the browser — this
 * module only ever calls our own route (see `noClientSerpKey` test: a build
 * that references the key in client code fails).
 *
 * Results are LRU-cached per query + search area, so re-running the same
 * search never spends another SerpApi credit on either side.
 */

export const GOOGLE_PLACE_SOURCE = "google_maps";

/** @typedef {'ok' | 'empty' | 'not_configured' | 'quota' | 'invalid' | 'unavailable'} GoogleSearchStatus */

/**
 * @typedef {Object} GoogleMapPlace
 * @property {string} formatted
 * @property {number|null} latitude
 * @property {number|null} longitude
 * @property {string} [name]
 * @property {string} [source]
 */

const MAX_CACHE_SIZE = 50;
const cache = new Map();

/** Clears the in-memory cache (tests, or a forced refresh). */
export function clearGoogleMapsCache() {
  cache.clear();
}

function cacheKey(query, origin) {
  const area = origin ? `${origin.lat.toFixed(3)},${origin.lng.toFixed(3)}` : "";
  return `${query.trim().toLowerCase()}|${area}`;
}

function getCached(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  // Refresh LRU position.
  cache.delete(key);
  cache.set(key, hit);
  return hit;
}

function setCached(key, places) {
  if (cache.has(key)) {
    cache.delete(key);
  } else if (cache.size >= MAX_CACHE_SIZE) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, places);
}

/**
 * Search Google Maps for a place the ordinary providers missed.
 *
 * NEVER throws: callers switch on `status` to decide what to render, because
 * "this server has no key", "the quota is spent" and "no matches" are three
 * different things and must not look the same in the picker.
 *
 * @param {string} query
 * @param {{lat: number, lng: number}|null} [origin]  search-area bias
 * @returns {Promise<{status: GoogleSearchStatus, results: GoogleMapPlace[]}>}
 */
export async function searchGoogleMaps(query, origin = null) {
  const q = (query || "").trim();
  if (q.length < 3) return { status: "invalid", results: [] };

  const key = cacheKey(q, origin);
  const cached = getCached(key);
  // An empty cached result is still a real answer ("Google Maps has nothing
  // either") and costs nothing to repeat.
  if (cached) return { status: cached.length > 0 ? "ok" : "empty", results: cached };

  const params = new URLSearchParams({ q });
  if (origin) {
    params.set("lat", String(origin.lat));
    params.set("lng", String(origin.lng));
  }

  let response;
  try {
    response = await fetch(`/locations/google-search?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
  } catch {
    return { status: "unavailable", results: [] };
  }

  if (!response.ok) {
    return { status: response.status === 429 ? "quota" : "unavailable", results: [] };
  }

  let body;
  try {
    body = await response.json();
  } catch {
    return { status: "unavailable", results: [] };
  }

  const outcome = body?.data ?? body ?? {};
  if (outcome.ok === false) {
    const reason = outcome.reason;
    const status =
      reason === "not_configured"
        ? "not_configured"
        : reason === "quota"
          ? "quota"
          : reason === "invalid"
            ? "invalid"
            : "unavailable";
    return { status, results: [] };
  }

  const results = Array.isArray(outcome.results) ? outcome.results : [];
  setCached(key, results);
  return { status: results.length > 0 ? "ok" : "empty", results };
}
