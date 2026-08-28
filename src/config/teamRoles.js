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

export function hasTeamPermission(role, permission) {
  const permissions = TEAM_ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  if (permissions.includes('*')) return true;
  if (permissions.includes(permission)) return true;
  const prefix = permission.split('.')[0];
  return permissions.some((p) => p.endsWith('*') && p.startsWith(prefix));
}
