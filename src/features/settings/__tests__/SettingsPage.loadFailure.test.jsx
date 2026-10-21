/**
 * A failed settings load must never leave an editable form full of blanks.
 *
 * The load used to end in `catch { /* ignore *\/ }`, so a slow or broken
 * profile fetch rendered an EMPTY form that the supplier could "Save" —
 * overwriting their real business profile, address and tax details with empty
 * strings. This page refuses to render forms it could not populate.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const fetchCurrentUser = vi.fn();
const fetchBusinessProfile = vi.fn();

vi.mock('../api', () => ({
  fetchCurrentUser: (...a) => fetchCurrentUser(...a),
  fetchBusinessProfile: (...a) => fetchBusinessProfile(...a),
  updateCurrentUser: vi.fn(),
  uploadSupplierLogo: vi.fn(),
  updateBusinessProfile: vi.fn(),
  fetchNotificationPreferences: vi.fn(),
  updateNotificationPreferences: vi.fn(),
  fetchNotificationRecipients: vi.fn(),
  addNotificationRecipient: vi.fn(),
  updateNotificationRecipient: vi.fn(),
  resendNotificationRecipient: vi.fn(),
  removeNotificationRecipient: vi.fn(),
  fetchTaxInfo: vi.fn(),
  updateTaxInfo: vi.fn(),
  fetchPayoutMethods: vi.fn(),
  createPayoutMethod: vi.fn(),
  deletePayoutMethod: vi.fn(),
  fetchPayouts: vi.fn(),
  fetchPayoutSettings: vi.fn(),
  fetchFinanceSummary: vi.fn(),
  fetchTeamMembers: vi.fn(),
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

const USER = { id: 'u-1', name: 'Ama Serwaa', email: 'ama@example.com', language: 'en', timezone: 'UTC' };
const PROFILE = {
  businessInfo: { displayName: 'Accra Cultural Tours', address: { line1: '12 Oxford St', city: 'Accra' } },
  operatingInfo: { regions: ['Greater Accra'] },
  representativeInfo: { fullName: 'Ama Serwaa' },
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  fetchCurrentUser.mockReset().mockResolvedValue(USER);
  fetchBusinessProfile.mockReset().mockResolvedValue(PROFILE);
});

afterEach(() => {
  cleanup();
});

describe('when the settings fetch fails', () => {
  it('refuses to render the forms and says nothing was changed', async () => {
    fetchBusinessProfile.mockRejectedValue(new Error('gateway down'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByText(/we couldn't load your settings/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing has been changed/i)).toBeInTheDocument();

    // The critical assertion: no saveable form exists to overwrite the
    // supplier's real profile with blanks.
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
    expect(screen.queryByLabelText(/brand name/i)).toBeNull();
  });

  it('retries when asked, and renders the forms once the load succeeds', async () => {
    fetchBusinessProfile.mockRejectedValueOnce(new Error('gateway down'));

    renderPage();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());

    fetchBusinessProfile.mockResolvedValue(PROFILE);
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(screen.queryByRole('alert')).toBeNull();
    });
    expect(await screen.findByText('Personal Information')).toBeInTheDocument();
  });
});

describe('when the settings load succeeds', () => {
  it('renders the populated form', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Personal Information')).toBeInTheDocument();
    });
    expect(await screen.findByDisplayValue('Accra Cultural Tours')).toBeInTheDocument();
  });
});
