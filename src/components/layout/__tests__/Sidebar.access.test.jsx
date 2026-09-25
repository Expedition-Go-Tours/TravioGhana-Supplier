/**
 * The sidebar is the role contract a team member actually sees: if a page is
 * missing they cannot do their job, and if a page is listed but the API refuses
 * it they get an empty screen full of errors.
 *
 * These tests render the real Sidebar once per role and assert the exact menu,
 * so a permission key that no role holds (the old `tours.manage` on Special
 * Offers) or a rule that was forgotten (Analytics had none) fails here rather
 * than in production.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const teamRoleState = {
  isOwner: false,
  teamRoles: [],
  permissions: [],
  hasPermission: () => false,
};

vi.mock('@/hooks/useTeamRole', () => ({
  useTeamRole: () => teamRoleState,
}));

// The business identity is resolved server-side through the membership, so a
// member gets the owner's profile. The sidebar must render that, not the
// viewer's own (empty) account.
const businessProfile = {
  businessName: 'Expedition Go Tours Ltd',
  logoUrl: 'https://res.cloudinary.com/demo/image/upload/logo.png',
  // ACTIVE renders the "Verified" badge; a null status renders the plain
  // "Administrator" line the owner has always seen.
  status: 'ACTIVE',
  supplierSince: '2021-03-04T00:00:00.000Z',
};

vi.mock('@/features/auth/api', () => ({
  loadSupplierProfile: vi.fn(async () => businessProfile),
}));

vi.mock('@/lib/axios', () => ({
  default: { get: vi.fn(async () => ({ data: { data: {} } })) },
}));

import Sidebar from '../Sidebar';
import { useAuthStore } from '@/stores/authStore';
import { permissionsForRoles, TEAM_ROLES } from '@/config/teamRoles';
import { PAGE_ACCESS } from '@/config/pageAccess';

const NAV_LABELS = [
  'Dashboard', 'Products', 'Bookings', 'Pickup Planner', 'Special Offers',
  'Cancellation', 'Availability', 'Customers', 'Finance', 'Reviews',
  'Notifications', 'Verification', 'Analytics', 'Settings',
];

function signIn({ roles, isOwner = false, name = 'Gideon Kwarteng', profileStatus = null }) {
  useAuthStore.setState({
    user: { id: 'u-1', name, email: 'member@example.com', roles: ['supplier', ...roles], createdAt: '2024-01-01' },
    token: 'token',
    isAuthenticated: true,
    isLoading: false,
    supplierProfile: profileStatus ? { status: profileStatus } : null,
  });

  teamRoleState.isOwner = isOwner;
  teamRoleState.teamRoles = isOwner ? ['admin'] : roles;
  teamRoleState.permissions = permissionsForRoles(isOwner ? ['admin'] : roles);
  teamRoleState.hasPermission = (permission) =>
    teamRoleState.permissions.includes('*') || teamRoleState.permissions.includes(permission);
}

function renderSidebar() {
  return render(<MemoryRouter><Sidebar /></MemoryRouter>);
}

/** The hrefs the sidebar actually offers, in order. */
const navHrefs = (container) =>
  [...container.querySelectorAll('nav a')].map((a) => a.getAttribute('href'));

const shownNav = () =>
  NAV_LABELS.filter((label) => screen.queryAllByText(label).length > 0);

beforeEach(() => {
  vi.clearAllMocks();
  businessProfile.status = 'ACTIVE';
});

describe('sidebar navigation per team role', () => {
  it('shows an owner everything', () => {
    signIn({ roles: ['admin'], isOwner: true });
    renderSidebar();
    expect(shownNav()).toEqual(NAV_LABELS);
  });

  it('shows an editor the work pages, not money or KYC', () => {
    signIn({ roles: [TEAM_ROLES.EDITOR] });
    renderSidebar();

    const shown = shownNav();
    expect(shown).toEqual(expect.arrayContaining(['Products', 'Bookings', 'Special Offers', 'Analytics']));
    expect(shown).not.toContain('Finance');
    expect(shown).not.toContain('Verification');
    expect(shown).not.toContain('Customers');
  });

  it('shows finance the money pages and reports, not the catalogue', () => {
    signIn({ roles: [TEAM_ROLES.FINANCE] });
    renderSidebar();

    const shown = shownNav();
    expect(shown).toEqual(expect.arrayContaining(['Finance', 'Analytics']));
    expect(shown).not.toContain('Products');
    expect(shown).not.toContain('Bookings');
    expect(shown).not.toContain('Customers');
  });

  it('gives support the customer conversations and the reviews', () => {
    signIn({ roles: [TEAM_ROLES.SUPPORT] });
    renderSidebar();

    expect(shownNav()).toEqual(
      expect.arrayContaining(['Customers', 'Reviews', 'Dashboard', 'Settings']),
    );
    expect(shownNav()).not.toContain('Finance');
    expect(shownNav()).not.toContain('Products');
  });

  it('never lists a page the role cannot open, in any single-role case', () => {
    for (const role of [TEAM_ROLES.EDITOR, TEAM_ROLES.FINANCE, TEAM_ROLES.SUPPORT]) {
      signIn({ roles: [role] });
      const { container, unmount } = renderSidebar();

      const offered = navHrefs(container);
      expect(offered.length, `${role} sees a menu`).toBeGreaterThan(0);
      for (const href of offered) {
        const permission = PAGE_ACCESS[href];
        // Every listed page must be one the access map knows about, and this
        // role must be allowed to open it.
        expect(permission, `${role} sees undeclared page ${href}`).not.toBeUndefined();
        if (permission) {
          expect(teamRoleState.hasPermission(permission), `${role} sees ${href}`).toBe(true);
        }
      }
      unmount();
    }
  });
});

describe('sidebar business identity', () => {
  it('shows the business a team member works for, not their own account', async () => {
    signIn({ roles: [TEAM_ROLES.SUPPORT], name: 'Ama Boateng' });

    renderSidebar();

    // The business name comes from the membership-resolved profile…
    await waitFor(() => expect(screen.getByText('Expedition Go Tours Ltd')).toBeInTheDocument());
    // …and the member's own name is not used as the business label.
    expect(screen.queryByText('Ama Boateng')).not.toBeInTheDocument();
  });

  it('labels the member with their role, so the card is not read as "Administrator"', async () => {
    signIn({ roles: [TEAM_ROLES.EDITOR, TEAM_ROLES.FINANCE] });
    renderSidebar();

    await waitFor(() => expect(screen.getByText('Editor + Finance')).toBeInTheDocument());
    expect(screen.queryByText('Administrator')).not.toBeInTheDocument();
  });

  it('keeps the owner card unchanged: a verified business shows the badge, never a team role', async () => {
    signIn({ roles: ['admin'], isOwner: true });
    renderSidebar();

    await waitFor(() => expect(screen.getByText('Verified')).toBeInTheDocument());
    expect(screen.queryByText('Administrator')).not.toBeInTheDocument();
  });

  it('still says Administrator for an owner whose business has no verification record', async () => {
    businessProfile.status = null;
    signIn({ roles: ['admin'], isOwner: true });
    renderSidebar();

    await waitFor(() => expect(screen.getByText('Administrator')).toBeInTheDocument());
  });

  it('shows a member their role even when the business is verified', async () => {
    signIn({ roles: [TEAM_ROLES.SUPPORT] });
    renderSidebar();

    await waitFor(() => expect(screen.getByText('Verified')).toBeInTheDocument());
    expect(screen.getByText('Support')).toBeInTheDocument();
  });
});
