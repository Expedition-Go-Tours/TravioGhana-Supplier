/**
 * The page-access map is the contract between the navigation and the API.
 *
 * Every test here exists because a rule got out of sync with the permission
 * model: the sidebar asked for `tours.manage`, which NO role grants, so Special
 * Offers vanished for the editors who were allowed to use it — and Analytics
 * had no rule at all, so every role saw a page whose requests 403'd. These
 * tests fail loudly the next time a key is invented or a role drifts.
 */
import { describe, expect, it } from 'vitest';
import {
  PAGE_ACCESS,
  SETTINGS_TAB_ACCESS,
  canOpenPath,
  canOpenSettingsTab,
  pageAccessFor,
} from '../pageAccess';
import {
  ADMIN_ONLY_PERMISSIONS,
  TEAM_ROLE_PERMISSIONS,
  TEAM_ROLES,
  permissionsForRoles,
} from '../teamRoles';

/** The same check the API-side `hasPermission` performs. */
const has = (roles, permission) =>
  permissionsForRoles(roles).includes('*') ||
  permissionsForRoles(roles).includes(permission);

const allRoles = Object.values(TEAM_ROLES);
/**
 * Every key the dashboards may ask for: what some role grants, plus the keys
 * that are deliberately owner-only (reached through admin's `*`).
 */
const grantedKeys = new Set([
  ...allRoles.flatMap((role) => TEAM_ROLE_PERMISSIONS[role]).filter((key) => key !== '*'),
  ...ADMIN_ONLY_PERMISSIONS,
]);

describe('PAGE_ACCESS integrity', () => {
  it('never invents a permission no role grants', () => {
    // The `tours.manage` bug: a key that looks plausible but is in no role.
    for (const [path, permission] of Object.entries(PAGE_ACCESS)) {
      if (!permission) continue;
      expect(grantedKeys, `${path} requires "${permission}"`).toContain(permission);
    }
  });

  it('never invents a permission for a settings tab either', () => {
    for (const [tab, permission] of Object.entries(SETTINGS_TAB_ACCESS)) {
      if (!permission) continue;
      expect(grantedKeys, `tab "${tab}" requires "${permission}"`).toContain(permission);
    }
  });

  it('keeps every settings tab that the page renders addressable', () => {
    // profile, notifications, payouts, security, tax, team — the SettingsPage
    // tab list. A tab without a rule would be invisible to everyone.
    for (const tab of ['profile', 'notifications', 'payouts', 'security', 'tax', 'team']) {
      expect(SETTINGS_TAB_ACCESS).toHaveProperty(tab);
    }
  });
});

describe('role → page matrix', () => {
  const visiblePages = (roles) =>
    Object.keys(PAGE_ACCESS).filter((path) => canOpenPath((p) => has(roles, p), path));

  it('lets the owner and an admin member reach every page', () => {
    const all = Object.keys(PAGE_ACCESS);
    expect(visiblePages(['admin'])).toEqual(all);
  });

  it('gives an editor the catalogue, the bookings and the reports — but no money or KYC', () => {
    const pages = visiblePages([TEAM_ROLES.EDITOR]);
    expect(pages).toEqual(
      expect.arrayContaining([
        '/', '/products', '/bookings', '/pickup-planner', '/availability',
        '/special-offers', '/cancellation-rate', '/analytics', '/notifications', '/settings',
      ]),
    );
    expect(pages).not.toContain('/finance');
    expect(pages).not.toContain('/chat');
    expect(pages).not.toContain('/verification');
  });

  it('gives finance the money pages and the reports — but no catalogue', () => {
    const pages = visiblePages([TEAM_ROLES.FINANCE]);
    expect(pages).toEqual(expect.arrayContaining(['/', '/finance', '/analytics', '/settings']));
    expect(pages).not.toContain('/products');
    expect(pages).not.toContain('/bookings');
    expect(pages).not.toContain('/chat');
  });

  it('gives support the conversations and the reviews — and nothing that 403s', () => {
    const pages = visiblePages([TEAM_ROLES.SUPPORT]);
    expect(pages).toEqual(
      expect.arrayContaining(['/', '/chat', '/reviews', '/cancellation-rate', '/notifications', '/settings']),
    );
    expect(pages).not.toContain('/products');
    expect(pages).not.toContain('/finance');
    expect(pages).not.toContain('/verification');
  });

  it('unions the pages of a two-role member (Editor + Finance)', () => {
    const pages = visiblePages([TEAM_ROLES.EDITOR, TEAM_ROLES.FINANCE]);
    expect(pages).toEqual(expect.arrayContaining(['/products', '/bookings', '/finance', '/analytics']));
    // Still no chat and no KYC: neither role grants them.
    expect(pages).not.toContain('/chat');
    expect(pages).not.toContain('/verification');
  });

  it('keeps the customer-support page reachable by the role that answers customers', () => {
    // Regression: the sidebar once gated Customers behind a key support lacked.
    expect(grantedKeys.has(PAGE_ACCESS['/chat'])).toBe(true);
    expect(has([TEAM_ROLES.SUPPORT], PAGE_ACCESS['/chat'])).toBe(true);
  });
});

describe('pageAccessFor', () => {
  it('matches nested routes to the longest declared prefix', () => {
    expect(pageAccessFor('/products/p-123').permission).toBe(PAGE_ACCESS['/products']);
    expect(pageAccessFor('/special-offers/build/new').permission).toBe(PAGE_ACCESS['/special-offers']);
  });

  it('ignores a trailing slash, a query string and a hash', () => {
    expect(pageAccessFor('/finance/').permission).toBe(PAGE_ACCESS['/finance']);
    expect(pageAccessFor('/finance?tab=payouts').permission).toBe(PAGE_ACCESS['/finance']);
    expect(pageAccessFor('/bookings#today').permission).toBe(PAGE_ACCESS['/bookings']);
  });

  it('does not confuse a page with another page that prefixes its name', () => {
    // `/settings...` must not swallow a hypothetical `/settings-archive`, and
    // `/products` must not match `/productsX`.
    expect(pageAccessFor('/products-archive').permission).toBeUndefined();
  });

  it('reports an unknown path as undefined so the 404 owns it', () => {
    expect(pageAccessFor('/definitely-not-a-page').permission).toBeUndefined();
    expect(canOpenPath(() => false, '/definitely-not-a-page')).toBe(true);
  });

  it('treats the dashboard as open to every role', () => {
    expect(pageAccessFor('/').permission).toBeNull();
    expect(canOpenPath(() => false, '/')).toBe(true);
  });
});

describe('canOpenSettingsTab', () => {
  it('shows Security to everyone — it is their own password', () => {
    for (const role of allRoles) {
      expect(canOpenSettingsTab((p) => has([role], p), 'security')).toBe(true);
    }
  });

  it('hides the team tab from anyone but an admin member', () => {
    expect(canOpenSettingsTab((p) => has([TEAM_ROLES.EDITOR], p), 'team')).toBe(false);
    expect(canOpenSettingsTab((p) => has([TEAM_ROLES.FINANCE], p), 'team')).toBe(false);
    expect(canOpenSettingsTab((p) => has([TEAM_ROLES.SUPPORT], p), 'team')).toBe(false);
    expect(canOpenSettingsTab((p) => has([TEAM_ROLES.ADMIN], p), 'team')).toBe(true);
  });

  it('splits the business profile (admin+editor) from tax info (admin+finance)', () => {
    expect(canOpenSettingsTab((p) => has([TEAM_ROLES.EDITOR], p), 'profile')).toBe(true);
    expect(canOpenSettingsTab((p) => has([TEAM_ROLES.EDITOR], p), 'tax')).toBe(false);
    expect(canOpenSettingsTab((p) => has([TEAM_ROLES.FINANCE], p), 'tax')).toBe(true);
    expect(canOpenSettingsTab((p) => has([TEAM_ROLES.FINANCE], p), 'profile')).toBe(false);
  });

  it('gives a support member a settings page with at least one tab', () => {
    const tabs = Object.keys(SETTINGS_TAB_ACCESS)
      .filter((tab) => canOpenSettingsTab((p) => has([TEAM_ROLES.SUPPORT], p), tab));
    expect(tabs).toEqual(['security']);
  });
});
