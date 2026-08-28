import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AuthCallback from '@/features/auth/pages/AuthCallback';
import { useAuthStore } from '@/stores/authStore';

const mockNavigate = vi.fn();
const mockFetchCurrentUser = vi.fn();
const mockLoadSupplierProfile = vi.fn().mockResolvedValue(null);

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/features/auth/api', () => ({
  fetchCurrentUser: (...args) => mockFetchCurrentUser(...args),
  loadSupplierProfile: (...args) => mockLoadSupplierProfile(...args),
  getLoginErrorMessage: (err) => err?.message || 'Login failed',
  showSupplierLoginToast: vi.fn(),
}));

vi.mock('@/features/auth/hooks/useSupplierLogin', () => ({
  getPostLoginPath: () => '/',
  getSafeReturnUrl: () => null,
}));

describe('AuthCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().setUnauthenticated();
    mockNavigate.mockClear();
    mockFetchCurrentUser.mockResolvedValue({
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      roles: ['supplier'],
    });
    mockLoadSupplierProfile.mockResolvedValue(null);
  });

  function renderWithToken(token, refreshToken) {
    const params = `accessToken=${token}${refreshToken ? `&refreshToken=${refreshToken}` : ''}`;
    return render(
      <MemoryRouter initialEntries={[`/auth/callback?${params}`]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('renders loading state when token is present', () => {
    renderWithToken('valid-token');
    expect(screen.getByText(/Verifying your session/i)).toBeInTheDocument();
  });

  it('shows error when no token is in URL', () => {
    render(
      <MemoryRouter initialEntries={['/auth/callback']}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Authentication failed/i)).toBeInTheDocument();
    expect(screen.getByText(/No authentication token found/i)).toBeInTheDocument();
  });

  it('redirects to dashboard after successful auth', async () => {
    renderWithToken('valid-token', 'valid-refresh');

    await waitFor(() => {
      expect(screen.getByText(/Authentication successful/i)).toBeInTheDocument();
    }, { timeout: 10000 });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    }, { timeout: 10000 });
  }, 15000);

  it('updates auth store with user data and supplier profile on success', async () => {
    const mockProfile = { id: 'sp1', status: 'ACTIVE' };
    mockLoadSupplierProfile.mockResolvedValue(mockProfile);
    renderWithToken('valid-token', 'valid-refresh');

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user).toBeTruthy();
      expect(useAuthStore.getState().supplierProfile).toEqual(mockProfile);
    }, { timeout: 10000 });
  }, 15000);

  it('shows error state when token verification fails', async () => {
    mockFetchCurrentUser.mockRejectedValue(new Error('Invalid token'));
    renderWithToken('invalid-token', 'invalid-refresh');

    await waitFor(() => {
      expect(screen.getByText(/Authentication failed/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
