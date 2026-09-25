import { describe, expect, it } from 'vitest';
import {
  MAX_TEAM_ROLES,
  describeRoles,
  isRoleDisabled,
  permissionsForRoles,
  sortTeamRoles,
  toggleTeamRole,
} from '../teamRoles';

describe('toggleTeamRole', () => {
  it('adds a second role', () => {
    expect(toggleTeamRole(['editor'], 'finance')).toEqual(['editor', 'finance']);
  });

  it('removes a role that is already selected', () => {
    expect(toggleTeamRole(['editor', 'finance'], 'editor')).toEqual(['finance']);
  });

  it('stops at the cap of two roles', () => {
    expect(MAX_TEAM_ROLES).toBe(2);
    expect(toggleTeamRole(['editor', 'finance'], 'support')).toEqual(['editor', 'finance']);
  });

  it('keeps roles in canonical order regardless of click order', () => {
    expect(toggleTeamRole(['finance'], 'editor')).toEqual(['editor', 'finance']);
  });

  it('treats admin as all-inclusive: it replaces other roles', () => {
    expect(toggleTeamRole(['editor', 'finance'], 'admin')).toEqual(['admin']);
  });

  it('ignores other roles while admin is selected until admin is removed', () => {
    expect(toggleTeamRole(['admin'], 'finance')).toEqual(['finance']);
  });

  it('can deselect the last role (the caller blocks saving it)', () => {
    expect(toggleTeamRole(['support'], 'support')).toEqual([]);
  });

  it('ignores unknown roles', () => {
    expect(toggleTeamRole(['editor'], 'wizard')).toEqual(['editor']);
  });
});

describe('role helpers', () => {
  it('describes the selection the way the invite email does', () => {
    expect(describeRoles(['finance', 'editor'])).toBe('Editor + Finance');
    expect(describeRoles('admin')).toBe('Admin');
    expect(describeRoles([])).toBe('');
  });

  it('normalises legacy single-role payloads', () => {
    expect(sortTeamRoles('finance')).toEqual(['finance']);
    expect(sortTeamRoles(['support', 'editor', 'editor'])).toEqual(['editor', 'support']);
    expect(sortTeamRoles(undefined)).toEqual([]);
  });

  it('unions the permissions of two roles', () => {
    const permissions = permissionsForRoles(['editor', 'finance']);
    expect(permissions).toContain('tours.update');
    expect(permissions).toContain('payouts.view');
    expect(permissions).not.toContain('chat.respond');
  });

  it('treats admin as a wildcard', () => {
    expect(permissionsForRoles(['admin'])).toEqual(['*']);
  });

  it('disables the remaining roles once two are chosen', () => {
    expect(isRoleDisabled(['editor', 'finance'], 'support')).toBe(true);
    expect(isRoleDisabled(['editor'], 'finance')).toBe(false);
    // Admin is never a "third" role — it replaces the selection.
    expect(isRoleDisabled(['editor', 'finance'], 'admin')).toBe(false);
    expect(isRoleDisabled(['admin'], 'editor')).toBe(true);
  });
});
