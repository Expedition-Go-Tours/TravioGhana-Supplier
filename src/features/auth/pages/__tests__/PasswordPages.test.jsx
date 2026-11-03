import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/features/auth/pages/ResetPasswordPage';

const mocks = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  resetPasswordWithToken: vi.fn(),
}));

vi.mock('@/features/auth/api', () => ({
  requestPasswordReset: mocks.requestPasswordReset,
  resetPasswordWithToken: mocks.resetPasswordWithToken,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ForgotPasswordPage', () => {
  it('prefills the email from the query string', async () => {
    renderWithProviders(<ForgotPasswordPage />, { route: '/forgot-password?email=invitee%40test.com' });
    expect(await screen.findByLabelText(/email address/i)).toHaveValue('invitee@test.com');
  });

  it('rejects an invalid address without calling the API', async () => {
    renderWithProviders(<ForgotPasswordPage />, { route: '/forgot-password' });

    await userEvent.type(screen.getByLabelText(/email address/i), 'not-an-email');
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/email address you use to sign in/i);
    expect(mocks.requestPasswordReset).not.toHaveBeenCalled();
  });

  it('shows the same confirmation whether or not the account exists', async () => {
    mocks.requestPasswordReset.mockResolvedValue({ status: 'success' });
    renderWithProviders(<ForgotPasswordPage />, { route: '/forgot-password' });

    await userEvent.type(screen.getByLabelText(/email address/i), 'invitee@test.com');
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => expect(mocks.requestPasswordReset).toHaveBeenCalledWith('invitee@test.com'));
    expect(await screen.findByRole('heading', { name: /check your inbox/i })).toBeInTheDocument();
    expect(screen.getByText(/if an account exists/i)).toBeInTheDocument();
  });
});

describe('ResetPasswordPage', () => {
  const errorResponse = (status, message) => {
    const error = new Error(message);
    error.response = { status, data: { message } };
    return error;
  };

  it('explains an incomplete link when the token is missing', async () => {
    renderWithProviders(<ResetPasswordPage />, { route: '/reset-password' });
    expect(await screen.findByText(/this link is incomplete/i)).toBeInTheDocument();
    expect(mocks.resetPasswordWithToken).not.toHaveBeenCalled();
  });

  it('refuses mismatched passwords without calling the API', async () => {
    renderWithProviders(<ResetPasswordPage />, { route: '/reset-password?token=tok-1' });

    await userEvent.type(screen.getByLabelText(/new password/i), 'correct horse');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'different horse');
    await userEvent.click(screen.getByRole('button', { name: /save new password/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/do not match/i);
    expect(mocks.resetPasswordWithToken).not.toHaveBeenCalled();
  });

  it('saves the new password and points at sign-in', async () => {
    mocks.resetPasswordWithToken.mockResolvedValue({ status: 'success' });
    renderWithProviders(<ResetPasswordPage />, { route: '/reset-password?token=tok-1' });

    await userEvent.type(screen.getByLabelText(/new password/i), 'correct horse');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'correct horse');
    await userEvent.click(screen.getByRole('button', { name: /save new password/i }));

    await waitFor(() => expect(mocks.resetPasswordWithToken).toHaveBeenCalledWith('tok-1', 'correct horse'));
    expect(await screen.findByRole('heading', { name: /password updated/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to sign in/i })).toBeInTheDocument();
  });

  it('reports an expired token instead of leaving a dead form', async () => {
    mocks.resetPasswordWithToken.mockRejectedValue(errorResponse(400, 'Invalid or expired reset token'));
    renderWithProviders(<ResetPasswordPage />, { route: '/reset-password?token=stale' });

    await userEvent.type(screen.getByLabelText(/new password/i), 'correct horse');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'correct horse');
    await userEvent.click(screen.getByRole('button', { name: /save new password/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid or has expired/i);
  });
});
