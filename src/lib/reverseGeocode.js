import config from "@/config";

const apiBase = config.api.baseURL;

/**
 * Reverse geocode a coordinate through the backend proxy (Geoapify with
 * provider fallbacks, cached server-side — no API key in the client).
 *
 * Resolves to the app's location shape, or `null` when the lookup fails. The
 * latitude/longitude always come back as the coordinates that were passed in,
 * so a reverse response that omits them can never blank a pin.
 */
export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`${apiBase}/locations/reverse?lat=${lat}&lng=${lng}`);
    if (!res.ok) return null;
    const body = await res.json();
    const data = body?.data?.results?.[0];
    if (!data) return null;
    return {
      formatted: data.formatted || "",
      city: data.city || "",
      country: data.country || "",
      region: data.region || "",
      latitude: lat,
      longitude: lng,
    };
  } catch {
    return null;
  }
}
