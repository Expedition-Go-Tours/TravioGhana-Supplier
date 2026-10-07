import { describe, expect, it } from 'vitest';
import {
  WORKSPACES,
  defaultWorkspaceForProfile,
  extractSupplierServices,
  hasAccommodationService,
  isAccommodationService,
  workspaceForPath,
} from '../staysWorkspace';

describe('isAccommodationService', () => {
  it('matches the storefront label and the legacy id shapes', () => {
    expect(isAccommodationService('Accommodation')).toBe(true);
    expect(isAccommodationService('accommodation_provider')).toBe(true);
    expect(isAccommodationService('Stays')).toBe(true);
    expect(isAccommodationService('Hotels & Lodging')).toBe(true);
    expect(isAccommodationService('Guesthouse')).toBe(true);
  });

  it('does not match tour/transport services', () => {
    expect(isAccommodationService('Tours & Activities')).toBe(false);
    expect(isAccommodationService('Airport Transfers')).toBe(false);
    expect(isAccommodationService('Private Transport')).toBe(false);
    expect(isAccommodationService('Other Experience')).toBe(false);
  });
});

describe('hasAccommodationService', () => {
  it('is true when any service means accommodation', () => {
    expect(hasAccommodationService(['Tours & Activities', 'Accommodation'])).toBe(true);
  });

  it('is false for empty or unknown lists — a workspace is never force-opened', () => {
    expect(hasAccommodationService([])).toBe(false);
    expect(hasAccommodationService(undefined)).toBe(false);
    expect(hasAccommodationService(['Tours & Activities'])).toBe(false);
  });
});

describe('extractSupplierServices', () => {
  it('reads operatingInfo.services from an object businessInfo', () => {
    expect(
      extractSupplierServices({ businessInfo: { operatingInfo: { services: ['Accommodation'] } } }),
    ).toEqual(['Accommodation']);
  });

  it('parses a JSON-string businessInfo', () => {
    expect(
      extractSupplierServices({
        businessInfo: JSON.stringify({ operatingInfo: { services: ['stays'] } }),
      }),
    ).toEqual(['stays']);
  });

  it('accepts a comma-separated string and tolerates broken JSON', () => {
    expect(extractSupplierServices({ services: 'Accommodation, Tours & Activities' }))
      .toEqual(['Accommodation', 'Tours & Activities']);
    expect(extractSupplierServices({ businessInfo: '{not json' })).toEqual([]);
  });
});

describe('defaultWorkspaceForProfile', () => {
  it('sends accommodation suppliers to Stays', () => {
    const profile = { businessInfo: { operatingInfo: { services: ['Accommodation'] } } };
    expect(defaultWorkspaceForProfile(profile)).toBe(WORKSPACES.STAYS);
  });

  it('keeps everyone else — including unknown profiles — on Experiences', () => {
    expect(defaultWorkspaceForProfile(undefined)).toBe(WORKSPACES.EXPERIENCES);
    expect(
      defaultWorkspaceForProfile({ businessInfo: { operatingInfo: { services: ['Tours & Activities'] } } }),
    ).toBe(WORKSPACES.EXPERIENCES);
  });
});

describe('workspaceForPath', () => {
  it('claims /stays and its children', () => {
    expect(workspaceForPath('/stays')).toBe(WORKSPACES.STAYS);
    expect(workspaceForPath('/stays/properties')).toBe(WORKSPACES.STAYS);
  });

  it('claims the Stays account pages too — nothing is shared any more', () => {
    expect(workspaceForPath('/stays/notifications')).toBe(WORKSPACES.STAYS);
    expect(workspaceForPath('/stays/verification')).toBe(WORKSPACES.STAYS);
    expect(workspaceForPath('/stays/settings')).toBe(WORKSPACES.STAYS);
  });

  it('leaves Experiences routes unclaimed', () => {
    expect(workspaceForPath('/')).toBe(null);
    expect(workspaceForPath('/products')).toBe(null);
    expect(workspaceForPath('/finance')).toBe(null);
    expect(workspaceForPath('/settings')).toBe(null);
  });
});
