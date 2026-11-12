import config from "@/config";

const apiBase = config.api.baseURL;
const MIN_QUERY_LENGTH = 3;
const MAX_CACHE_SIZE = 50;

/**
 * Client wrapper for the backend's SerpApi Google Maps search
 * (`GET /locations/google-search`).
 *
 * SerpApi sends no CORS headers and its key must stay server-side, so the
 * browser only ever talks to our own API. The backend already normalizes each
 * Google Maps place into the same shape the rest of the location pickers use
 * (formatted address, city, region, country, postcode, coordinates) and
 * enriches vague Google addresses with a reverse-geocoded locality.
 *
 * Each uncached search can spend a SerpApi credit, so results (including
 * "no matches") are LRU-cached per query + search area. Callers should only
 * invoke this on an explicit user action, never while the user is typing.
 */

const cache = new Map();

function cacheKey(query, origin) {
  const lat = Number(origin?.lat);
  const lng = Number(origin?.lng);
  const area =
    Number.isFinite(lat) && Number.isFinite(lng)
      ? `${lat.toFixed(3)},${lng.toFixed(3)}`
      : "";
  return `${query.trim().toLowerCase()}|${area}`;
}

function getCached(key) {
  if (!cache.has(key)) return null;
  const entry = cache.get(key);
  // Refresh LRU position.
  cache.delete(key);
  cache.set(key, entry);
  return entry;
}

function setCached(key, results) {
  if (cache.has(key)) {
    cache.delete(key);
  } else if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, results);
}

/** Clears the in-memory cache — used by tests and forced refreshes. */
export function clearGoogleMapsCache() {
  cache.clear();
}

function normalizePlace(place) {
  if (!place || typeof place !== "object") return null;

  const latitude = Number(place.latitude);
  const longitude = Number(place.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const formatted = String(place.formatted || place.name || "").trim();
  if (!formatted) return null;

  return {
    formatted,
    city: String(place.city || ""),
    region: String(place.region || ""),
    country: String(place.country || ""),
    postcode: place.postcode ? String(place.postcode) : null,
    street: String(place.street || ""),
    latitude,
    longitude,
    source: "google_maps",
    placeId: place.externalId ? String(place.externalId) : null,
  };
}

/**
 * Searches Google Maps (through the backend proxy) for `query`, optionally
 * biased to `origin`.
 *
 * Resolves to `{ status, results }` and never throws:
 *   - ok            → results found
 *   - empty         → Google Maps returned no matches
 *   - not_configured→ the API has no SerpApi key
 *   - quota         → rate/quota exhausted upstream
 *   - invalid       → the query was shorter than 3 characters
 *   - unavailable   → network/upstream failure
 *   - aborted       → the caller cancelled the request
 */
export async function searchGoogleMaps(query, origin = null, { signal } = {}) {
  const q = String(query || "").trim();
  if (q.length < MIN_QUERY_LENGTH) return { status: "invalid", results: [] };

  const key = cacheKey(q, origin);
  const cached = getCached(key);
  if (cached) return { status: cached.length > 0 ? "ok" : "empty", results: cached };

  const params = new URLSearchParams({ q });
  const lat = Number(origin?.lat);
  const lng = Number(origin?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }

  let response;
  try {
    response = await fetch(`${apiBase}/locations/google-search?${params.toString()}`, {
      headers: { accept: "application/json" },
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") return { status: "aborted", results: [] };
    return { status: "unavailable", results: [] };
  }

  if (!response.ok) {
    if (response.status === 429) return { status: "quota", results: [] };
    if (response.status === 400) return { status: "invalid", results: [] };
    return { status: "unavailable", results: [] };
  }

  const body = await response.json().catch(() => null);
  const data = body?.data;

  if (!data || data.ok !== true) {
    const reason = data?.reason;
    const status =
      reason === "quota"
        ? "quota"
        : reason === "not_configured"
          ? "not_configured"
          : reason === "invalid"
            ? "invalid"
            : "unavailable";
    return { status, results: [] };
  }

  const results = Array.isArray(data.results)
    ? data.results.map(normalizePlace).filter(Boolean)
    : [];

  setCached(key, results);
  return { status: results.length > 0 ? "ok" : "empty", results };
}
