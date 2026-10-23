/**
 * The Google Maps (SerpApi) fallback: client wrapper + the rule that its key
 * can never reach the browser.
 *
 * The wrapper exists so the pickup planner can set a location that none of the
 * free geocoders know (a small hotel, a village junction). Its whole value
 * depends on three distinctions staying intact in the UI: "no key configured",
 * "quota spent" and "no matches" are different facts and must never render the
 * same way.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  searchGoogleMaps,
  clearGoogleMapsCache,
} from '../serpApiMapsSearch';

const okBody = (results) => ({
  status: 'success',
  data: { ok: true, results },
});

const PLACE = {
  formatted: 'Coconut Grove Beach Resort, Elmina, Ghana',
  latitude: 5.0833,
  longitude: -1.35,
  name: 'Coconut Grove Beach Resort',
  source: 'google_maps',
};

function mockFetchOnce(impl) {
  const spy = vi.fn(impl);
  vi.stubGlobal('fetch', spy);
  return spy;
}

beforeEach(() => {
  clearGoogleMapsCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('searchGoogleMaps', () => {
  it('returns normalized results from our own route', async () => {
    const fetchSpy = mockFetchOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => okBody([PLACE]),
    }));

    const outcome = await searchGoogleMaps('Coconut Grove');

    expect(outcome.status).toBe('ok');
    expect(outcome.results[0]).toMatchObject({ source: 'google_maps' });
    // On the API HOST — a relative URL would hit this app's own origin and be
    // answered by the SPA's catch-all rewrite with HTML, which is exactly the
    // "We could not reach Google Maps just now" this produced.
    expect(fetchSpy.mock.calls[0][0]).toMatch(/^https?:\/\//);
    expect(fetchSpy.mock.calls[0][0]).toContain('/api/locations/google-search');
    // Never a direct call to SerpApi from the browser.
    expect(fetchSpy.mock.calls[0][0]).not.toContain('serpapi.com');
  });

  it('passes the search-area bias through', async () => {
    const fetchSpy = mockFetchOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => okBody([]),
    }));

    await searchGoogleMaps('Beach resort', { lat: 5.1, lng: -1.35 });

    expect(fetchSpy.mock.calls[0][0]).toContain('lat=5.1');
    expect(fetchSpy.mock.calls[0][0]).toContain('lng=-1.35');
  });

  it('reports `not_configured` as itself — never as no matches', async () => {
    mockFetchOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: 'success', data: { ok: false, reason: 'not_configured' } }),
    }));

    const outcome = await searchGoogleMaps('Coconut Grove');

    expect(outcome).toEqual({ status: 'not_configured', results: [] });
  });

  it('reports an exhausted quota as itself', async () => {
    mockFetchOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: 'success', data: { ok: false, reason: 'quota' } }),
    }));

    expect((await searchGoogleMaps('Coconut Grove')).status).toBe('quota');
  });

  it('never throws: a dead network is `unavailable`, not a crash', async () => {
    mockFetchOnce(async () => {
      throw new Error('offline');
    });

    expect(await searchGoogleMaps('Coconut Grove')).toEqual({
      status: 'unavailable',
      results: [],
    });
  });

  it('caches the result set so a repeat search costs no credits', async () => {
    const fetchSpy = mockFetchOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => okBody([PLACE]),
    }));

    await searchGoogleMaps('Coconut Grove');
    await searchGoogleMaps('Coconut Grove');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('caches an empty answer too — "nothing there" is still an answer', async () => {
    const fetchSpy = mockFetchOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => okBody([]),
    }));

    const first = await searchGoogleMaps('Nowhere Junction');
    const second = await searchGoogleMaps('Nowhere Junction');

    expect(first.status).toBe('empty');
    expect(second.status).toBe('empty');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('refuses a query too short to be worth a request', async () => {
    const fetchSpy = mockFetchOnce(async () => ({ ok: true, status: 200, json: async () => okBody([]) }));

    expect(await searchGoogleMaps('El')).toEqual({ status: 'invalid', results: [] });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('the SerpApi key can never reach the browser', () => {
  // The key is server-side because SerpApi has no CORS support and because a
  // shipped secret is a leaked secret. The storefront guards this with a build
  // plugin; this test is the same guarantee in CI.
  const fs = require('node:fs');
  const path = require('node:path');
  const SRC = path.resolve(__dirname, '../../..');

  function walk(dir, files = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
        walk(full, files);
      } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
        files.push(full);
      }
    }
    return files;
  }

  it('finds no client code referencing the SerpApi key or endpoint', () => {
    const offenders = [];
    for (const file of walk(SRC)) {
      const text = fs.readFileSync(file, 'utf8');
      if (/VITE_SERP_API_KEY|SERPAPI_API_KEY/.test(text) && !/serpApiMapsSearch\.js$/.test(file)) {
        offenders.push(`${path.relative(SRC, file)}: references the SerpApi key`);
      }
      if (/serpapi\.com/.test(text)) {
        offenders.push(`${path.relative(SRC, file)}: calls SerpApi directly`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
