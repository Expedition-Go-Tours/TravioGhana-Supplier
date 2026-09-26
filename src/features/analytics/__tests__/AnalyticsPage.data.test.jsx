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

  it('adds up bookings per product name', async () => {
    fetchProductAnalytics.mockResolvedValue([
      { tourId: 'tour-1', name: 'Shai Hills Safari', photo: null, rating: 4.5, bookings: 7, revenue: 2100 },
      { tourId: 'tour-3', name: 'Shai Hills Safari', photo: null, rating: 4.5, bookings: 3, revenue: 900 },
    ]);

    renderPage();

    // One row for the name, not one per tour…
    await waitFor(() => expect(screen.getAllByText('Shai Hills Safari')).toHaveLength(1));
    // …and both tours' bookings under it.
    expect(screen.getAllByText('10').length).toBeGreaterThan(0);
  });

  it('still renders the page when the products call fails', async () => {
    fetchProductAnalytics.mockRejectedValue(new Error('boom'));

    renderPage();

    await waitFor(() => expect(screen.getByText('No booking data')).toBeInTheDocument());
  });
});
