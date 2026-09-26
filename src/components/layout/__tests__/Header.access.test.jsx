/**
 * The topbar says who you are. It used to read the role off the viewer's OWN
 * account (`user.roles[0]`), which is `['customer']` for every team member and
 * `['supplier']` for the owner — so a finance member saw themselves labelled
 * "Customer" and the owner saw "supplier".
 *
 * The role a person holds in the business comes through their membership, the
 * same source the sidebar card and the page guards use.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const teamRoleState = { isOwner: false, teamRoles: [], permissions: [] };
const useTeamRole = vi.fn(() => teamRoleState);

vi.mock('@/hooks/useTeamRole', () => ({ useTeamRole: () => useTeamRole() }));

// Modelled on the real accounts: a team member's own account carries
// `['customer']` and the owner's carries `['supplier']` — which is exactly why
// the label cannot be read from here.
const authUser = { name: 'Portal Probe', avatar: '', photoURL: '', roles: ['customer'] };
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (select) => select({ user: authUser, isAuthenticated: true }),
  getState: () => ({ logout: vi.fn() }),
}));

// The topbar's neighbours reach for the API and a keyboard shortcut; this test is
// about the identity line.
vi.mock('@/features/notifications/components/NotificationBell', () => ({ default: () => null }));
vi.mock('@/components/layout/SearchDropdown', () => ({ default: () => null }));

import Header from '../Header';

beforeEach(() => {
  vi.clearAllMocks();
  authUser.roles = ['customer'];
});

const asMemberOf = (roles) => {
  authUser.roles = ['customer'];
  useTeamRole.mockReturnValue({ isOwner: false, teamRoles: roles, permissions: [] });
};

const renderHeader = () =>
  render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );

describe('the topbar role label', () => {
  it.each([
    [['finance'], 'Finance'],
    [['editor'], 'Editor'],
    [['support'], 'Support'],
    [['support', 'editor'], 'Editor + Support'], // in the team's own role order
  ])('names the team role a %s member holds', (roles, expected) => {
    asMemberOf(roles);

    renderHeader();

    // Twice in the DOM: the trigger and the dropdown's own identity block.
    expect(screen.getAllByText(expected).length).toBeGreaterThan(0);
  });

  it('never calls a member a Customer', () => {
    asMemberOf(['finance']);

    renderHeader();

    expect(screen.queryByText('Customer')).not.toBeInTheDocument();
    expect(screen.queryByText('customer')).not.toBeInTheDocument();
  });

  it('calls the owner an Administrator, not "supplier"', () => {
    authUser.roles = ['supplier'];
    useTeamRole.mockReturnValue({ isOwner: true, teamRoles: [], permissions: [] });

    renderHeader();

    expect(screen.getAllByText('Administrator').length).toBeGreaterThan(0);
    expect(screen.queryByText('supplier')).not.toBeInTheDocument();
  });

  it('falls back to a plain "Team member" while the membership is still loading', () => {
    authUser.roles = ['customer'];
    useTeamRole.mockReturnValue({ isOwner: false, teamRoles: [], permissions: [], loading: true });

    renderHeader();

    expect(screen.getAllByText('Team member').length).toBeGreaterThan(0);
    expect(screen.queryByText('Customer')).not.toBeInTheDocument();
  });
});
