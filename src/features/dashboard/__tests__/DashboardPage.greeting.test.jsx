/**
 * The greeting under "Good morning" tells the supplier whether they have work
 * waiting. It is the one line on the dashboard that makes a promise about their
 * business, so it must never make one it cannot keep.
 *
 * `pendingBookings` is 0 in two very different situations: the supplier really
 * is caught up, and the fetch has not landed yet. The line used to read
 * `pendingBookings > 0 ? "You have N pending bookings to review." :
 * "All caught up — no pending requests."` — so it opened with a false all-clear
 * on every single dashboard load, and on a failed fetch it claimed the same
 * thing directly above the red error banner. A supplier with twelve bookings to
 * review was told there was nothing to do, on every visit, until the numbers
 * arrived and the line contradicted itself.
 *
 * The gate is whether the data exists, not whether a spinner is showing, so
 * these tests pin the three states separately and then check the two settled
 * ones are parallel and exact.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

const notificationState = {
  data: { notifications: [], unreadCount: 0 },
  refetch: vi.fn(),
};

vi.mock('@/features/notifications/hooks/useNotifications', () => ({
  useNotifications: () => ({ data: notificationState.data, refetch: notificationState.refetch }),
  useMarkAllNotificationsRead: () => ({ mutateAsync: vi.fn() }),
}));

// Mutable, for the one test that needs the signed-out render: with no token the
// dashboard never fetches, so there is no data and no request in flight either.
const authState = { hasToken: true };

vi.mock('@/stores/authStore', () => ({
  getAuthToken: () => (authState.hasToken ? 'token' : null),
  useAuthStore: (select) => select({ user: { id: 'member-1', name: 'Ama Mensah' } }),
}));

import DashboardPage from '../pages/DashboardPage';

const DASHBOARD = {
  tours: { active: 3, total: 3 },
  bookings: { confirmed: 2, pending: 0 },
  earnings: { totalEarnings: 2400 },
  reviews: { averageRating: 4.3, total: 12 },
  topProducts: [{ id: 'tour-1', title: 'Shai Hills Safari', bookings: 3, revenue: 900, reviewCount: 0, averageRating: 0 }],
};

const withPending = (n) => ({
  ...DASHBOARD,
  bookings: { ...DASHBOARD.bookings, pending: n },
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  useTeamRole.mockReturnValue({
    isOwner: true,
    teamRoles: [],
    permissions: [],
    hasPermission: (permission) => hasTeamPermission([], permission) || true,
  });
  fetchSupplierDashboard.mockResolvedValue(DASHBOARD);
  fetchMonthlyRevenue.mockResolvedValue([]);
  fetchSupplierBookings.mockResolvedValue({ bookings: [], total: 0 });
  notificationState.data = { notifications: [], unreadCount: 0 };
  authState.hasToken = true;
});

describe('the greeting never promises there is nothing to do before it knows', () => {
  it('says nothing about pending work while the numbers are still loading', () => {
    // A promise that never settles: this is the state every real page load
    // passes through, and the one the bug lived in.
    fetchSupplierDashboard.mockReturnValue(new Promise(() => {}));

    renderPage();

    // The old line rendered here, because `pendingBookings` defaulted to 0.
    expect(screen.queryByText(/All caught up/)).not.toBeInTheDocument();
    expect(screen.queryByText(/no pending requests/)).not.toBeInTheDocument();
    expect(screen.queryByText(/pending bookings? to review/)).not.toBeInTheDocument();
    expect(screen.getByText('Checking your pending bookings…')).toBeInTheDocument();
  });

  it('declines to comment when the numbers could not be loaded, rather than claiming all is well', async () => {
    // The banner shows `err.response?.data?.message || err.message`, so a plain
    // Error surfaces its own message rather than the generic fallback.
    fetchSupplierDashboard.mockRejectedValue(new Error('Network unreachable'));

    renderPage();

    await waitFor(() => expect(screen.getByText('Network unreachable')).toBeInTheDocument());
    // The failure state that actually shipped: the error banner, with a
    // confident "All caught up" sitting directly above it.
    expect(screen.queryByText(/All caught up/)).not.toBeInTheDocument();
    expect(screen.queryByText(/no pending requests/)).not.toBeInTheDocument();
    expect(
      screen.getByText('We could not load your pending bookings.'),
    ).toBeInTheDocument();
  });
});

describe('once the numbers are in', () => {
  it('tells the supplier exactly how many bookings are waiting, and pluralises', async () => {
    fetchSupplierDashboard.mockResolvedValue(withPending(1));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('You have 1 pending booking to review.')).toBeInTheDocument(),
    );

    fetchSupplierDashboard.mockResolvedValue(withPending(12));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('You have 12 pending bookings to review.')).toBeInTheDocument(),
    );
  });

  it('claims only what the data supports when there is nothing pending', async () => {
    fetchSupplierDashboard.mockResolvedValue(withPending(0));
    renderPage();

    await waitFor(() => expect(screen.getByText('Total Bookings')).toBeInTheDocument());
    // Exact, and parallel with the branch above it — same subject, same noun,
    // same shape. Not "requests", which is what the card two inches below calls
    // the same number, and not a longer dash-clause restating "All caught up".
    expect(screen.getByText('No pending bookings to review.')).toBeInTheDocument();
    expect(screen.queryByText(/All caught up/)).not.toBeInTheDocument();
    expect(screen.queryByText(/requests/)).not.toBeInTheDocument();
  });

  it('keeps showing the numbers it already has while a manual refresh hangs', async () => {
    fetchSupplierDashboard.mockResolvedValue(withPending(4));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('You have 4 pending bookings to review.')).toBeInTheDocument(),
    );

    // This is the case that decides the gate. Gating on `loading` would blank a
    // number the page is still perfectly confident about, because the previous
    // fetch's data is sitting right there.
    fetchSupplierDashboard.mockReturnValue(new Promise(() => {}));
    fireEvent.click(screen.getByText('Refresh'));

    await waitFor(() => expect(fetchSupplierDashboard).toHaveBeenCalledTimes(2));
    expect(screen.getByText('You have 4 pending bookings to review.')).toBeInTheDocument();
    expect(screen.queryByText(/Checking/)).not.toBeInTheDocument();
    // Refresh is disabled while a reload is in flight, so the hang is visible
    // on the button rather than by the greeting blanking itself.
    expect(screen.getByText('Refresh').closest('button')).toBeDisabled();
  });

  it('keeps the last-known number when a manual refresh fails', async () => {
    fetchSupplierDashboard.mockResolvedValue(withPending(4));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('You have 4 pending bookings to review.')).toBeInTheDocument(),
    );

    fetchSupplierDashboard.mockRejectedValue(new Error('offline'));
    fireEvent.click(screen.getByText('Refresh'));

    // The banner says the reload failed; the number stays, because the
    // last-known value beats a placeholder. Under the old `loading` gate this
    // line would have been replaced with a loading state, and under the old
    // unguarded ternary it would have claimed there was nothing to do.
    await waitFor(() => expect(screen.getByText('offline')).toBeInTheDocument());
    expect(screen.getByText('You have 4 pending bookings to review.')).toBeInTheDocument();
    expect(screen.queryByText(/All caught up/)).not.toBeInTheDocument();
    expect(screen.queryByText(/pending bookings to review.*We could not/)).not.toBeInTheDocument();
  });

  it('renders no status line at all when there is no data and no request in flight', async () => {
    // The signed-out render: `getAuthToken` is null so the fetch short-circuits,
    // leaving nothing to claim and nothing to be loading about. The old ternary
    // rendered a confident all-clear here too, which is the worst of both.
    authState.hasToken = false;
    fetchSupplierDashboard.mockReturnValue(new Promise(() => {}));

    renderPage();

    // The fetch is deferred by a microtask (`Promise.resolve().then`), so the
    // first synchronous frame still carries `loading`'s initial value. What
    // matters is the settled state: once the short-circuit has run, the line
    // has nothing to say and must say nothing. A permanent "Checking…" here
    // would keep this waiting and fail.
    await waitFor(() => {
      expect(screen.queryByText(/Checking/)).not.toBeInTheDocument();
    });
    expect(screen.queryByText(/pending bookings/)).not.toBeInTheDocument();
    expect(screen.queryByText(/All caught up/)).not.toBeInTheDocument();
    expect(fetchSupplierDashboard).not.toHaveBeenCalled();
  });
});

describe('the notifications empty state', () => {
  it('does not reuse the bell\'s "All caught up" for a list that is simply empty', async () => {
    fetchSupplierDashboard.mockResolvedValue(withPending(0));
    renderPage();

    await waitFor(() => expect(screen.getByText('No notifications yet')).toBeInTheDocument());
    // The bell's subtitle says "All caught up" for the unread count. Two panels
    // on one screen using it for two different meanings means one is mislabelled
    // even when both happen to be true — and this panel is empty whenever there
    // are no notifications AT ALL, which for a new supplier means none ever
    // arrived, not that they finished something.
    expect(screen.queryAllByText('All caught up')).toHaveLength(0);
  });

  it('advertises the notification types it actually receives', async () => {
    fetchSupplierDashboard.mockResolvedValue(withPending(0));
    renderPage();

    await waitFor(() => expect(screen.getByText('No notifications yet')).toBeInTheDocument());
    // NOTIFICATION_ICONS carries six types: new_booking, booking_confirmed,
    // new_review, payout, new_enquiry, booking_cancelled. An enquiry is the one
    // a supplier most wants to see and it used to hide under "updates".
    expect(
      screen.getByText('Bookings, payouts, reviews and customer enquiries will appear here.'),
    ).toBeInTheDocument();
  });
});
