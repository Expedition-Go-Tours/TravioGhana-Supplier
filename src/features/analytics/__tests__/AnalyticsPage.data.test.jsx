/**
 * The Analytics page is gated on `analytics.view` (admin + editor + finance) and
 * used to build its per-product charts by calling the supplier's BOOKINGS LIST —
 * `bookings.view`, which is admin + editor. A finance member could open the page
 * and got "You do not have permission" instead of the charts.
 *
 * These tests pin the page to the endpoints its own key allows, and prove the
 * charts still get their data.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const fetchSupplierAnalytics = vi.fn();
const fetchMonthlyRevenue = vi.fn();
const fetchProductAnalytics = vi.fn();
const fetchSupplierBookings = vi.fn();

vi.mock('../api', () => ({
  fetchSupplierAnalytics: (...a) => fetchSupplierAnalytics(...a),
  fetchMonthlyRevenue: (...a) => fetchMonthlyRevenue(...a),
  fetchProductAnalytics: (...a) => fetchProductAnalytics(...a),
}));

vi.mock('@/features/bookings/api', () => ({
  fetchSupplierBookings: (...a) => fetchSupplierBookings(...a),
}));

vi.mock('@/stores/authStore', () => ({ getAuthToken: () => 'token' }));

import AnalyticsPage from '../pages/AnalyticsPage';

const PRODUCTS = [
  { tourId: 'tour-1', name: 'Shai Hills Safari', photo: null, rating: 4.5, bookings: 7, revenue: 2100, payout: 1470 },
  { tourId: 'tour-2', name: 'Cape Coast Castle', photo: null, rating: 4.1, bookings: 2, revenue: 300, payout: 210 },
];

const DASHBOARD = {
  tours: { active: 3, total: 3 },
  bookings: { confirmed: 2, pending: 1 },
  earnings: { totalEarnings: 2400 },
  reviews: { averageRating: 4.3, total: 12 },
  topProducts: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  fetchSupplierAnalytics.mockResolvedValue(DASHBOARD);
  fetchMonthlyRevenue.mockResolvedValue([{ month: '2026-09', revenue: 2400 }]);
  fetchProductAnalytics.mockResolvedValue(PRODUCTS);
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <AnalyticsPage />
    </MemoryRouter>,
  );

describe("the Analytics page's data sources", () => {
  it('asks for the per-product analytics, not the Bookings list', async () => {
    renderPage();

    await waitFor(() => expect(fetchProductAnalytics).toHaveBeenCalled());
    // The bookings list is `bookings.view`; this page is `analytics.view`, and a
    // finance member holds only the latter.
    expect(fetchSupplierBookings).not.toHaveBeenCalled();
  });

  it('charts the products the endpoint returned', async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByText('Shai Hills Safari').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Cape Coast Castle').length).toBeGreaterThan(0);
  });

  it('keeps two tours with the same title as two products', async () => {
    // "City Tour" run from two different meeting points is two products with
    // two calendars and two prices. Merging them by title produced one row
    // that described neither, and hid both of their real ratings.
    fetchProductAnalytics.mockResolvedValue([
      { tourId: 'tour-1', name: 'City Tour', photo: null, rating: 4.5, bookings: 7, revenue: 2100 },
      { tourId: 'tour-3', name: 'City Tour', photo: null, rating: 2.0, bookings: 3, revenue: 900 },
    ]);

    renderPage();

    await waitFor(() => expect(screen.getAllByText('City Tour').length).toBeGreaterThan(1));
    // Each row shows its OWN rating, not the account average.
    expect(screen.getAllByText(/4\.50 ★/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2\.00 ★/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/4\.30 ★/)).toBeNull();
  });

  it('names the two buckets a comparison actually uses', async () => {
    fetchMonthlyRevenue.mockResolvedValue([
      { month: '2026-08', revenue: 1000, bookings: 2 },
      { month: '2026-09', revenue: 2000, bookings: 4 },
      { month: '2026-10', revenue: 2400, bookings: 5 },
    ]);

    renderPage();

    // A real calculation over the monthly series: +20% revenue, +25% bookings,
    // and the label names the two months it compares. The old "vs previous
    // period" text had no calculation behind it at all.
    // Both the earnings and the bookings card carry the comparison label.
    await waitFor(() => expect(screen.getAllByText('Oct vs Sep').length).toBe(2));
    expect(screen.getAllByText(/▲ 20%/).length).toBeGreaterThan(0);
  });

  it('prints no comparison at all when the series cannot support one', async () => {
    fetchMonthlyRevenue.mockResolvedValue([{ month: '2026-10', revenue: 2400, bookings: 5 }]);

    renderPage();

    await waitFor(() => expect(screen.getByText('Earnings')).toBeInTheDocument());
    expect(screen.queryByText(/vs /i)).toBeNull();
    expect(screen.getAllByText('Last 12 months').length).toBe(2);
  });

  it('still renders the page when the products call fails — and says the data is missing', async () => {
    fetchProductAnalytics.mockRejectedValue(new Error('boom'));

    renderPage();

    // "No booking data" claims the supplier HAS no bookings. A failed fetch is
    // a different statement and the page now makes it.
    await waitFor(() => {
      expect(screen.getByText(/couldn't load the per-product charts/i)).toBeInTheDocument();
    });
    expect(screen.queryByText('No booking data')).toBeNull();
  });

  it('charts the revenue trend from the amounts the API actually returns', async () => {
    // The endpoint sends `grossAmount`, and the chart read `revenue`, so the
    // trend rendered an empty state for suppliers who had revenue every month.
    fetchMonthlyRevenue.mockResolvedValue([
      { month: '2026-09', grossAmount: 2400, bookingCount: 4 },
      { month: '2026-10', grossAmount: 3000, bookingCount: 6 },
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.queryByText(/No revenue recorded/i)).toBeNull();
    });
    expect(screen.getAllByText('Oct vs Sep').length).toBe(2);
  });
});
