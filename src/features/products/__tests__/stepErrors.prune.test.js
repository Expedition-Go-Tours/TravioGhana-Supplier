/**
 * Step errors behave like GetYourGuide's: nothing is red until the supplier
 * tries to continue, and once a message is showing it disappears as soon as the
 * offending field is fixed — without waiting for the next click.
 *
 * The other half matters just as much: a step with no errors must never be
 * validated on an edit, or merely typing into a clean form would paint it red.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { act } from '@testing-library/react';

import { useProductBuilderStore } from '../productBuilderStore';

// Step 3 (1-based number 2) is the title step; `title` is required, so it is a
// cheap field to make pass and fail. The store keeps `currentStep` 0-based, so
// the title step lives at index 1.
const TITLE_STEP = 2;
const TITLE_STEP_INDEX = TITLE_STEP - 1;

function reset() {
  useProductBuilderStore.setState({
    hasHydrated: true,
    currentStep: TITLE_STEP_INDEX,
    title: '',
    referenceCode: '',
    shortDescription: '',
    stepErrors: {},
    completedStepIds: [],
    isDirty: false,
    autosaveError: null,
  });
}

beforeEach(reset);

describe('step errors are pruned by edits, not re-raised', () => {
  it('clears the message as soon as the field passes', () => {
    act(() => {
      useProductBuilderStore.getState().setStepErrors(TITLE_STEP, {
        title: ['Product title is required'],
      });
    });

    act(() => {
      useProductBuilderStore.getState().setField('title', 'Accra: Makola Market Walk');
    });

    expect(useProductBuilderStore.getState().stepErrors[TITLE_STEP]).toBeUndefined();
  });

  it('keeps the message while the field is still invalid', () => {
    act(() => {
      useProductBuilderStore.getState().setStepErrors(TITLE_STEP, {
        title: ['Product title is required'],
      });
    });

    act(() => {
      useProductBuilderStore.getState().setField('title', '');
    });

    expect(useProductBuilderStore.getState().stepErrors[TITLE_STEP]).toEqual({
      title: ['Product title is required'],
    });
  });

  it('never validates a step that is not already showing an error', () => {
    act(() => {
      useProductBuilderStore.getState().setField('title', '');
    });
    act(() => {
      useProductBuilderStore.getState().setField('referenceCode', 'TG-1');
    });

    expect(useProductBuilderStore.getState().stepErrors[TITLE_STEP]).toBeUndefined();
    expect(useProductBuilderStore.getState().stepErrors).toEqual({});
  });

  it('only re-checks the step on screen', () => {
    act(() => {
      useProductBuilderStore.getState().setStepErrors(5, {
        locations: ['Total stop time exceeds the product duration'],
      });
    });

    act(() => {
      useProductBuilderStore.getState().setField('title', 'A complete title');
    });

    // The error on another step is untouched by an edit made here.
    expect(useProductBuilderStore.getState().stepErrors[5]).toEqual({
      locations: ['Total stop time exceeds the product duration'],
    });
  });
});
