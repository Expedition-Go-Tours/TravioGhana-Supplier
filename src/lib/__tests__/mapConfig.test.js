import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CENTER, TILE_STYLE, cameraFromGeoshape } from "@/lib/mapConfig";

describe("cameraFromGeoshape", () => {
  it("frames a drawn zone with a bounds pair", () => {
    const zone = [
      [5.55, -0.2],
      [5.57, -0.2],
      [5.57, -0.17],
      [5.55, -0.17],
    ];
    expect(cameraFromGeoshape(zone, null)).toEqual({
      bounds: [
        [-0.2, 5.55],
        [-0.17, 5.57],
      ],
    });
  });

  it("ignores zones with fewer than 3 vertices", () => {
    expect(cameraFromGeoshape([[5.55, -0.2]], null)).toEqual({
      center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
      zoom: 11,
    });
  });

  it("centers on a saved location point at street zoom", () => {
    expect(cameraFromGeoshape([], { lat: 5.6, lng: -0.19 })).toEqual({
      center: [-0.19, 5.6],
      zoom: 12,
    });
  });

  it("falls back to the app default at city zoom", () => {
    expect(cameraFromGeoshape([], null)).toEqual({
      center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
      zoom: 11,
    });
  });
});

describe("warmMapResources", () => {
  let fetchSpy;
  let headAppendSpy;

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    headAppendSpy = vi.spyOn(document.head, "appendChild").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    // Reset the module-level `warmed` flag so each test starts cold.
    vi.resetModules();
  });

  it("injects a preconnect link and force-caches the style exactly once", async () => {
    const { warmMapResources: warm } = await import("@/lib/mapConfig");
    warm();
    warm();
    warm();

    expect(headAppendSpy).toHaveBeenCalledTimes(1);
    const link = headAppendSpy.mock.calls[0][0];
    expect(link.rel).toBe("preconnect");
    expect(link.href.replace(/\/$/, "")).toBe("https://tiles.openfreemap.org");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(TILE_STYLE, { cache: "force-cache", mode: "cors" });
  });

  it("never throws when the prefetch fails", async () => {
    fetchSpy.mockRejectedValue(new Error("offline"));
    const { warmMapResources: warm } = await import("@/lib/mapConfig");
    expect(() => warm()).not.toThrow();
    await Promise.resolve();
  });
});
