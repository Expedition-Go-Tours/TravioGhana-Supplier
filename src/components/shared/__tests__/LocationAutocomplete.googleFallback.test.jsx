/**
 * The Google Maps fallback row in the location picker.
 *
 * This is the escape hatch for a place the catalog and the free geocoders do
 * not know — a small hotel, a village junction, a landmark. What matters is
 * not that the row exists, but what it does in each failure mode:
 *
 *   - offered ONLY when the ordinary search found nothing (never competing
 *     with good suggestions);
 *   - `not_configured` makes the option DISAPPEAR rather than report a search
 *     that never happened;
 *   - a selected Google Maps result produces the same shape as any other
 *     suggestion, so the pickup modal's save path needs no special case.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const useGeocoding = vi.fn();
const searchGoogleMaps = vi.fn();

vi.mock('@/hooks/useGeocoding', () => ({
  useGeocoding: (...args) => useGeocoding(...args),
}));
vi.mock('@/lib/serpApiMapsSearch', () => ({
  searchGoogleMaps: (...args) => searchGoogleMaps(...args),
}));

import LocationAutocomplete from '../LocationAutocomplete';

const PLACE = {
  formatted: 'Coconut Grove Beach Resort, Elmina, Ghana',
  latitude: 5.0833,
  longitude: -1.35,
  name: 'Coconut Grove Beach Resort',
  source: 'google_maps',
};

function stubGeocoding({ results = [], loading = false, error = null } = {}) {
  useGeocoding.mockReturnValue({
    search: vi.fn(),
    retry: vi.fn(),
    clear: vi.fn(),
    results,
    loading,
    debouncing: false,
    error,
  });
}

function renderPicker(props = {}) {
  return render(<LocationAutocomplete {...props} />);
}

async function typeQuery(value) {
  const user = userEvent.setup();
  await user.type(screen.getByRole('combobox'), value);
  return user;
}

beforeEach(() => {
  stubGeocoding();
  searchGoogleMaps.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('when the ordinary search finds nothing', () => {
  it('offers one explicit "Search Google Maps" action', async () => {
    renderPicker();
    await typeQuery('Coconut Grove');

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /can’t find your location\? search google maps/i }),
      ).toBeInTheDocument();
    });
    // Before the click: no results, no claims about Google Maps.
    expect(screen.queryByText('Google Maps · Ghana')).toBeNull();
  });

  it('sends the query and renders the results under their own heading', async () => {
    searchGoogleMaps.mockResolvedValue({ status: 'ok', results: [PLACE] });
    renderPicker();

    await typeQuery('Coconut Grove');
    await userEvent.click(
      screen.getByRole('button', { name: /can’t find your location\? search google maps/i }),
    );

    await waitFor(() => {
      expect(searchGoogleMaps).toHaveBeenCalledWith('Coconut Grove');
    });
    expect(screen.getByText('Google Maps · Ghana')).toBeInTheDocument();
    // Match on the option row: the title is split across <mark> segments by
    // the query highlighter, so a plain text matcher cannot see it.
    expect(
      screen.getByRole('option', { name: /Coconut Grove Beach Resort, Elmina/ }),
    ).toBeInTheDocument();
  });

  it('a Google Maps result selects like any other suggestion', async () => {
    searchGoogleMaps.mockResolvedValue({ status: 'ok', results: [PLACE] });
    const onSelect = vi.fn();

    render(<LocationAutocomplete onSelect={onSelect} />);
    await typeQuery('Coconut Grove');
    await userEvent.click(
      screen.getByRole('button', { name: /can’t find your location\? search google maps/i }),
    );
    await userEvent.click(
      await screen.findByRole('option', { name: /Coconut Grove Beach Resort, Elmina/ }),
    );

    // Same contract as a catalog suggestion: the pickup modal's save path is
    // unchanged and the pin lands on real coordinates.
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        formatted: 'Coconut Grove Beach Resort, Elmina, Ghana',
        latitude: 5.0833,
        longitude: -1.35,
      }),
    );
  });

  it('keeps walking the combined list with the keyboard', async () => {
    searchGoogleMaps.mockResolvedValue({ status: 'ok', results: [PLACE] });
    const onSelect = vi.fn();
    renderPicker({ onSelect });

    await typeQuery('Coconut Grove');
    await userEvent.click(
      screen.getByRole('button', { name: /can’t find your location\? search google maps/i }),
    );
    await waitFor(() => {
      expect(screen.getByText('Google Maps · Ghana')).toBeInTheDocument();
    });

    // ArrowDown walks into the Google rows, Enter selects the highlighted one.
    const input = screen.getByRole('combobox');
    await userEvent.type(input, '{ArrowDown}');
    await userEvent.type(input, '{Enter}');

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ source: 'google_maps' }));
  });
});

describe('when the fallback cannot answer', () => {
  it('hides the option when the server has no key — never "no matches"', async () => {
    searchGoogleMaps.mockResolvedValue({ status: 'not_configured', results: [] });
    renderPicker();

    await typeQuery('Coconut Grove');
    await userEvent.click(
      screen.getByRole('button', { name: /can’t find your location\? search google maps/i }),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /search google maps/i }),
      ).toBeNull();
    });
    expect(screen.queryByText(/no match/i)).toBeNull();
    expect(screen.queryByText('Google Maps · Ghana')).toBeNull();
  });

  it('says the quota is spent instead of claiming an empty result', async () => {
    searchGoogleMaps.mockResolvedValue({ status: 'quota', results: [] });
    renderPicker();

    await typeQuery('Coconut Grove');
    await userEvent.click(
      screen.getByRole('button', { name: /can’t find your location\? search google maps/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/google maps search is busy right now/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/no match/i)).toBeNull();
  });

  it('says so when Google Maps genuinely has nothing', async () => {
    searchGoogleMaps.mockResolvedValue({ status: 'empty', results: [] });
    renderPicker();

    await typeQuery('Nowhere Junction');
    await userEvent.click(
      screen.getByRole('button', { name: /can’t find your location\? search google maps/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/google maps has no match either/i)).toBeInTheDocument();
    });
  });
});

describe('when the ordinary search already found something', () => {
  it('does not compete with real suggestions', async () => {
    stubGeocoding({
      results: [
        {
          formatted: 'Elmina, Ghana',
          latitude: 5.08,
          longitude: -1.35,
          city: 'Elmina',
          region: 'Central',
          country: 'Ghana',
          source: 'geoapify',
        },
      ],
    });
    renderPicker();

    await typeQuery('Elmina');

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Elmina, Ghana/ })).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('button', { name: /search google maps/i }),
    ).toBeNull();
    expect(searchGoogleMaps).not.toHaveBeenCalled();
  });
});
