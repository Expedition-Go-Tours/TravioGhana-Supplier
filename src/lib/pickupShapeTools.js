const EARTH_RADIUS_M = 6371008.8;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad) {
  return (rad * 180) / Math.PI;
}

/**
 * Move a [lat, lng] point by dx meters east and dy meters north.
 * Latitudes are clamped away from the poles so the longitude scale stays finite.
 */
export function offsetMeters([lat, lng], dx, dy) {
  const cosLat = Math.max(0.02, Math.cos(toRad(lat)));
  return [lat + toDeg(dy / EARTH_RADIUS_M), lng + toDeg(dx / (EARTH_RADIUS_M * cosLat))];
}

/** Great-circle distance in meters between two [lat, lng] points (haversine). */
export function distanceMeters(a, b) {
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Axis-aligned rectangle from two opposite corner points (either order). */
export function rectFromCorners(a, b) {
  return [
    [a[0], a[1]],
    [a[0], b[1]],
    [b[0], b[1]],
    [b[0], a[1]],
  ];
}

/** Axis-aligned square centered on `center`, half-width `radiusMeters` (extent ≈ 2r). */
export function squareFromCenter(center, radiusMeters) {
  return [
    offsetMeters(center, -radiusMeters, -radiusMeters),
    offsetMeters(center, radiusMeters, -radiusMeters),
    offsetMeters(center, radiusMeters, radiusMeters),
    offsetMeters(center, -radiusMeters, radiusMeters),
  ];
}

/** Equilateral triangle with one vertex pointing north, circumradius `radiusMeters`. */
export function triangleFromCenter(center, radiusMeters) {
  const angles = [Math.PI / 2, (7 * Math.PI) / 6, (11 * Math.PI) / 6];
  return angles.map((a) =>
    offsetMeters(center, radiusMeters * Math.cos(a), radiusMeters * Math.sin(a))
  );
}

/** { minLat, maxLat, minLng, maxLng } for a vertex list, or null when empty. */
export function polygonBounds(vertices) {
  if (!Array.isArray(vertices) || vertices.length === 0) return null;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const [lat, lng] of vertices) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  return { minLat, maxLat, minLng, maxLng };
}

/**
 * Ray-casting point-in-polygon test, winding-agnostic. A point exactly on the
 * boundary counts as inside (standard for pickup-zone verdicts).
 */
export function pointInPolygon([lat, lng], vertices) {
  if (!Array.isArray(vertices) || vertices.length < 3) return false;
  let inside = false;
  const n = vertices.length;
  for (let i = 0, j = n - 1; i < n; j = i, i += 1) {
    const [yi, xi] = vertices[i];
    const [yj, xj] = vertices[j];
    const intersects =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * Approximate bounding-box extent in meters, computed from the polygon's
 * centroid in a local equirectangular projection.
 */
export function polygonExtentMeters(vertices) {
  const bounds = polygonBounds(vertices);
  if (!bounds) return null;
  const cLat = (bounds.minLat + bounds.maxLat) / 2;
  const cLng = (bounds.minLng + bounds.maxLng) / 2;
  const toMeters = ([lat, lng]) => [
    (lng - cLng) * (EARTH_RADIUS_M * Math.cos(toRad(cLat)) * toRad(1)),
    (lat - cLat) * (EARTH_RADIUS_M * toRad(1)),
  ];
  const pts = vertices.map(toMeters);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}

/**
 * Polygon area in square meters via the shoelace formula in a local
 * equirectangular projection around the polygon's centroid. Accurate to a few
 * percent for pickup-sized zones — plenty for a display metric.
 */
export function polygonAreaMetersSq(vertices) {
  if (!Array.isArray(vertices) || vertices.length < 3) return 0;
  const bounds = polygonBounds(vertices);
  if (!bounds) return 0;
  const cLat = (bounds.minLat + bounds.maxLat) / 2;
  const cLng = (bounds.minLng + bounds.maxLng) / 2;
  const toMeters = ([lat, lng]) => [
    (lng - cLng) * (EARTH_RADIUS_M * Math.cos(toRad(cLat)) * toRad(1)),
    (lat - cLat) * (EARTH_RADIUS_M * toRad(1)),
  ];
  const pts = vertices.map(toMeters);
  let area = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
    area += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
  }
  return Math.abs(area) / 2;
}

/** Polygon area in square kilometers. */
export function polygonAreaKm2(vertices) {
  return polygonAreaMetersSq(vertices) / 1e6;
}

/** Ring perimeter in kilometers, summing great-circle edge lengths. */
export function polygonPerimeterKm(vertices) {
  if (!Array.isArray(vertices) || vertices.length < 3) return 0;
  let meters = 0;
  for (let i = 0; i < vertices.length; i += 1) {
    meters += distanceMeters(vertices[i], vertices[(i + 1) % vertices.length]);
  }
  return meters / 1000;
}

export const VERDICTS = {
  INSIDE: "inside",
  EXCLUDED: "excluded",
  OUTSIDE: "outside",
  NO_ZONE: "no-zone",
};

/**
 * GeoJSON Feature for a [lat, lng] vertex list (Polygon ring, vertex order
 * converted to GeoJSON's [lng, lat]).
 */
export function polygonFeature(coordinates) {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [coordinates.map(([lat, lng]) => [lng, lat])],
    },
  };
}

/**
 * Customer-facing pickup verdict for a [lat, lng] point, mirroring the backend
 * geoUtils resolution order: no zone → NO_ZONE, inside zone → exclusion check →
 * EXCLUDED or INSIDE, otherwise OUTSIDE.
 */
export function resolvePickupVerdict(zone, exclusions, point) {
  if (!Array.isArray(zone) || zone.length < 3) return VERDICTS.NO_ZONE;
  if (!point) return VERDICTS.NO_ZONE;
  if (!pointInPolygon(point, zone)) return VERDICTS.OUTSIDE;
  if (Array.isArray(exclusions) && exclusions.some((e) => pointInPolygon(point, e))) {
    return VERDICTS.EXCLUDED;
  }
  return VERDICTS.INSIDE;
}