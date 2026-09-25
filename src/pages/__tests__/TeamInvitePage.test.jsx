import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import TeamInvitePage from '@/pages/TeamInvitePage';

const mocks = vi.hoisted(() => ({
  fetchInviteDetails: vi.fn(),
  acceptInvite: vi.fn(),
  declineInvite: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock('@/features/settings/api', () => ({
  fetchInviteDetails: mocks.fetchInviteDetails,
  acceptInvite: mocks.acceptInvite,
  declineInvite: mocks.declineInvite,
}));

vi.mock('@/hooks/useTeamRole', () => ({
  useTeamRole: () => ({ refetch: mocks.refetch }),
}));

const authState = vi.hoisted(() => ({
  current: { isAuthenticated: true, user: { email: 'invitee@test.com' } },
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => authState.current,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

const INVITE = {
  supplierName: 'Expedition-Go Tours LTD',
  role: 'editor',
  invitedEmail: 'invitee@test.com',
};

const renderPage = (route = '/team/invite?token=tok-1') => renderWithProviders(<TeamInvitePage />, { route });

const errorResponse = (status, message) => {
  const error = new Error(message);
  error.response = { status, data: { message } };
  return error;
};

beforeEach(() => {
  vi.clearAllMocks();
  authState.current = { isAuthenticated: true, user: { email: 'invitee@test.com' } };
  mocks.fetchInviteDetails.mockResolvedValue(INVITE);
  mocks.acceptInvite.mockResolvedValue({ id: 'tm-1', role: 'editor', status: 'ACCEPTED' });
});

describe('TeamInvitePage', () => {
  it('accepts automatically when the signed-in email matches the invitation', async () => {
    renderPage();

    await waitFor(() => expect(mocks.acceptInvite).toHaveBeenCalledWith('tok-1'));
    expect(mocks.refetch).toHaveBeenCalled();
    expect(await screen.findByText(/welcome to the team/i)).toBeInTheDocument();
    expect(screen.getByText(/Expedition-Go Tours LTD/)).toBeInTheDocument();
  });

  it('shows the invitation for a different account and refuses to accept it', async () => {
    authState.current = { isAuthenticated: true, user: { email: 'someone.else@test.com' } };
    renderPage();

    // The details still load, but the accept button is the user's decision.
    expect(await screen.findByText(/team invitation/i)).toBeInTheDocument();
    expect(mocks.acceptInvite).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /accept invitation/i }));

    expect(await screen.findByText(/cannot accept/i)).toBeInTheDocument();
    expect(screen.getByText(/sent to invitee@test\.com/i)).toBeInTheDocument();
    expect(mocks.acceptInvite).not.toHaveBeenCalled();
  });

  it('reports an expired invitation', async () => {
    mocks.fetchInviteDetails.mockRejectedValue(errorResponse(410, 'Invitation has expired'));
    renderPage();

    expect(await screen.findByText(/invitation expired/i)).toBeInTheDocument();
  });

  it('reports a revoked invitation', async () => {
    mocks.fetchInviteDetails.mockRejectedValue(errorResponse(410, 'Invitation has been revoked'));
    renderPage();

    expect(await screen.findByText(/invitation revoked/i)).toBeInTheDocument();
  });

  it('reports an already-accepted invitation', async () => {
    mocks.fetchInviteDetails.mockRejectedValue(errorResponse(409, 'Invitation has already been accepted'));
    renderPage();

    expect(await screen.findByText(/already accepted/i)).toBeInTheDocument();
  });

  it('asks an anonymous visitor to sign in', async () => {
    authState.current = { isAuthenticated: false, user: null };
    renderPage();

    expect(await screen.findByText(/you're invited!/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in to accept/i })).toBeInTheDocument();
    expect(mocks.fetchInviteDetails).not.toHaveBeenCalled();
  });

  it('surfaces a server error when accepting fails', async () => {
    mocks.acceptInvite.mockRejectedValue(errorResponse(500, 'Invitation could not be accepted'));
    renderPage();

    expect(await screen.findByText(/cannot accept/i)).toBeInTheDocument();
    expect(screen.getByText(/could not be accepted/i)).toBeInTheDocument();
  });
});
