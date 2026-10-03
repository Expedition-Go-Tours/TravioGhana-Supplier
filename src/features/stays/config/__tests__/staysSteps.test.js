import { describe, expect, it } from 'vitest';
import {
  STAYS_BUILDER_STEPS,
  STAYS_BUILDER_STEP_COUNT,
  STAYS_FIRST_BUILDER_INDEX,
  STAYS_SECTIONS,
  getStaysStepIndex,
} from '../staysSteps';

describe('staysSteps model', () => {
  it('keeps seventeen steps across the five working sections', () => {
    expect(STAYS_BUILDER_STEP_COUNT).toBe(17);
    expect(STAYS_SECTIONS.map((section) => section.label)).toEqual([
      'Basic Information',
      'Photos',
      'Property Setup',
      'Pricing and Calendar',
      'Review & Submit',
    ]);
  });

  it('starts with the four-card category chain and ends with Open for bookings', () => {
    expect(STAYS_BUILDER_STEPS[0]).toMatchObject({
      id: 1,
      label: 'Category & property type',
      stepId: 'category',
      sectionId: 'basic-information',
      preBuilder: true,
    });
    expect(STAYS_BUILDER_STEPS.at(-1)).toMatchObject({
      id: 17,
      label: 'Open for bookings',
      stepId: 'review',
      sectionId: 'review-submit',
    });
  });

  it('floors the draft builder at the first non-pre-builder step', () => {
    expect(STAYS_FIRST_BUILDER_INDEX).toBe(1);
    expect(STAYS_BUILDER_STEPS[STAYS_FIRST_BUILDER_INDEX]).toMatchObject({
      id: 2,
      label: 'Location',
      stepId: 'location',
      fullBleed: true,
    });
  });

  it('orders Basic Information as category · location · channel manager', () => {
    const basic = STAYS_BUILDER_STEPS.filter(
      (step) => step.sectionId === 'basic-information',
    ).map((step) => step.stepId);
    expect(basic).toEqual(['category', 'location', 'channel-manager']);
  });

  it('makes Photos step 4, Languages step 5 and House rules step 6', () => {
    const photos = STAYS_BUILDER_STEPS.find((step) => step.stepId === 'photos');
    const languages = STAYS_BUILDER_STEPS.find((step) => step.stepId === 'languages');
    const houseRules = STAYS_BUILDER_STEPS.find((step) => step.stepId === 'house-rules');
    const identity = STAYS_BUILDER_STEPS.find((step) => step.stepId === 'identity');
    expect(photos).toMatchObject({ id: 4, sectionId: 'photos' });
    expect(languages).toMatchObject({
      id: 5,
      sectionId: 'property-setup',
      hideHeader: true,
      hideFooter: true,
    });
    expect(houseRules).toMatchObject({
      id: 6,
      sectionId: 'property-setup',
      hideHeader: true,
      hideFooter: true,
    });
    expect(identity).toMatchObject({ id: 7, sectionId: 'property-setup' });
  });

  it('gives every step a unique id and URL slug', () => {
    const ids = STAYS_BUILDER_STEPS.map((step) => step.id);
    const slugs = STAYS_BUILDER_STEPS.map((step) => `${step.sectionId}/${step.stepId}`);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('maps every step to a declared section', () => {
    const sectionIds = new Set(STAYS_SECTIONS.map((section) => section.id));
    for (const step of STAYS_BUILDER_STEPS) {
      expect(sectionIds.has(step.sectionId), `${step.label} → ${step.sectionId}`).toBe(true);
    }
  });

  it('gives every step a hint and every section at least one step', () => {
    for (const step of STAYS_BUILDER_STEPS) {
      expect(step.hint, step.label).toBeTruthy();
    }
    for (const section of STAYS_SECTIONS) {
      expect(
        STAYS_BUILDER_STEPS.some((step) => step.sectionId === section.id),
        section.label,
      ).toBe(true);
    }
  });
});

describe('getStaysStepIndex', () => {
  it('resolves a section/step pair to its zero-based index', () => {
    expect(getStaysStepIndex('basic-information', 'category')).toBe(0);
    expect(getStaysStepIndex('basic-information', 'location')).toBe(1);
    expect(getStaysStepIndex('basic-information', 'channel-manager')).toBe(2);
    expect(getStaysStepIndex('photos', 'photos')).toBe(3);
    expect(getStaysStepIndex('property-setup', 'languages')).toBe(4);
    expect(getStaysStepIndex('property-setup', 'house-rules')).toBe(5);
    expect(getStaysStepIndex('property-setup', 'identity')).toBe(6);
    expect(getStaysStepIndex('property-setup', 'host-profile')).toBe(7);
    expect(getStaysStepIndex('property-setup', 'property-details')).toBe(8);
    expect(getStaysStepIndex('property-setup', 'amenities')).toBe(9);
    expect(getStaysStepIndex('property-setup', 'services')).toBe(10);
    expect(getStaysStepIndex('property-setup', 'booking-preference')).toBe(11);
    expect(getStaysStepIndex('property-setup', 'payments')).toBe(12);
    expect(getStaysStepIndex('pricing-calendar', 'price-per-night')).toBe(13);
    expect(getStaysStepIndex('pricing-calendar', 'rates')).toBe(14);
    expect(getStaysStepIndex('pricing-calendar', 'availability')).toBe(15);
    expect(getStaysStepIndex('review-submit', 'review')).toBe(16);
  });

  it('falls back to the first step for unknown or missing slugs', () => {
    expect(getStaysStepIndex('nope', 'nope')).toBe(0);
    expect(getStaysStepIndex(null, null)).toBe(0);
    expect(getStaysStepIndex('getting-started', '')).toBe(0);
  });
});
