/**
 * The app shell mounts a floating support bubble on every page, and that bubble
 * polls the chat unread count. Chat is `chat.view` — admin and support — so for
 * any other role the poll was asking the API for a thread it may not read, and
 * the answer arrived as a "You do not have permission for this action" toast on
 * every single page load. A role that cannot open the Customers page must not be
 * shown a chat widget either.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

const teamRoleState = {
  isOwner: false,
  teamRoles: [],
  permissions: [],
  hasPermission: () => false,
};

vi.mock('@/hooks/useTeamRole', () => ({
  useTeamRole: () => teamRoleState,
}));

vi.mock('../Sidebar', () => ({ default: () => null }));
vi.mock('../Header', () => ({ default: () => null }));
vi.mock('../PageContainer', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('@/stores/sidebarStore', () => ({
  useSidebarStore: () => ({ isCollapsed: false, isMobileOpen: false }),
}));
vi.mock('@/features/notifications/hooks/useRealtimeNotifications', () => ({
  useRealtimeNotifications: () => {},
}));

// The bubble stands in for a rendered chat surface: what matters is whether the
// shell mounts it at all for this role.
vi.mock('@/features/chat/components/SupportFloating', () => ({
  default: () => <div data-testid="support-floating" />,
}));

import AppShell from '../AppShell';
import { permissionsForRoles, TEAM_ROLES } from '@/config/teamRoles';
import { PAGE_ACCESS } from '@/config/pageAccess';

function signInAs(roles, { isOwner = false } = {}) {
  const effective = isOwner ? ['admin'] : roles;
  teamRoleState.isOwner = isOwner;
  teamRoleState.teamRoles = effective;
  teamRoleState.permissions = permissionsForRoles(effective);
  teamRoleState.hasPermission = (permission) =>
    teamRoleState.permissions.includes('*') || teamRoleState.permissions.includes(permission);
}

// AppShell reads useMatches (for the bleed route handles), which only exists
// on a data router — hence createMemoryRouter rather than MemoryRouter.
const renderShell = (path = '/products') => {
  const router = createMemoryRouter(
    [{ path: '/', element: <AppShell />, children: [{ path: '*', element: <div>page body</div> }] }],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('the support bubble follows chat access', () => {
  it('mounts it for a role that can read the inbox (support)', () => {
    signInAs([TEAM_ROLES.SUPPORT]);
    renderShell();

    expect(screen.getByTestId('support-floating')).toBeInTheDocument();
  });

  it('does not mount it for a role that cannot (editor)', () => {
    signInAs([TEAM_ROLES.EDITOR]);
    renderShell();

    expect(screen.queryByTestId('support-floating')).not.toBeInTheDocument();
  });

  it('does not mount it for finance', () => {
    signInAs([TEAM_ROLES.FINANCE]);
    renderShell();

    expect(screen.queryByTestId('support-floating')).not.toBeInTheDocument();
  });

  it('mounts it for the owner, who is the supplier', () => {
    signInAs(['admin'], { isOwner: true });
    renderShell();

    expect(screen.getByTestId('support-floating')).toBeInTheDocument();
  });

  it('follows the same key the Customers page is gated on', () => {
    // If the page gate ever changes, this fails rather than silently drifting
    // into a different rule for the bubble.
    expect(PAGE_ACCESS['/chat']).toBe('chat.view');
  });
});
