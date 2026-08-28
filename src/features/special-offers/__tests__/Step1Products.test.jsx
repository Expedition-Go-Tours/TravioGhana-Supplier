import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@/test/utils';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import Step1Products from '@/features/special-offers/components/Step1Products';
import { useSpecialOfferBuilderStore } from '@/features/special-offers/stores/specialOfferBuilderStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://apiv1.travioafrica.com/api';

const PUBLISHED_TOUR_IDS = Array.from({ length: 12 }, (_, i) => `tour-${i + 1}`);

function resetStore() {
  localStorage.clear();
  useSpecialOfferBuilderStore.getState().reset();
  localStorage.setItem('auth_token', 'test-token');
}

function seedAllPublishedTargets() {
  PUBLISHED_TOUR_IDS.forEach((tourId) => {
    useSpecialOfferBuilderStore.getState().addTarget({
      tourId,
      tourTitle: 'Seed',
      tourPhotos: [],
      tourOptionKey: null,
      tourOptionLabel: null,
    });
  });
}

async function openDropdown() {
  render(<Step1Products />);
  const input = screen.getByPlaceholderText(/Select a product or type to filter/i);
  await act(async () => {
    fireEvent.focus(input);
  });
  await screen.findByText('Serengeti Safari Adventure');
  return input;
}

describe('Step1Products', () => {
  beforeEach(() => {
    resetStore();
  });

  it('renders the product picker input', () => {
    render(<Step1Products />);
    expect(screen.getByPlaceholderText(/Select a product or type to filter/i)).toBeInTheDocument();
  });

  it('lists all published tours across pages and excludes unpublished ones', async () => {
    await openDropdown();

    expect(screen.getByText('Serengeti Safari Adventure')).toBeInTheDocument();
    expect(screen.getByText('Ngorongoro Crater Day Trip')).toBeInTheDocument();
    expect(screen.getByText('Arusha Coffee Farm Experience')).toBeInTheDocument();
    expect(screen.getByText('Mikumi Safari Lodge Weekend')).toBeInTheDocument();
    expect(screen.getByText('Mount Kilimanjaro Trek')).toBeInTheDocument();

    expect(screen.queryByText('Unpublished Draft Product')).toBeNull();
    expect(screen.queryByText('Rejected Submission Example')).toBeNull();
    expect(screen.queryByText('Archived Old Product')).toBeNull();
  });

  it('shows the catalogue count in the dropdown header', async () => {
    await openDropdown();
    expect(screen.getByText('12 of 12')).toBeInTheDocument();
  });

  it('filters the list locally as the user types', async () => {
    const input = await openDropdown();

    fireEvent.change(input, { target: { value: 'kilimanjaro' } });

    expect(screen.getByText('Mount Kilimanjaro Trek')).toBeInTheDocument();
    expect(screen.queryByText('Serengeti Safari Adventure')).toBeNull();
    expect(screen.getByText('1 of 12')).toBeInTheDocument();
  });

  it('shows a no-match state for an unknown filter', async () => {
    const input = await openDropdown();

    fireEvent.change(input, { target: { value: 'zzzz' } });

    expect(await screen.findByText(/No products match/i)).toBeInTheDocument();
  });

  it('shows the "Has offer" badge only for tours with an active special offer', async () => {
    await openDropdown();

    const serengetiRow = screen.getByText('Serengeti Safari Adventure').closest('button');
    expect(serengetiRow).toHaveTextContent('Has offer');

    const ngorongoroRow = screen.getByText('Ngorongoro Crater Day Trip').closest('button');
    expect(ngorongoroRow).not.toHaveTextContent('Has offer');
  });

  it('adds a tour to the offer when clicked and marks it as Added', async () => {
    const input = await openDropdown();

    fireEvent.click(screen.getByText('Ngorongoro Crater Day Trip'));

    expect(screen.getByText(/Selected Products/)).toHaveTextContent('(1)');
    expect(screen.getByTitle('Remove')).toBeInTheDocument();

    fireEvent.focus(input);
    const rows = screen.getAllByText('Ngorongoro Crater Day Trip')
      .map((el) => el.closest('button'))
      .filter(Boolean);
    const dropdownRow = rows.find((row) => row.disabled);
    expect(dropdownRow).toBeDefined();
    expect(dropdownRow).toHaveTextContent('Added');
  });

  it('removes a selected tour via the remove button', async () => {
    await openDropdown();
    fireEvent.click(screen.getByText('Ngorongoro Crater Day Trip'));

    fireEvent.click(screen.getByTitle('Remove'));

    expect(screen.getByText(/No products selected yet/i)).toBeInTheDocument();
  });

  it('shows the all-products-added state when every published tour is in the offer', async () => {
    seedAllPublishedTargets();
    render(<Step1Products />);
    const input = screen.getByPlaceholderText(/Select a product or type to filter/i);

    await act(async () => {
      fireEvent.focus(input);
    });

    expect(await screen.findByText(/All your published products are already in this offer/i)).toBeInTheDocument();
    expect(screen.queryByText('Serengeti Safari Adventure')).toBeNull();
  });

  it('shows a retryable error when the catalogue fails to load', async () => {
    server.use(
      http.get(`${API_BASE_URL}/tours/supplier/my-tours`, () =>
        HttpResponse.json({ message: 'Server exploded' }, { status: 422 })
      )
    );

    render(<Step1Products />);
    const input = screen.getByPlaceholderText(/Select a product or type to filter/i);

    await act(async () => {
      fireEvent.focus(input);
    });

    expect(await screen.findByText('Server exploded')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();

    server.resetHandlers();
    await act(async () => {
      fireEvent.click(screen.getByText('Retry'));
    });

    expect(await screen.findByText('Serengeti Safari Adventure')).toBeInTheDocument();
  });
});