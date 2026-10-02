import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, userEvent } from '@/test/utils';
import { renderWithProviders } from '@/test/utils';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import SpecialOffersListPage from '@/features/special-offers/pages/SpecialOffersListPage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://apiv1.travioafrica.com/api';

// Dates are left null on purpose: the card renders a live countdown for any
// offer with both bounds set, which would put interval timers in the test.
function offer(overrides = {}) {
  return {
    id: 'offer-1',
    name: 'Sale',
    offerType: 'LIMITED_TIME',
    status: 'active',
    isActive: true,
    startDate: null,
    endDate: null,
    discountType: 'PERCENTAGE',
    discountPercentage: 10,
    fixedDiscountValue: null,
    capacityType: 'UNLIMITED',
    maxSpots: null,
    spotsSold: 0,
    promoCode: null,
    timeSlotMode: 'ALL_DAYS',
    specificWeekdays: [],
    stackable: false,
    targets: [
      {
        id: 'target-1',
        tourId: 'tour-1',
        tour: { id: 'tour-1', title: 'Serengeti Safari Adventure', photos: [], coverPhoto: null },
      },
    ],
    ...overrides,
  };
}

function useOffers(offers) {
  server.use(
    http.get(`${API_BASE_URL}/travioghana/supplier/special-offers`, () =>
      HttpResponse.json({ status: 'success', data: { offers } })
    )
  );
}

const MIXED = [
  offer({ id: 'o-1', name: 'Active Sale', targets: [{ id: 't-1', tourId: 'tour-1', tour: { id: 'tour-1', title: 'Serengeti Safari Adventure', photos: [], coverPhoto: null } }] }),
  offer({ id: 'o-2', name: 'Active Promo', status: 'scheduled', isActive: true, targets: [{ id: 't-2', tourId: 'tour-2', tour: { id: 'tour-2', title: 'Ngorongoro Crater Day Trip', photos: [], coverPhoto: null } }] }),
  offer({ id: 'o-3', name: 'Dead Sale', status: 'expired', isActive: true, targets: [{ id: 't-3', tourId: 'tour-3', tour: { id: 'tour-3', title: 'Old Mountain Trek', photos: [], coverPhoto: null } }] }),
  offer({ id: 'o-4', name: 'Switched Off', status: 'expired', isActive: false, targets: [{ id: 't-4', tourId: 'tour-4', tour: { id: 'tour-4', title: 'Retired Beach Break', photos: [], coverPhoto: null } }] }),
];

const NONE_ACTIVE = [
  offer({ id: 'o-1', name: 'Dead Sale', status: 'expired', isActive: true }),
  offer({ id: 'o-2', name: 'Switched Off', status: 'expired', isActive: false }),
  offer({ id: 'o-3', name: 'Future Sale', status: 'scheduled', isActive: true }),
];

describe('SpecialOffersListPage status filter', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('auth_token', 'test-token');
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('opens on Active and hides expired, scheduled and switched-off rows', async () => {
    useOffers(MIXED);
    renderWithProviders(<SpecialOffersListPage />);

    expect(await screen.findByText('Active Sale')).toBeInTheDocument();
    // The resting view is exactly what the "Active" dropdown option means, so
    // every other status stays out until asked for.
    expect(screen.queryByText('Active Promo')).toBeNull();
    expect(screen.queryByText('Dead Sale')).toBeNull();
    expect(screen.queryByText('Switched Off')).toBeNull();
    expect(screen.getByText(/Showing 1 of 4 offers/)).toBeInTheDocument();
  });

  it('treats the default view as resting state, so no Clear button appears', async () => {
    useOffers(MIXED);
    renderWithProviders(<SpecialOffersListPage />);

    await screen.findByText('Active Sale');
    expect(screen.queryByRole('button', { name: /^clear$/i })).toBeNull();
  });

  it('keeps the Create Offer CTA and reveals hidden offers when none are active', async () => {
    useOffers(NONE_ACTIVE);
    renderWithProviders(<SpecialOffersListPage />);

    expect(await screen.findByText('No active offers')).toBeInTheDocument();
    expect(screen.getByText(/3 of your 3 offers/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /create offer/i }).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /show all 3 offers/i }));

    expect(await screen.findByText('Dead Sale')).toBeInTheDocument();
    expect(screen.getByText('Switched Off')).toBeInTheDocument();
    expect(screen.getByText('Future Sale')).toBeInTheDocument();
  });

  it('shows the true empty state only when the supplier has no offers at all', async () => {
    useOffers([]);
    renderWithProviders(<SpecialOffersListPage />);

    expect(await screen.findByText('No offers yet')).toBeInTheDocument();
    expect(screen.queryByText(/No matching offers/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /show all/i })).toBeNull();
  });

  it('reports a genuine no-match for a search, and Clear returns to Active', async () => {
    useOffers(MIXED);
    renderWithProviders(<SpecialOffersListPage />);

    await screen.findByText('Active Sale');
    fireEvent.change(screen.getByPlaceholderText('Search offers...'), { target: { value: 'zzzz' } });

    expect(await screen.findByText('No matching offers')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /clear all filters/i }));

    expect(await screen.findByText('Active Sale')).toBeInTheDocument();
    // Back at rest: expired rows stay hidden and the Clear button is gone.
    expect(screen.queryByText('Dead Sale')).toBeNull();
    expect(screen.queryByRole('button', { name: /^clear$/i })).toBeNull();
  });

  it('keeps the stats cards counting every offer, not just the filtered view', async () => {
    useOffers(MIXED);
    renderWithProviders(<SpecialOffersListPage />);

    await screen.findByText('Active Sale');
    expect(screen.getByText('Total Offers')).toBeInTheDocument();
    // Total is computed from `offers`, so 4 rows must be reported regardless
    // of how many the default filter lets through.
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('shows an Expired card so rows the default filter hides are visible', async () => {
    useOffers(MIXED);
    renderWithProviders(<SpecialOffersListPage />);

    await screen.findByText('Active Sale');
    const label = screen.getByText('Expired');
    // MIXED holds two non-live rows — one whose window has run out and one
    // that is switched off — and the default Active view hides both. Folding
    // the switched-off row into 'expired' is what lets this single card
    // surface all of them without touching the filter.
    expect(label.previousElementSibling).toHaveTextContent('2');
  });

  // Filter Expired and land on nothing used to read "Try adjusting your
  // filters", which is a dead end when the truthful answer is "you have none
  // in that state".
  it('answers a status filter with no matches instead of sending a dead end', async () => {
    useOffers([
      offer({ id: 'o-1', name: 'Active Sale', status: 'active' }),
      offer({ id: 'o-2', name: 'Dead Sale', status: 'expired' }),
    ]);
    renderWithProviders(<SpecialOffersListPage />);

    const user = userEvent.setup();
    await screen.findByText('Active Sale');

    await user.click(screen.getByRole('combobox', { name: 'Status' }));
    await user.click(await screen.findByRole('option', { name: 'Scheduled' }));

    expect(await screen.findByText('No scheduled offers')).toBeInTheDocument();
    expect(screen.getByText(/None of your 2 offers have that status/)).toBeInTheDocument();
    expect(screen.queryByText(/Try adjusting your filters/i)).toBeNull();

    await user.click(screen.getByRole('button', { name: /show all 2 offers/i }));
    expect(await screen.findByText('Dead Sale')).toBeInTheDocument();
  });
});
