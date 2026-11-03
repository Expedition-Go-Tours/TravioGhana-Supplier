import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import TeamInvitePage from '@/pages/TeamInvitePage';

const mocks = vi.hoisted(() => ({
  fetchInviteDetails: vi.fn(),
  registerInvite: vi.fn(),
  acceptInvite: vi.fn(),
  declineInvite: vi.fn(),
  setAccountPassword: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock('@/features/settings/api', () => ({
  fetchInviteDetails: mocks.fetchInviteDetails,
  registerInvite: mocks.registerInvite,
  acceptInvite: mocks.acceptInvite,
  declineInvite: mocks.declineInvite,
}));

vi.mock('@/features/auth/api', () => ({
  setAccountPassword: mocks.setAccountPassword,
}));

vi.mock('@/hooks/useTeamRole', () => ({
  useTeamRole: () => ({ refetch: mocks.refetch, teamRole: null }),
}));

const authState = vi.hoisted(() => ({
  current: null,
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => authState.current,
}));

vi.mock('@/config', () => ({
  default: { api: { baseURL: 'http://api.test' } },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

const INVITE_EMAIL = 'invitee@test.com';

const INVITE = {
  supplierName: 'Expedition-Go Tours LTD',
  invitedByName: 'Kwame Mensah',
  role: 'editor',
  roles: ['editor', 'finance'],
  roleViews: [
    { key: 'editor', label: 'Editor', summary: 'Manage tours, bookings and products' },
    { key: 'finance', label: 'Finance', summary: 'See earnings, payouts and payout methods' },
  ],
  invitedEmail: INVITE_EMAIL,
  accountExists: false,
  accountHasPassword: false,
};

const renderPage = (route = '/team/invite?token=tok-1') => renderWithProviders(<TeamInvitePage />, { route });

const errorResponse = (status, message, code) => {
  const error = new Error(message);
  error.response = { status, data: { message, ...(code ? { code } : {}) } };
  return error;
};

const signedIn = ({ user = {}, ...rest } = {}) => ({
  isAuthenticated: true,
  user: { id: 'u-1', email: INVITE_EMAIL, hasPassword: true, ...user },
  login: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
  updateUser: vi.fn(),
  ...rest,
});

const signedOut = () => ({
  isAuthenticated: false,
  user: null,
  login: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
  updateUser: vi.fn(),
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  authState.current = signedIn();
  mocks.fetchInviteDetails.mockResolvedValue(INVITE);
  mocks.acceptInvite.mockResolvedValue({
    member: { id: 'tm-1', roles: ['editor', 'finance'], status: 'ACCEPTED' },
    landingPath: '/bookings',
  });
});

describe('TeamInvitePage', () => {
  describe('anonymous invitee', () => {
    beforeEach(() => {
      authState.current = signedOut();
    });

    it('asks for a name and password when no account exists', async () => {
      renderPage();

      expect(await screen.findByRole('heading', { name: /create your account/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(mocks.acceptInvite).not.toHaveBeenCalled();
    });

    it('registers from the token and signs the new member in', async () => {
      const login = vi.fn();
      authState.current = { ...signedOut(), login };
      mocks.registerInvite.mockResolvedValue({
        user: { id: 'u-new', email: INVITE_EMAIL, roles: ['customer', 'supplier'], hasPassword: true },
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
        landingPath: '/bookings',
      });

      renderPage();

      await userEvent.type(await screen.findByLabelText(/full name/i), 'Ama Mensah');
      await userEvent.type(screen.getByLabelText(/^password$/i), 'correct horse');
      await userEvent.type(screen.getByLabelText(/confirm password/i), 'correct horse');
      await userEvent.click(screen.getByRole('button', { name: /create account and accept/i }));

      await waitFor(() =>
        expect(mocks.registerInvite).toHaveBeenCalledWith('tok-1', {
          name: 'Ama Mensah',
          password: 'correct horse',
        })
      );
      expect(mocks.acceptInvite).not.toHaveBeenCalled();
      expect(login).toHaveBeenCalledWith(
        expect.objectContaining({ email: INVITE_EMAIL }),
        'access-1',
        null
      );
      expect(localStorage.getItem('refresh_token')).toBe('refresh-1');
    });

    it('refuses a password shorter than eight characters without calling the API', async () => {
      renderPage();

      await userEvent.type(await screen.findByLabelText(/full name/i), 'Ama Mensah');
      await userEvent.type(screen.getByLabelText(/^password$/i), 'short');
      await userEvent.type(screen.getByLabelText(/confirm password/i), 'short');
      await userEvent.click(screen.getByRole('button', { name: /create account and accept/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/at least 8 characters/i);
      expect(mocks.registerInvite).not.toHaveBeenCalled();
    });

    it('points an existing password account at sign-in instead of showing a password form', async () => {
      mocks.fetchInviteDetails.mockResolvedValue({
        ...INVITE,
        accountExists: true,
        accountHasPassword: true,
      });

      renderPage();

      expect(await screen.findByRole('heading', { name: /sign in to accept/i })).toBeInTheDocument();
      expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue to sign in/i })).toBeInTheDocument();
    });

    it('sends a Google-only account through Google', async () => {
      mocks.fetchInviteDetails.mockResolvedValue({
        ...INVITE,
        accountExists: true,
        accountHasPassword: false,
      });

      renderPage();

      expect(await screen.findByRole('heading', { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument();
    });

    it('switches to the sign-in door when the email turns out to have an account', async () => {
      mocks.registerInvite.mockRejectedValue(
        errorResponse(409, 'An account already exists for this email. Sign in to accept the invitation.', 'ACCOUNT_EXISTS')
      );

      renderPage();

      await userEvent.type(await screen.findByLabelText(/full name/i), 'Ama Mensah');
      await userEvent.type(screen.getByLabelText(/^password$/i), 'correct horse');
      await userEvent.type(screen.getByLabelText(/confirm password/i), 'correct horse');
      await userEvent.click(screen.getByRole('button', { name: /create account and accept/i }));

      expect(await screen.findByRole('heading', { name: /sign in to accept/i })).toBeInTheDocument();
      expect(screen.getByText(/already exists for this email/i)).toBeInTheDocument();
    });
  });

  describe('signed-in invitee', () => {
    it('shows the access being granted and accepts only when the button is pressed', async () => {
      renderPage();

      expect(await screen.findByText(/Manage tours, bookings and products/)).toBeInTheDocument();
      expect(screen.getByText(/See earnings, payouts and payout methods/)).toBeInTheDocument();
      expect(mocks.acceptInvite).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole('button', { name: /accept invitation/i }));

      await waitFor(() => expect(mocks.acceptInvite).toHaveBeenCalledWith('tok-1'));
      expect(mocks.refetch).toHaveBeenCalled();
      expect(await screen.findByText(/you are on the team/i)).toBeInTheDocument();
      expect(screen.getByText(/Editor \+ Finance/)).toBeInTheDocument();
    });

    it('refuses to accept an invitation sent to a different email', async () => {
      authState.current = signedIn({ user: { email: 'someone.else@test.com' } });

      renderPage();

      expect(await screen.findByText(/this invite is for a different email/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /accept invitation/i })).not.toBeInTheDocument();
      expect(mocks.acceptInvite).not.toHaveBeenCalled();
    });

    it('offers a password step after accepting with a Google-only account', async () => {
      authState.current = signedIn({ user: { hasPassword: false } });
      const updateUser = authState.current.updateUser;

      renderPage();

      await userEvent.click(await screen.findByRole('button', { name: /accept invitation/i }));

      expect(await screen.findByRole('heading', { name: /you are on the team/i })).toBeInTheDocument();
      expect(screen.getByText(/set a password so you can sign in with email/i)).toBeInTheDocument();

      mocks.setAccountPassword.mockResolvedValue({ status: 'success' });
      await userEvent.type(screen.getByLabelText(/new password/i), 'correct horse');
      await userEvent.type(screen.getByLabelText(/confirm password/i), 'correct horse');
      await userEvent.click(screen.getByRole('button', { name: /set password and continue/i }));

      await waitFor(() => expect(mocks.setAccountPassword).toHaveBeenCalledWith('correct horse'));
      expect(updateUser).toHaveBeenCalledWith({ hasPassword: true });
      expect(await screen.findByText(/^you are on the team$/i)).toBeInTheDocument();
    });

    it('lets the member skip the password step', async () => {
      authState.current = signedIn({ user: { hasPassword: false } });
      renderPage();

      await userEvent.click(await screen.findByRole('button', { name: /accept invitation/i }));
      expect(await screen.findByText(/i will set this later/i)).toBeInTheDocument();
      expect(mocks.setAccountPassword).not.toHaveBeenCalled();
    });
  });

  describe('link states', () => {
    it('reports a missing token without calling the API', async () => {
      renderPage('/team/invite');
      expect(await screen.findByText(/no invitation token/i)).toBeInTheDocument();
      expect(mocks.fetchInviteDetails).not.toHaveBeenCalled();
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
      expect(await screen.findByText(/invitation already used/i)).toBeInTheDocument();
    });

    it('reports an unknown token', async () => {
      mocks.fetchInviteDetails.mockRejectedValue(errorResponse(404, 'Invitation not found'));
      renderPage();
      expect(await screen.findByText(/invitation not found/i)).toBeInTheDocument();
    });

    it('surfaces a server error while accepting', async () => {
      mocks.acceptInvite.mockRejectedValue(errorResponse(500, 'Invitation could not be accepted'));
      renderPage();

      await userEvent.click(await screen.findByRole('button', { name: /accept invitation/i }));

      expect(await screen.findByText(/could not accept the invitation/i)).toBeInTheDocument();
      expect(screen.getByText(/could not be accepted/i)).toBeInTheDocument();
    });
  });
});
