/**
 * Route-level access guard.
 *
 * The sidebar hides what a role cannot use, but a bookmarked or hand-typed URL
 * can still reach those pages — and they used to render an empty shell whose
 * every request 403'd. The guard turns that into an explanation and a redirect,
 * and it must never flash that explanation while permissions are still loading.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// The toast is a portal rendered by a <Toaster/> the app shell owns; asserting
// the call is what actually matters here.
const { toastMock } = vi.hoisted(() => ({
  toastMock: { error: vi.fn(), success: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: toastMock }));

const teamRoleState = { loading: false, hasPermission: () => false };

vi.mock('@/hooks/useTeamRole', () => ({
  useTeamRole: () => teamRoleState,
}));

import RequirePageAccess from '../RequirePageAccess';

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<RequirePageAccess />}>
          <Route path="/" element={<p>dashboard</p>} />
          <Route path="/finance" element={<p>finance page</p>} />
          <Route path="/products" element={<p>products page</p>} />
          <Route path="/products/:id" element={<p>product detail</p>} />
        </Route>
        <Route path="*" element={<p>not found</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** A role that may open nothing unless the test says otherwise. */
const allow = (...permissions) => {
  teamRoleState.hasPermission = (permission) => permissions.includes(permission);
};

beforeEach(() => {
  teamRoleState.loading = false;
  allow();
  vi.clearAllMocks();
});

describe('RequirePageAccess', () => {
  it('renders a page the role may open', () => {
    allow('payouts.view');
    renderAt('/finance');
    expect(screen.getByText('finance page')).toBeInTheDocument();
  });

  it('sends a member away from a page they cannot open', () => {
    allow('tours.view');
    renderAt('/finance');
    expect(screen.queryByText('finance page')).not.toBeInTheDocument();
    expect(screen.getByText('dashboard')).toBeInTheDocument();
  });

  it('explains the refusal instead of leaving a blank screen', () => {
    allow('tours.view');
    renderAt('/finance');
    expect(toastMock.error).toHaveBeenCalledWith(
      expect.stringMatching(/don't have access/i),
      expect.objectContaining({ description: expect.any(String) }),
    );
  });

  it('explains once per page, not on every render', () => {
    allow('tours.view');
    const { rerender } = renderAt('/finance');
    rerender(
      <MemoryRouter initialEntries={['/finance']}>
        <Routes>
          <Route element={<RequirePageAccess />}>
            <Route path="/finance" element={<p>finance page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(toastMock.error).toHaveBeenCalledTimes(1);
  });

  it('applies the page rule to nested routes too', () => {
    allow('tours.view');
    renderAt('/products/p-123');
    expect(screen.getByText('product detail')).toBeInTheDocument();
  });

  it('renders nothing while the permissions are still loading', () => {
    // A hard refresh must not flash "no access" before `/my-role` answers.
    teamRoleState.loading = true;
    renderAt('/finance');
    expect(screen.queryByText('finance page')).not.toBeInTheDocument();
    expect(screen.queryByText('dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText(/don't have access/i)).not.toBeInTheDocument();
  });

  it('leaves the 404 route to the 404', () => {
    allow();
    renderAt('/nope');
    expect(screen.getByText('not found')).toBeInTheDocument();
  });

  it('does not loop when the dashboard itself is denied', () => {
    allow();
    renderAt('/');
    expect(screen.getByText('dashboard')).toBeInTheDocument();
  });
});
