/**
 * "Live Site" — the sidebar's door to the public storefronts.
 *
 * One destination renders as a plain link, two render as a menu. The list comes
 * from the BUSINESS's storefronts (`/my-role` → `storefronts`), never the
 * viewer's own roles: a team member's account is a plain `customer` account, so
 * keying this off `user.roles` would hide Expedition from every member of an
 * Expedition seller — which is exactly the bug the API field exists to avoid.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const teamRoleState = {
  isOwner: false,
  teamRoles: [],
  permissions: [],
  storefronts: [],
  hasPermission: () => true,
};

vi.mock('@/hooks/useTeamRole', () => ({
  useTeamRole: () => teamRoleState,
}));

vi.mock('@/features/auth/api', () => ({
  loadSupplierProfile: vi.fn(async () => ({
    businessName: 'Expedition Go Tours Ltd',
    status: 'ACTIVE',
  })),
}));

vi.mock('@/lib/axios', () => ({
  default: { get: vi.fn(async () => ({ data: { data: {} } })) },
}));

import Sidebar from '../Sidebar';
import { useAuthStore } from '@/stores/authStore';
import { useSidebarStore } from '@/stores/sidebarStore';

let openSpy;

const renderSidebar = () =>
  render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

  useSidebarStore.setState({ isCollapsed: false, isMobileOpen: false });
  teamRoleState.storefronts = [];
  teamRoleState.hasPermission = () => true;

  // The owner IS the supplier, so their own account legitimately carries both
  // brand roles — but the control must not read them, and this proves it does
  // not: the menu below is driven purely by `storefronts`.
  useAuthStore.setState({
    user: {
      id: 'u-1',
      name: 'Gideon Kwarteng',
      email: 'owner@example.com',
      roles: ['supplier'],
      createdAt: '2024-01-01',
    },
    token: 'token',
    isAuthenticated: true,
    isLoading: false,
    supplierProfile: { status: 'ACTIVE' },
  });
});

describe('sidebar — Live Site', () => {
  it('falls back to a plain Travio Ghana link when the API has not answered', async () => {
    teamRoleState.storefronts = [];
    renderSidebar();

    const link = await screen.findByRole('link', { name: 'Live Site' });

    expect(link).toHaveAttribute('href', 'https://travioghana.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    // Never a menu with one row in it — that reads as a broken control.
    expect(screen.queryByRole('button', { name: 'Live Site' })).toBeNull();
  });

  it('offers ExpeditionGo alone as a plain link when that is the only storefront', async () => {
    teamRoleState.storefronts = ['EXPEDITION'];
    renderSidebar();

    const link = await screen.findByRole('link', { name: 'Live Site' });

    expect(link).toHaveAttribute('href', 'https://expeditiongotours.com');
  });

  it('turns into a menu with Travio Ghana first when the business sells on both', async () => {
    teamRoleState.storefronts = ['GHANA', 'EXPEDITION'];
    renderSidebar();

    const trigger = await screen.findByRole('button', { name: 'Live Site' });
    expect(screen.queryByRole('link', { name: 'Live Site' })).toBeNull();

    await userEvent.setup().click(trigger);

    const items = await screen.findAllByRole('menuitem');
    expect(items).toHaveLength(2);
    // Read the label spans directly: a whole-row toHaveTextContent check would
    // pass on the trailing domain ("travioghana.com") even if the label itself
    // were wrong.
    const labels = items.map((el) => el.querySelector('.text-sm')?.textContent);
    expect(labels).toEqual(['TravioGhana', 'ExpeditionGo']);

    // Each row wears its own store's icon, bundled rather than hotlinked so a
    // slow or dead storefront cannot leave a broken image beside the label.
    expect(items[0].querySelector('img')).toHaveAttribute('src', '/icons/v2/favicon-32x32.png');
    expect(items[1].querySelector('img')).toHaveAttribute('src', '/icons/store/expedition-32x32.png');
  });

  it('opens the chosen store in a new tab rather than leaving the dashboard', async () => {
    teamRoleState.storefronts = ['GHANA', 'EXPEDITION'];
    renderSidebar();

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Live Site' }));
    const items = await screen.findAllByRole('menuitem');
    await userEvent.setup().click(items[1]);

    expect(openSpy).toHaveBeenCalledWith(
      'https://expeditiongotours.com',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('disappears when the sidebar is collapsed, leaving the way back intact', () => {
    act(() => useSidebarStore.setState({ isCollapsed: true }));
    teamRoleState.storefronts = ['GHANA', 'EXPEDITION'];
    renderSidebar();

    expect(screen.queryByRole('link', { name: /live site/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /live site/i })).toBeNull();
    // The 64px rail has no room for two buttons, but you must still be able to
    // get out of it.
    expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument();
  });
});
