import { describe, it, expect } from "vitest";
import {
  offsetMeters,
  distanceMeters,
  rectFromCorners,
  squareFromCenter,
  triangleFromCenter,
  polygonBounds,
  pointInPolygon,
  polygonExtentMeters,
  polygonAreaKm2,
  polygonPerimeterKm,
  resolvePickupVerdict,
  VERDICTS,
} from "../pickupShapeTools";

const CENTER = [5.6037, -0.187];

describe("pickupShapeTools", () => {
  describe("offsetMeters / distanceMeters", () => {
    it("moves north by the requested meters", () => {
      const moved = offsetMeters(CENTER, 0, 1000);
      expect(distanceMeters(CENTER, moved)).toBeCloseTo(1000, 1);
    });

    it("moves east by the requested meters", () => {
      const [, lng] = offsetMeters(CENTER, 1000, 0);
      const d = distanceMeters(CENTER, [CENTER[0], lng]);
      expect(d).toBeGreaterThan(995);
      expect(d).toBeLessThan(1005);
    });

    it("round-trips distanceMeters with offsetMeters", () => {
      const moved = offsetMeters(CENTER, 250, -75);
      expect(distanceMeters(CENTER, moved)).toBeCloseTo(Math.hypot(250, 75), 1);
    });

    it("does not produce NaN near the poles", () => {
      const [lat, lng] = offsetMeters([89.9, 0], 1000, 1000);
      expect(Number.isFinite(lat)).toBe(true);
      expect(Number.isFinite(lng)).toBe(true);
    });
  });

  describe("rectFromCorners", () => {
    it("builds a 4-vertex closed rectangle from either corner order", () => {
      const a = [5.6, -0.2];
      const b = [5.7, -0.1];
      const fwd = rectFromCorners(a, b);
      const rev = rectFromCorners(b, a);
      expect(fwd).toHaveLength(4);
      expect(rev).toHaveLength(4);
      expect(fwd[0]).toEqual(a);
      expect(fwd[2]).toEqual(b);
      expect(rev[0]).toEqual(b);
      expect(rev[2]).toEqual(a);
      expect(Math.abs(fwd[0][0] - fwd[1][0])).toBeLessThan(1e-12);
      expect(Math.abs(fwd[0][1] - fwd[3][1])).toBeLessThan(1e-12);
    });
  });

  describe("squareFromCenter", () => {
    it("builds an axis-aligned square of side ≈ 2r", () => {
      const r = 500;
      const sq = squareFromCenter(CENTER, r);
      expect(sq).toHaveLength(4);
      for (const v of sq) {
        expect(distanceMeters(CENTER, v)).toBeCloseTo(r * Math.sqrt(2), 1);
      }
      const extent = polygonExtentMeters(sq);
      expect(extent.width).toBeCloseTo(2 * r, 1);
      expect(extent.height).toBeCloseTo(2 * r, 1);
    });
  });

  describe("triangleFromCenter", () => {
    it("builds an equilateral triangle with circumradius r", () => {
      const r = 400;
      const tri = triangleFromCenter(CENTER, r);
      expect(tri).toHaveLength(3);
      for (const v of tri) {
        expect(distanceMeters(CENTER, v)).toBeCloseTo(r, 1);
      }
      const [a, b, c] = tri;
      const ab = distanceMeters(a, b);
      const bc = distanceMeters(b, c);
      const ca = distanceMeters(c, a);
      expect(ab).toBeCloseTo(bc, 1);
      expect(bc).toBeCloseTo(ca, 1);
      expect(ab).toBeCloseTo(r * Math.sqrt(3), 1);
    });
  });

  describe("polygonBounds", () => {
    it("returns min/max latitudes and longitudes", () => {
      const b = polygonBounds([
        [5.6, -0.2],
        [5.7, -0.1],
        [5.65, -0.15],
      ]);
      expect(b.minLat).toBeCloseTo(5.6, 6);
      expect(b.maxLat).toBeCloseTo(5.7, 6);
      expect(b.minLng).toBeCloseTo(-0.2, 6);
      expect(b.maxLng).toBeCloseTo(-0.1, 6);
    });

    it("returns null for empty input", () => {
      expect(polygonBounds([])).toBeNull();
      expect(polygonBounds(null)).toBeNull();
    });
  });

  describe("pointInPolygon", () => {
    const square = [
      [5.6, -0.2],
      [5.7, -0.2],
      [5.7, -0.1],
      [5.6, -0.1],
    ];

    it("contains an interior point", () => {
      expect(pointInPolygon([5.65, -0.15], square)).toBe(true);
    });

    it("rejects an exterior point", () => {
      expect(pointInPolygon([5.8, -0.3], square)).toBe(false);
      expect(pointInPolygon([5.5, -0.05], square)).toBe(false);
    });

    it("counts boundary points as inside", () => {
      expect(pointInPolygon([5.6, -0.15], square)).toBe(true);
    });

    it("is winding-agnostic (reversed order)", () => {
      expect(pointInPolygon([5.65, -0.15], [...square].reverse())).toBe(true);
    });

    it("returns false for degenerate inputs", () => {
      expect(pointInPolygon([5.65, -0.15], [[5.6, -0.2], [5.7, -0.2]])).toBe(false);
      expect(pointInPolygon([5.65, -0.15], [])).toBe(false);
    });
  });

  describe("polygonAreaKm2 / polygonPerimeterKm", () => {
    // Exactly 1 km × 1 km square built from meter offsets around Accra.
    const center = [5.6, -0.195];
    const squareKm = [
      offsetMeters(center, -500, 500),
      offsetMeters(center, 500, 500),
      offsetMeters(center, 500, -500),
      offsetMeters(center, -500, -500),
    ];

    it("approximates the area of a 1 km² square", () => {
      const area = polygonAreaKm2(squareKm);
      expect(area).toBeGreaterThan(0.9);
      expect(area).toBeLessThan(1.1);
    });

    it("returns a finite, positive area for dense traced polygons", () => {
      const dense = squareKm.map(([lat, lng]) => [lat, lng]);
      expect(Number.isFinite(polygonAreaKm2(dense))).toBe(true);
      expect(polygonAreaKm2(dense)).toBeGreaterThan(0);
    });

    it("computes the perimeter of a 1 km square ≈ 4 km", () => {
      const perim = polygonPerimeterKm(squareKm);
      expect(perim).toBeGreaterThan(3.95);
      expect(perim).toBeLessThan(4.05);
    });

    it("returns 0 for degenerate or empty inputs", () => {
      expect(polygonAreaKm2([])).toBe(0);
      expect(polygonAreaKm2([[5.6, -0.2], [5.7, -0.2]])).toBe(0);
      expect(polygonPerimeterKm([])).toBe(0);
    });
  });

  describe("resolvePickupVerdict", () => {
    const zone = [
      [5.6, -0.2],
      [5.7, -0.2],
      [5.7, -0.1],
      [5.6, -0.1],
    ];
    const exclusion = [
      [5.64, -0.16],
      [5.66, -0.16],
      [5.66, -0.14],
      [5.64, -0.14],
    ];

    it("returns NO_ZONE when no zone is drawn", () => {
      expect(resolvePickupVerdict([], [], [5.65, -0.15])).toBe(VERDICTS.NO_ZONE);
      expect(resolvePickupVerdict(null, [], [5.65, -0.15])).toBe(VERDICTS.NO_ZONE);
      expect(resolvePickupVerdict([[5.6, -0.2]], [], [5.65, -0.15])).toBe(VERDICTS.NO_ZONE);
    });

    it("returns OUTSIDE for points outside the zone", () => {
      expect(resolvePickupVerdict(zone, [], [5.8, -0.3])).toBe(VERDICTS.OUTSIDE);
    });

    it("returns INSIDE for points inside the zone, no exclusions", () => {
      expect(resolvePickupVerdict(zone, [], [5.65, -0.15])).toBe(VERDICTS.INSIDE);
    });

    it("returns EXCLUDED for points inside an exclusion zone", () => {
      expect(resolvePickupVerdict(zone, [exclusion], [5.65, -0.15])).toBe(VERDICTS.EXCLUDED);
    });

    it("keeps INSIDE when the point is outside every exclusion", () => {
      expect(resolvePickupVerdict(zone, [exclusion], [5.61, -0.19])).toBe(VERDICTS.INSIDE);
    });

    it("mirrors the backend order: exclusion check only applies inside the zone", () => {
      const far = [5.8, -0.3];
      expect(pointInPolygon(far, exclusion)).toBe(false);
      expect(resolvePickupVerdict(zone, [exclusion], far)).toBe(VERDICTS.OUTSIDE);
    });
  });
});