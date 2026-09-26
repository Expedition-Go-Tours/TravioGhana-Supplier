/**
 * The dashboard's "Recent Bookings" panel is the Bookings page's own data, and
 * the Bookings page is not every role's to open (`bookings.view`: admin +
 * editor). The panel used to be requested unconditionally, so a finance member
 * got a permission error on every dashboard load and a panel that could only
 * ever say "No recent bookings".
 *
 * The request follows the page, exactly as the dashboard's links already did.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { hasTeamPermission } from '@/config/teamRoles';

const teamRoleState = { isOwner: false, teamRoles: [], permissions: [] };
const useTeamRole = vi.fn(() => teamRoleState);

vi.mock('@/hooks/useTeamRole', () => ({ useTeamRole: () => useTeamRole() }));

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
  useAuthStore: (select) => select({ user: { id: 'member-1', name: 'Portal Probe finance' } }),
}));

import DashboardPage from '../pages/DashboardPage';

const DASHBOARD = {
  tours: { active: 3, total: 3 },
  bookings: { confirmed: 2, pending: 1 },
  earnings: { totalEarnings: 2400 },
  reviews: { averageRating: 4.3, total: 12 },
  topProducts: [{ id: 'tour-1', title: 'Shai Hills Safari', bookings: 3, revenue: 900, reviewCount: 0, averageRating: 0 }],
};

const BOOKINGS = [
  { id: 'b-1', tourName: 'Shai Hills Safari', travelDate: '2026-10-02', travelers: 2, total: 120, currency: 'USD', status: 'CONFIRMED', tourPhoto: null },
];

/** The real permission matrix, applied to the roles a member can actually hold. */
const asMemberOf = (roles) => {
  useTeamRole.mockReturnValue({
    isOwner: false,
    teamRoles: roles,
    permissions: roles.flatMap((r) => [r]),
    hasPermission: (permission) => hasTeamPermission(roles, permission),
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  asMemberOf(['finance']);
  fetchSupplierDashboard.mockResolvedValue(DASHBOARD);
  fetchMonthlyRevenue.mockResolvedValue([]);
  fetchSupplierBookings.mockResolvedValue({ bookings: BOOKINGS, total: 1 });
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );

describe('a role without the Bookings page', () => {
  it('never asks for the bookings list', async () => {
    renderPage();

    await waitFor(() => expect(fetchSupplierDashboard).toHaveBeenCalled());
    // `bookings.view` is admin + editor; finance holds it for nothing.
    expect(fetchSupplierBookings).not.toHaveBeenCalled();
  });

  it('has no Recent Bookings panel left saying "No recent bookings"', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('Top Products')).toBeInTheDocument());
    expect(screen.queryByText('Recent Bookings')).not.toBeInTheDocument();
    expect(screen.queryByText('No recent bookings')).not.toBeInTheDocument();
  });

  it('still shows the dashboard it does have', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('Total Bookings')).toBeInTheDocument());
    expect(screen.getByText('Shai Hills Safari')).toBeInTheDocument();
  });
});

describe('a role with the Bookings page', () => {
  it('asks for the recent bookings and shows them', async () => {
    asMemberOf(['editor']);

    renderPage();

    await waitFor(() => expect(fetchSupplierBookings).toHaveBeenCalledWith({ page: 1, limit: 4 }));
    expect(screen.getByText('Recent Bookings')).toBeInTheDocument();
    expect(screen.getAllByText('Shai Hills Safari').length).toBeGreaterThan(0);
  });

  it('keeps the panel for the owner, who owns every tour outright', async () => {
    useTeamRole.mockReturnValue({
      isOwner: true,
      teamRoles: [],
      permissions: [],
      hasPermission: () => true,
    });

    renderPage();

    await waitFor(() => expect(fetchSupplierBookings).toHaveBeenCalled());
    expect(screen.getByText('Recent Bookings')).toBeInTheDocument();
  });
});
