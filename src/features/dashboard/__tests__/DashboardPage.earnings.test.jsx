/**
 * The dashboard's "Total Earnings" card.
 *
 * Two things it must never do:
 *  1. print a total the account does not hold — GH₵200 and $200 are two
 *     balances, not $400;
 *  2. read as "money in your bank" — it is the supplier's cut on paid
 *     bookings over the account's lifetime, including what is still owed and
 *     what has not cleared. The hint says so on the card.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useTeamRole', () => ({
  useTeamRole: () => ({
    isOwner: true,
    hasPermission: () => true,
  }),
}));

const fetchSupplierDashboard = vi.fn();
const fetchMonthlyRevenue = vi.fn();
vi.mock('../api', () => ({
  fetchSupplierDashboard: (...a) => fetchSupplierDashboard(...a),
  fetchMonthlyRevenue: (...a) => fetchMonthlyRevenue(...a),
}));

const fetchSupplierBookings = vi.fn();
vi.mock('@/features/bookings/api', () => ({
  fetchSupplierBookings: (...a) => fetchSupplierBookings(...a),
}));
vi.mock('@/features/cancellation/api', () => ({
  fetchCancellationSummary: () => Promise.resolve(null),
}));
vi.mock('@/features/notifications/hooks/useNotifications', () => ({
  useNotifications: () => ({ data: { notifications: [], unreadCount: 0 }, refetch: vi.fn() }),
  useMarkAllNotificationsRead: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@/stores/authStore', () => ({
  getAuthToken: () => 'token',
  useAuthStore: (select) => select({ user: { id: 'owner-1', name: 'Expedition Go' } }),
}));

import DashboardPage from '../pages/DashboardPage';

const dashboardWith = (earnings) => ({
  tours: { active: 3, total: 3 },
  bookings: { total: 5, confirmed: 2, pending: 1 },
  earnings,
  reviews: { averageRating: 4.3, total: 12 },
  topProducts: [],
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  fetchMonthlyRevenue.mockResolvedValue([]);
  fetchSupplierBookings.mockResolvedValue({ bookings: [], total: 0 });
});

describe('Total Earnings', () => {
  it('shows the supplier’s cut, with a hint that it is not cash received', async () => {
    fetchSupplierDashboard.mockResolvedValue(
      dashboardWith({
        totalEarnings: 4707.66,
        totalRevenue: 5531,
        currency: 'USD',
        byCurrency: [{ currency: 'USD', supplierCut: 4707.66, gross: 5531, bookings: 38 }],
      }),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('$4,707.66')).toBeInTheDocument();
    });
    // The misreading this exists to prevent: $4,707.66 is not "in the bank".
    expect(screen.getByText('Lifetime · your cut on paid bookings')).toBeInTheDocument();
  });

  it('lists each currency rather than inventing one total', async () => {
    fetchSupplierDashboard.mockResolvedValue(
      dashboardWith({
        totalEarnings: null,
        totalRevenue: null,
        currency: null,
        byCurrency: [
          { currency: 'GHS', supplierCut: 200, gross: 240, bookings: 1 },
          { currency: 'USD', supplierCut: 100, gross: 120, bookings: 2 },
        ],
      }),
    );

    renderPage();

    await waitFor(() => {
      // Intl renders GHS as "GHS 200.00", not "GH₵200.00".
      expect(screen.getByText('GHS 200.00')).toBeInTheDocument();
    });
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    // The number nobody holds.
    expect(screen.queryByText(/300/)).toBeNull();
  });

  it('shows a measured zero when nothing has been earned', async () => {
    fetchSupplierDashboard.mockResolvedValue(
      dashboardWith({
        totalEarnings: 0,
        totalRevenue: 0,
        currency: 'USD',
        byCurrency: [],
      }),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });
  });

  it('still understands the older single-number payload', async () => {
    fetchSupplierDashboard.mockResolvedValue(dashboardWith({ totalEarnings: 2400 }));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('$2,400.00')).toBeInTheDocument();
    });
  });
});
