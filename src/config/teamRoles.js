export const TEAM_ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  FINANCE: 'finance',
  SUPPORT: 'support',
};

export const TEAM_ROLE_LABELS = {
  [TEAM_ROLES.ADMIN]: 'Admin',
  [TEAM_ROLES.EDITOR]: 'Editor',
  [TEAM_ROLES.FINANCE]: 'Finance',
  [TEAM_ROLES.SUPPORT]: 'Support',
};

export const TEAM_ROLE_DESCRIPTIONS = {
  [TEAM_ROLES.ADMIN]: 'Full access to all supplier features',
  [TEAM_ROLES.EDITOR]: 'Manage tours, bookings, and products',
  [TEAM_ROLES.FINANCE]: 'View earnings and manage payouts',
  [TEAM_ROLES.SUPPORT]: 'Handle chat and reviews',
};

/** One-line summaries — shown in the picker and in the invite email. */
export const TEAM_ROLE_SUMMARIES = {
  [TEAM_ROLES.ADMIN]: 'Full access — team, tours, bookings, payouts and settings',
  [TEAM_ROLES.EDITOR]: 'Manage tours, bookings and products',
  [TEAM_ROLES.FINANCE]: 'See earnings, payouts and payout methods',
  [TEAM_ROLES.SUPPORT]: 'Handle customer chat and reviews',
};

export const TEAM_ROLE_PERMISSIONS = {
  [TEAM_ROLES.ADMIN]: ['*'],
  [TEAM_ROLES.EDITOR]: [
    'tours.view', 'tours.create', 'tours.update', 'tours.delete',
    'bookings.view', 'bookings.manage',
    'products.view', 'products.create', 'products.update', 'products.delete',
  ],
  [TEAM_ROLES.FINANCE]: [
    'earnings.view',
    'payouts.view', 'payouts.request',
    'payout-methods.view', 'payout-methods.manage',
  ],
  [TEAM_ROLES.SUPPORT]: [
    'chat.view', 'chat.respond',
    'reviews.view', 'reviews.respond',
  ],
};

export const TEAM_ROLE_COLORS = {
  [TEAM_ROLES.ADMIN]: 'bg-purple-100 text-purple-700',
  [TEAM_ROLES.EDITOR]: 'bg-blue-100 text-blue-700',
  [TEAM_ROLES.FINANCE]: 'bg-green-100 text-green-700',
  [TEAM_ROLES.SUPPORT]: 'bg-orange-100 text-orange-700',
};

/** A member can hold this many roles at once (mirrors MAX_TEAM_ROLES in the API). */
export const MAX_TEAM_ROLES = 2;

/** Canonical order: admin > editor > finance > support. */
export const TEAM_ROLE_ORDER = [TEAM_ROLES.ADMIN, TEAM_ROLES.EDITOR, TEAM_ROLES.FINANCE, TEAM_ROLES.SUPPORT];

export function toRoleArray(input) {
  const list = Array.isArray(input) ? input : [input];
  return list.filter((role) => typeof role === 'string' && TEAM_ROLE_ORDER.includes(role));
}

/** Sort + de-duplicate a selection into canonical order. */
export function sortTeamRoles(roles) {
  return TEAM_ROLE_ORDER.filter((role) => toRoleArray(roles).includes(role));
}

/**
 * Pure toggle used by the role picker.
 *
 * - Admin grants everything, so selecting it replaces any other role (and
 *   selecting another role drops Admin).
 * - Otherwise a member may hold up to MAX_TEAM_ROLES roles.
 * - Deselecting the last role is allowed here; callers prevent saving an empty
 *   selection.
 */
export function toggleTeamRole(current, role) {
  const selected = sortTeamRoles(current);
  if (!TEAM_ROLE_ORDER.includes(role)) return selected;

  if (role === TEAM_ROLES.ADMIN) {
    const adminOnly = selected.length === 1 && selected[0] === TEAM_ROLES.ADMIN;
    return adminOnly ? [] : [TEAM_ROLES.ADMIN];
  }

  const withoutAdmin = selected.filter((r) => r !== TEAM_ROLES.ADMIN);
  if (withoutAdmin.includes(role)) {
    return withoutAdmin.filter((r) => r !== role);
  }
  if (withoutAdmin.length >= MAX_TEAM_ROLES) {
    return withoutAdmin;
  }
  return sortTeamRoles([...withoutAdmin, role]);
}

/** Roles a picker should disable: everything once the cap is reached. */
export function isRoleDisabled(selected, role) {
  const list = sortTeamRoles(selected);
  if (list.includes(role)) return false;
  if (list.includes(TEAM_ROLES.ADMIN)) return true;
  if (role === TEAM_ROLES.ADMIN) return false;
  return list.length >= MAX_TEAM_ROLES;
}

/** "Editor + Finance" */
export function describeRoles(roles) {
  return sortTeamRoles(roles).map((role) => TEAM_ROLE_LABELS[role]).join(' + ');
}

/** Union of the permissions granted by the selected roles. */
export function permissionsForRoles(roles) {
  const list = toRoleArray(roles);
  if (list.includes(TEAM_ROLES.ADMIN)) return ['*'];
  const permissions = new Set();
  for (const role of list) {
    for (const permission of TEAM_ROLE_PERMISSIONS[role] || []) permissions.add(permission);
  }
  return Array.from(permissions);
}

export function hasTeamPermission(roleOrRoles, permission) {
  const permissions = permissionsForRoles(roleOrRoles);
  if (permissions.includes('*')) return true;
  if (permissions.includes(permission)) return true;
  const prefix = permission.split('.')[0];
  return permissions.some((p) => p.endsWith('*') && p.startsWith(prefix));
}
