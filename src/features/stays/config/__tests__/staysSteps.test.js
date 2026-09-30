import { describe, expect, it } from 'vitest';
import {
  STAYS_BUILDER_STEPS,
  STAYS_BUILDER_STEP_COUNT,
  STAYS_SECTIONS,
  getStaysStepIndex,
} from '../staysSteps';

describe('staysSteps model', () => {
  it('keeps ten steps, starting with the property name', () => {
    expect(STAYS_BUILDER_STEP_COUNT).toBe(10);
    expect(STAYS_BUILDER_STEPS[0]).toMatchObject({
      id: 1,
      label: 'Property name',
      stepId: 'name',
      sectionId: 'getting-started',
    });
    expect(STAYS_BUILDER_STEPS.at(-1)).toMatchObject({ id: 10, stepId: 'review' });
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
    expect(getStaysStepIndex('getting-started', 'name')).toBe(0);
    expect(getStaysStepIndex('rates-availability', 'availability')).toBe(6);
    expect(getStaysStepIndex('review-submit', 'review')).toBe(9);
  });

  it('falls back to the first step for unknown or missing slugs', () => {
    expect(getStaysStepIndex('nope', 'nope')).toBe(0);
    expect(getStaysStepIndex(null, null)).toBe(0);
    expect(getStaysStepIndex('getting-started', '')).toBe(0);
  });
});
