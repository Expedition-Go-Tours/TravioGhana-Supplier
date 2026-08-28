import { describe, it, expect } from "vitest";
import { polygonFeature } from "@/lib/pickupShapeTools";

describe("polygonFeature", () => {
  it("maps [lat, lng] vertices to GeoJSON [lng, lat] coordinates", () => {
    const feature = polygonFeature([
      [5.55, -0.2],
      [5.57, -0.2],
      [5.57, -0.17],
      [5.55, -0.17],
    ]);
    expect(feature.geometry.coordinates[0]).toEqual([
      [-0.2, 5.55],
      [-0.2, 5.57],
      [-0.17, 5.57],
      [-0.17, 5.55],
    ]);
  });

  it("wraps the ring so GeoJSON interprets it as a polygon, not points", () => {
    const feature = polygonFeature([[5.55, -0.2], [5.57, -0.2]]);
    expect(feature.geometry.type).toBe("Polygon");
    expect(feature.geometry.coordinates[0][0]).toEqual([-0.2, 5.55]);
  });
});