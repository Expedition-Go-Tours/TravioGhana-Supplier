/**
 * Pure geometry transforms for the pickup geoshape editor (zone + exclusion
 * polygons). Kept free of map/DOM/React side effects so every transform is
 * unit-testable in isolation. All vertex lists are in [lat, lng] order.
 */

/**
 * Clamp latitude to [-90, 90] and normalize longitude to (-180, 180].
 * Guards against NaN/Infinity so a bad coordinate can never corrupt the ring.
 */
export function clampLatLng([lat, lng]) {
  let l = Number.isFinite(lat) ? lat : 0;
  let g = Number.isFinite(lng) ? lng : 0;
  if (l > 90) l = 90;
  if (l < -90) l = -90;
  g = ((g + 180) % 360 + 360) % 360 - 180;
  if (g === -180) g = 180;
  return [l, g];
}

/**
 * Midpoint of edge `i`, i.e. between vertices[i] and vertices[(i + 1) % n].
 * The ring wraps, so the last edge connects the final vertex back to the first.
 */
export function edgeMidpoint(vertices, i) {
  const n = vertices.length;
  const a = vertices[i];
  const b = vertices[(i + 1) % n];
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

/**
 * Immutably insert a vertex at `index` (clamped into the ring, so inserting
 * at `length` appends). Returns a new array; the input is never mutated.
 */
export function insertVertex(vertices, index, vertex) {
  const next = vertices.map((v) => [...v]);
  const at = Math.max(0, Math.min(index, next.length));
  next.splice(at, 0, [...vertex]);
  return next;
}

/** Immutably move a single vertex by a [dLat, dLng] delta. */
export function nudgeVertex(vertices, index, dLat, dLng) {
  return vertices.map((v, i) => (i === index ? [v[0] + dLat, v[1] + dLng] : [...v]));
}

/** Immutably translate every vertex by a [dLat, dLng] delta. */
export function translateShape(vertices, dLat, dLng) {
  return vertices.map(([lat, lng]) => [lat + dLat, lng + dLng]);
}

/**
 * Immutably remove a vertex. Refuses to drop below 3 points (returns a copy
 * unchanged), since a polygon ring must keep at least 3 vertices.
 */
export function deleteVertex(vertices, index) {
  if (vertices.length <= 3) return vertices.map((v) => [...v]);
  return vertices.filter((_, i) => i !== index);
}

/**
 * Begin dragging edge `edgeIndex` (Google Maps style): inserts the edge
 * midpoint as a brand-new vertex at edgeIndex + 1 and returns the updated ring
 * plus the index of the inserted vertex so the caller can drag it onward.
 */
export function beginEdgeDrag(vertices, edgeIndex) {
  const mid = edgeMidpoint(vertices, edgeIndex);
  const insertedIndex = edgeIndex + 1;
  return { vertices: insertVertex(vertices, insertedIndex, mid), insertedIndex };
}

/**
 * Pick the edit handle (corner dot or edge midpoint) closest to the pointer,
 * returning null when nothing is within its hit radius. Both handle kinds are
 * considered and the NEAREST one wins, so on dense shapes (e.g. a 32-point
 * circle) the visible edge dot is grabbable even though it sits near corners.
 *
 * `proj` is the cached screen-space handle set ({ verts, mids }, each item
 * `{ x, y }`). Default hit radii match the drawer's constants.
 */
export function nearestEditHandle(proj, point, hitRadii = { vertex: 12, mid: 10 }) {
  let best = null;
  let bestDist = Infinity;
  for (let i = 0; i < proj.verts.length; i += 1) {
    const d = Math.hypot(proj.verts[i].x - point.x, proj.verts[i].y - point.y);
    if (d <= hitRadii.vertex && d < bestDist) {
      bestDist = d;
      best = { kind: "vertex", index: i };
    }
  }
  for (let i = 0; i < proj.mids.length; i += 1) {
    const d = Math.hypot(proj.mids[i].x - point.x, proj.mids[i].y - point.y);
    if (d <= hitRadii.mid && d < bestDist) {
      bestDist = d;
      best = { kind: "mid", index: i };
    }
  }
  return best;
}
