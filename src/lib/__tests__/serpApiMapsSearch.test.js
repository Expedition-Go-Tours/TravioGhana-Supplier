import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";
import { clearGoogleMapsCache, searchGoogleMaps } from "../serpApiMapsSearch";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://apiv1.travioafrica.com/api";

const KEMPINSKI = {
  formatted: "Kempinski Hotel Gold Coast City Accra, Gamel Abdul Naser Avenue, Accra, Ghana",
  latitude: 5.5550811,
  longitude: -0.1978947,
  city: "Accra",
  country: "Ghana",
  region: "Greater Accra Region",
  postcode: null,
  street: "Gamel Abdul Naser Avenue",
  source: "google_maps",
  externalId: "ChIJAcTuKJuQ3w8Rl38ROfnzGGo",
};

describe("searchGoogleMaps", () => {
  beforeEach(() => {
    clearGoogleMapsCache();
  });

  it("returns the backend's normalized Google Maps places", async () => {
    const outcome = await searchGoogleMaps("Kempinski Hotel Accra", { lat: 5.6037, lng: -0.187 });

    expect(outcome.status).toBe("ok");
    expect(outcome.results).toEqual([
      {
        formatted: KEMPINSKI.formatted,
        city: "Accra",
        region: "Greater Accra Region",
        country: "Ghana",
        postcode: null,
        street: "Gamel Abdul Naser Avenue",
        latitude: 5.5550811,
        longitude: -0.1978947,
        source: "google_maps",
        placeId: "ChIJAcTuKJuQ3w8Rl38ROfnzGGo",
      },
    ]);
  });

  it("reports an empty result set as 'empty', not an error", async () => {
    const outcome = await searchGoogleMaps("Somewhere Google does not know");
    expect(outcome).toEqual({ status: "empty", results: [] });
  });

  it("maps quota and not-configured responses to their own statuses", async () => {
    await expect(searchGoogleMaps("quota please")).resolves.toEqual({
      status: "quota",
      results: [],
    });
    await expect(searchGoogleMaps("not-configured place")).resolves.toEqual({
      status: "not_configured",
      results: [],
    });
  });

  it("rejects queries shorter than three characters without calling the API", async () => {
    let calls = 0;
    server.use(
      http.get(`${API_BASE_URL}/locations/google-search`, () => {
        calls += 1;
        return HttpResponse.json({ status: "success", data: { ok: true, results: [] } });
      }),
    );

    const outcome = await searchGoogleMaps("Ac");

    expect(outcome).toEqual({ status: "invalid", results: [] });
    expect(calls).toBe(0);
  });

  it("caches a repeated search so it never spends another SerpApi credit", async () => {
    let calls = 0;
    server.use(
      http.get(`${API_BASE_URL}/locations/google-search`, () => {
        calls += 1;
        return HttpResponse.json({ status: "success", data: { ok: true, results: [KEMPINSKI] } });
      }),
    );

    const first = await searchGoogleMaps("Kempinski Hotel Accra", { lat: 5.6037, lng: -0.187 });
    const second = await searchGoogleMaps("kempinski hotel accra", { lat: 5.6037, lng: -0.187 });

    expect(calls).toBe(1);
    expect(second).toEqual(first);
  });
});
