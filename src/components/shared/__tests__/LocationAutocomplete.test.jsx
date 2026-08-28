import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@/test/utils';
import LocationAutocomplete from '@/components/shared/LocationAutocomplete';

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
