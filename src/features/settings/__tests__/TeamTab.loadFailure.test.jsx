/**
 * The team list's failure state.
 *
 * A failed `fetchTeamMembers` used to toast and then render "No team members
 * yet" — indistinguishable from an account with nobody on it. A supplier could
 * conclude their team was gone. The list now says the load failed and that the
 * team is unchanged.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const fetchTeamMembers = vi.fn();

vi.mock('../api', () => ({
  fetchCurrentUser: vi.fn().mockResolvedValue({ id: 'u-1', name: 'Ama', email: 'ama@example.com' }),
  fetchBusinessProfile: vi.fn().mockResolvedValue({ businessInfo: {}, operatingInfo: {}, representativeInfo: {} }),
  updateCurrentUser: vi.fn(),
  uploadSupplierLogo: vi.fn(),
  updateBusinessProfile: vi.fn(),
  fetchNotificationPreferences: vi.fn().mockResolvedValue({}),
  updateNotificationPreferences: vi.fn(),
  fetchNotificationRecipients: vi.fn().mockResolvedValue([]),
  addNotificationRecipient: vi.fn(),
  updateNotificationRecipient: vi.fn(),
  resendNotificationRecipient: vi.fn(),
  removeNotificationRecipient: vi.fn(),
  fetchTaxInfo: vi.fn().mockResolvedValue({}),
  updateTaxInfo: vi.fn(),
  fetchPayoutMethods: vi.fn().mockResolvedValue([]),
  createPayoutMethod: vi.fn(),
  deletePayoutMethod: vi.fn(),
  fetchPayouts: vi.fn().mockResolvedValue({ payouts: [] }),
  fetchPayoutSettings: vi.fn().mockResolvedValue({}),
  fetchFinanceSummary: vi.fn().mockResolvedValue({}),
  fetchTeamMembers: (...a) => fetchTeamMembers(...a),
  inviteTeamMember: vi.fn(),
  removeTeamMember: vi.fn(),
  updateTeamMemberRole: vi.fn(),
  directAddTeamMember: vi.fn(),
  resendInvite: vi.fn(),
  revokeTeamInvite: vi.fn(),
}));

vi.mock('@/stores/authStore', () => ({
  getAuthToken: () => 'test-token',
  useAuthStore: Object.assign((selector) => selector({ user: { name: 'Ama' }, supplierProfile: null }), {
    getState: () => ({ user: { name: 'Ama' }, supplierProfile: null, updateUser: () => {} }),
  }),
}));

vi.mock('@/hooks/useTeamRole', () => ({
  useTeamRole: () => ({
    isOwner: true,
    hasPermission: () => true,
    canManageTeam: () => true,
    loading: false,
  }),
}));

import SettingsPage from '../pages/SettingsPage';

const MEMBERS = [
  { id: 'm-1', email: 'kwame@example.com', status: 'ACCEPTED', roles: ['editor'] },
];

const renderTeamTab = () =>
  render(
    <MemoryRouter initialEntries={['/settings?tab=team']}>
      <SettingsPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  fetchTeamMembers.mockReset().mockResolvedValue(MEMBERS);
});

afterEach(() => {
  cleanup();
});

describe('the team list', () => {
  it('shows the members when the load succeeds', async () => {
    renderTeamTab();

    await waitFor(() => {
      expect(screen.getByText('kwame@example.com')).toBeInTheDocument();
    });
  });

  it('says the load failed instead of claiming an empty team', async () => {
    fetchTeamMembers.mockRejectedValue(new Error('gateway down'));

    renderTeamTab();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByText(/couldn't load your team/i)).toBeInTheDocument();
    expect(screen.getByText(/not an empty team list/i)).toBeInTheDocument();
    // The exact misreading this guards against:
    expect(screen.queryByText(/no team members yet/i)).toBeNull();
  });

  it('retries into the real list', async () => {
    fetchTeamMembers.mockRejectedValueOnce(new Error('gateway down'));

    renderTeamTab();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText('kwame@example.com')).toBeInTheDocument();
    });
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
