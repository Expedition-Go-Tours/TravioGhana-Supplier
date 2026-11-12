import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, fireEvent, act } from '@/test/utils';
import LocationAutocomplete from '@/components/shared/LocationAutocomplete';
import { clearGoogleMapsCache } from '@/lib/serpApiMapsSearch';

function typeInto(input, value) {
  fireEvent.change(input, { target: { value } });
}

describe('LocationAutocomplete', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the location search input with a MapPin icon', () => {
    render(<LocationAutocomplete onSelect={vi.fn()} />);
    expect(screen.getByPlaceholderText(/Start typing a location/i)).toBeInTheDocument();
  });

  it('does not search with fewer than minChars characters (default 2)', () => {
    render(<LocationAutocomplete onSelect={vi.fn()} />);
    const input = screen.getByPlaceholderText(/Start typing a location/i);
    typeInto(input, 'A');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('searches and opens dropdown at exactly minChars', async () => {
    render(<LocationAutocomplete onSelect={vi.fn()} />);
    const input = screen.getByPlaceholderText(/Start typing a location/i);
    typeInto(input, 'Ar');
    expect(screen.getByText(/Typing…/i)).toBeInTheDocument();
    await act(() => vi.advanceTimersByTime(500));
    const option = await screen.findByRole('option');
    expect(option).toBeInTheDocument();
  });

  it('closes dropdown on Escape', async () => {
    render(<LocationAutocomplete onSelect={vi.fn()} />);
    const input = screen.getByPlaceholderText(/Start typing a location/i);
    typeInto(input, 'Arusha');
    await act(() => vi.advanceTimersByTime(500));
    await screen.findByRole('listbox');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('highlights result on ArrowDown and selects on Enter', async () => {
    const onSelect = vi.fn();
    render(<LocationAutocomplete onSelect={onSelect} />);
    const input = screen.getByPlaceholderText(/Start typing a location/i);
    typeInto(input, 'Arusha');
    await act(() => vi.advanceTimersByTime(500));
    await screen.findByRole('listbox');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        formatted: 'Arusha, Tanzania',
        city: 'Arusha',
        country: 'Tanzania',
      })
    );
  });

  it('selects a result on click', async () => {
    const onSelect = vi.fn();
    render(<LocationAutocomplete onSelect={onSelect} />);
    const input = screen.getByPlaceholderText(/Start typing a location/i);
    typeInto(input, 'Arusha');
    await act(() => vi.advanceTimersByTime(500));
    const option = await screen.findByRole('option');
    fireEvent.click(option);

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        formatted: 'Arusha, Tanzania',
        latitude: -3.3869,
        longitude: 36.683,
      })
    );
  });

  it('clears the input when clearOnSelect is set', async () => {
    const onSelect = vi.fn();
    render(<LocationAutocomplete onSelect={onSelect} clearOnSelect />);
    const input = screen.getByPlaceholderText(/Start typing a location/i);
    typeInto(input, 'Arusha');
    await act(() => vi.advanceTimersByTime(500));
    const option = await screen.findByRole('option');
    fireEvent.click(option);
    expect(input).toHaveValue('');
  });

  it('shows "add as custom location" when onAddCustom is supplied and no results', async () => {
    const onAddCustom = vi.fn();
    render(<LocationAutocomplete onSelect={vi.fn()} onAddCustom={onAddCustom} />);
    const input = screen.getByPlaceholderText(/Start typing a location/i);
    typeInto(input, 'Zyzzx');
    await act(() => vi.advanceTimersByTime(500));

    const addBtn = await screen.findByText(/Add .*Zyzzx.* as a custom location/i);
    fireEvent.click(addBtn);
    expect(onAddCustom).toHaveBeenCalledWith('Zyzzx');
  });

  it('does not show the add-custom button when onAddCustom is not provided', async () => {
    render(<LocationAutocomplete onSelect={vi.fn()} />);
    const input = screen.getByPlaceholderText(/Start typing a location/i);
    typeInto(input, 'Zyzzx');
    await act(() => vi.advanceTimersByTime(500));
    await screen.findByText(/No locations found/i);
    expect(screen.queryByText(/Add .* as a custom location/i)).toBeNull();
  });

  it('clears input when clear button is clicked', async () => {
    render(<LocationAutocomplete onSelect={vi.fn()} />);
    const input = screen.getByPlaceholderText(/Start typing a location/i);
    typeInto(input, 'Ar');
    const clearBtn = screen.getByLabelText(/Clear location search/i);
    fireEvent.click(clearBtn);
    expect(input).toHaveValue('');
  });

  it('supports imperative ref.reset()', async () => {
    const ref = { current: null };
    render(
      <LocationAutocomplete ref={r => { ref.current = r; }} onSelect={vi.fn()} />
    );
    const input = screen.getByPlaceholderText(/Start typing a location/i);
    typeInto(input, 'Arusha');
    await act(() => vi.advanceTimersByTime(500));
    await screen.findByRole('listbox');
    act(() => ref.current.reset());
    expect(input).toHaveValue('');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

describe('LocationAutocomplete — Google Maps (SerpApi) fallback', () => {
  beforeEach(() => {
    // The free-provider debounce is real here so the SerpApi click flow can use
    // normal async waiting instead of fake-timer choreography.
    vi.useRealTimers();
    clearGoogleMapsCache();
  });

  it('offers the distinct Google Maps card when free results are empty', async () => {
    const user = userEvent.setup();
    render(<LocationAutocomplete onSelect={vi.fn()} googleMapsFallback />);
    const input = screen.getByPlaceholderText(/Start typing a location/i);

    await user.type(input, 'Zyzzx');

    const card = await screen.findByRole('button', {
      name: /Search Google Maps for Zyzzx/i,
    });
    expect(card).toBeInTheDocument();
    expect(screen.getByText(/Can.t find your address\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Search Google Maps for places in Ghana/i)).toBeInTheDocument();
  });

  it('does not search Google Maps until the card is clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<LocationAutocomplete onSelect={onSelect} googleMapsFallback />);
    const input = screen.getByPlaceholderText(/Start typing a location/i);

    await user.type(input, 'Kempinski');

    const card = await screen.findByRole('button', {
      name: /Search Google Maps for Kempinski/i,
    });
    expect(screen.queryByText(/Google Maps · Ghana/i)).toBeNull();

    await user.click(card);

    expect(await screen.findByText(/Google Maps · Ghana/i)).toBeInTheDocument();
    const result = await screen.findByRole('button', {
      name: /Kempinski Hotel Gold Coast City/i,
    });
    await user.click(result);

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        formatted: expect.stringContaining('Kempinski Hotel Gold Coast City'),
        city: 'Accra',
        region: 'Greater Accra Region',
        country: 'Ghana',
        latitude: 5.5550811,
        longitude: -0.1978947,
      })
    );
  });

  it('offers Google Maps when the free results are only fuzzy matches', async () => {
    const user = userEvent.setup();
    render(<LocationAutocomplete onSelect={vi.fn()} googleMapsFallback />);
    const input = screen.getByPlaceholderText(/Start typing a location/i);

    await user.type(input, 'Kaneshie Market');

    expect(await screen.findByText('Accra, Ghana')).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: /Search Google Maps for Kaneshie Market/i })
    ).toBeInTheDocument();
  });

  it('hides the Google Maps card when a free result matches what was typed', async () => {
    const user = userEvent.setup();
    render(<LocationAutocomplete onSelect={vi.fn()} googleMapsFallback />);
    const input = screen.getByPlaceholderText(/Start typing a location/i);

    await user.type(input, 'Arusha');

    expect(await screen.findByRole('option', { name: /Arusha, Tanzania/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Search Google Maps/i })).toBeNull();
  });

  it('shows a retry message when the Google Maps quota is spent', async () => {
    const user = userEvent.setup();
    render(<LocationAutocomplete onSelect={vi.fn()} googleMapsFallback />);
    const input = screen.getByPlaceholderText(/Start typing a location/i);

    await user.type(input, 'quota');
    await user.click(
      await screen.findByRole('button', { name: /Search Google Maps for quota/i })
    );

    expect(await screen.findByText(/temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try again/i })).toBeInTheDocument();
  });

  it('does not offer the fallback unless the caller opts in', async () => {
    const user = userEvent.setup();
    render(<LocationAutocomplete onSelect={vi.fn()} />);
    const input = screen.getByPlaceholderText(/Start typing a location/i);

    await user.type(input, 'Zyzzx');

    await screen.findByText(/No locations found/i);
    expect(screen.queryByRole('button', { name: /Search Google Maps/i })).toBeNull();
  });
});
