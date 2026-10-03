/**
 * Pure coordinate helpers shared by the map pickers. Kept out of the
 * components so the validation rules are unit-testable in jsdom.
 */

/**
 * Validate a manually typed latitude/longitude pair. Returns `{ lat, lng }`,
 * or `null` when either value is missing, not a finite number, or outside the
 * valid coordinate ranges.
 */
export function parseCoordinateInput(rawLat, rawLng) {
  if (String(rawLat).trim() === "" || String(rawLng).trim() === "") return null;
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90) return null;
  if (lng < -180 || lng > 180) return null;
  return { lat, lng };
}
