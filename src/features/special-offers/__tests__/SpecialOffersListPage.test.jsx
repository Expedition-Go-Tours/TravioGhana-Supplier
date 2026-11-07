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
    fireEvent.change(screen.getByPlaceholderText('Search offers by name…'), { target: { value: 'zzzz' } });

    expect(await screen.findByText('No matching offers')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /clear all filters/i }));

    expect(await screen.findByText('Active Sale')).toBeInTheDocument();
    // Back at rest: expired rows stay hidden and the Clear button is gone.
    expect(screen.queryByText('Dead Sale')).toBeNull();
    expect(screen.queryByRole('button', { name: /^clear$/i })).toBeNull();
  });

  it('counts every offer in the status tabs, not just the filtered view', async () => {
    useOffers(MIXED);
    renderWithProviders(<SpecialOffersListPage />);

    await screen.findByText('Active Sale');
    // The tabs replaced the four stat cards: they are both the summary and the
    // filter, and every count comes from `offers`, not the visible rows.
    expect(screen.getByRole('button', { name: /^All\s*4$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Active\s*1$/ })).toBeInTheDocument();
  });

  it('keeps expired rows findable from the status tabs', async () => {
    useOffers(MIXED);
    renderWithProviders(<SpecialOffersListPage />);

    await screen.findByText('Active Sale');
    // MIXED holds two non-live rows — one whose window has run out and one
    // that is switched off — and the default Active view hides both. Folding
    // the switched-off row into 'expired' is what lets this one tab surface
    // all of them without touching the list.
    expect(screen.getByRole('button', { name: /^Expired\s*2$/ })).toBeInTheDocument();
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

    await user.click(screen.getByRole('button', { name: /^Scheduled\s*0$/ }));

    expect(await screen.findByText('No scheduled offers')).toBeInTheDocument();
    expect(screen.getByText(/None of your 2 offers have that status/)).toBeInTheDocument();
    expect(screen.queryByText(/Try adjusting your filters/i)).toBeNull();

    await user.click(screen.getByRole('button', { name: /show all 2 offers/i }));
    expect(await screen.findByText('Dead Sale')).toBeInTheDocument();
  });
});

describe('SpecialOffersListPage activation affordance', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const ENDED = new Date(Date.now() - DAY).toISOString();
  const FUTURE = new Date(Date.now() + 7 * DAY).toISOString();

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('auth_token', 'test-token');
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('does not offer Activate on an offer whose end date has passed', async () => {
    useOffers([
      offer({ id: 'o-1', name: 'Live Sale', status: 'active', endDate: FUTURE }),
      offer({ id: 'o-2', name: 'Ended Sale', status: 'expired', isActive: false, endDate: ENDED }),
    ]);
    renderWithProviders(<SpecialOffersListPage />);
    const user = userEvent.setup();

    await screen.findByText('Live Sale');
    await user.click(screen.getByRole('button', { name: /^Expired\s*1$/ }));
    await screen.findByText('Ended Sale');

    await user.click(screen.getByLabelText('Actions for Ended Sale'));

    // Edit is still the way out; the switch would only lie about the result.
    expect(await screen.findByRole('menuitem', { name: /edit/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /^activate$/i })).toBeNull();
    expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
  });

  it('still offers Activate when only the switch is off and the window is open', async () => {
    useOffers([
      offer({ id: 'o-1', name: 'Live Sale', status: 'active', endDate: FUTURE }),
      offer({ id: 'o-2', name: 'Switched Off Sale', status: 'expired', isActive: false, endDate: FUTURE }),
    ]);
    renderWithProviders(<SpecialOffersListPage />);
    const user = userEvent.setup();

    await screen.findByText('Live Sale');
    await user.click(screen.getByRole('button', { name: /^Expired\s*1$/ }));
    await screen.findByText('Switched Off Sale');

    await user.click(screen.getByLabelText('Actions for Switched Off Sale'));

    expect(await screen.findByRole('menuitem', { name: /^activate$/i })).toBeInTheDocument();
  });

  it('explains why an ended offer cannot be switched on in the detail modal', async () => {
    useOffers([
      offer({
        id: 'o-1',
        name: 'Ended Sale',
        status: 'expired',
        isActive: false,
        endDate: ENDED,
        targets: [{ id: 't-1', tourId: 'tour-1', tour: { id: 'tour-1', title: 'Old Trek', photos: [], coverPhoto: null } }],
      }),
    ]);
    renderWithProviders(<SpecialOffersListPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /^Expired\s*1$/ }));
    const [cardTitle] = await screen.findAllByRole('button', { name: 'Old Trek' });
    await user.click(cardTitle);

    expect(await screen.findByText(/This offer has ended/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^activate$/i })).toBeNull();
    expect(screen.getByRole('button', { name: /edit offer/i })).toBeInTheDocument();
  });
});
