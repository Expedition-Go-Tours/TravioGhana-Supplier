import { describe, it, expect, vi, beforeEach } from 'vitest';

const getMock = vi.fn();

vi.mock('@/lib/axios', () => ({
  default: { get: (...args) => getMock(...args) },
}));

vi.mock('@/stores/authStore', () => ({
  getAuthToken: () => 'test-token',
  canAccessSupplierDashboard: () => true,
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { loadSupplierProfile } from '../api';

/**
 * The sidebar card describes the BUSINESS. `/suppliers/application/status`
 * resolves the owner through the membership and returns the owner's identity
 * at the top level next to `supplierProfile` — a team member's own account has
 * no logo or join date of its own.
 *
 * Dropping those top-level fields is what made every team member see an
 * initial instead of the company logo.
 */
describe('loadSupplierProfile — business identity for every viewer', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('keeps the owner logo, business name and join date for a team member', async () => {
    getMock.mockResolvedValue({
      data: {
        data: {
          supplierProfile: {
            id: 'sp-1',
            status: 'ACTIVE',
            businessInfo: { businessName: 'Expedition-Go Tours' },
          },
          verificationRequirements: { required: [] },
          logoUrl: 'https://res.cloudinary.com/demo/logo.png',
          businessName: 'Expedition-Go Tours LTD',
          supplierSince: '2026-01-04T00:00:00.000Z',
        },
      },
    });

    const profile = await loadSupplierProfile('token');

    expect(profile.logoUrl).toBe('https://res.cloudinary.com/demo/logo.png');
    expect(profile.businessName).toBe('Expedition-Go Tours LTD');
    expect(profile.supplierSince).toBe('2026-01-04T00:00:00.000Z');
    // The profile itself is still intact.
    expect(profile.id).toBe('sp-1');
    expect(profile.status).toBe('ACTIVE');
  });

  it('prefers the owner identity when both are present', async () => {
    getMock.mockResolvedValue({
      data: {
        data: {
          supplierProfile: {
            id: 'sp-1',
            logoUrl: 'https://res.cloudinary.com/demo/profile.png',
            businessName: 'Profile name',
            supplierSince: '2025-06-01T00:00:00.000Z',
          },
          logoUrl: 'https://res.cloudinary.com/demo/owner.png',
        },
      },
    });

    const profile = await loadSupplierProfile('token');

    expect(profile.logoUrl).toBe('https://res.cloudinary.com/demo/owner.png');
  });

  it('returns the payload unchanged when there is no profile', async () => {
    getMock.mockResolvedValue({
      data: { data: { supplierProfile: null, logoUrl: null } },
    });

    const profile = await loadSupplierProfile('token');
    expect(profile).toEqual({ supplierProfile: null, logoUrl: null });
  });

  it('returns null when the request fails', async () => {
    getMock.mockRejectedValue(new Error('network'));
    await expect(loadSupplierProfile('token')).resolves.toBeNull();
  });
});
