/**
 * The footer used to subscribe to the entire builder store, so every keystroke
 * re-rendered it — and, on the last step, re-ran `builderSignature` over the
 * whole product each time. Typing in a long description made the wizard janky.
 *
 * The footer now selects only the values it draws. This test pins that: edits
 * to the draft must not recompute the signature.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';

const { builderSignature } = vi.hoisted(() => ({
  builderSignature: vi.fn(() => 'live-signature'),
}));

vi.mock('../useAutoSave', () => ({
  builderSignature: (...args) => builderSignature(...args),
}));

vi.mock('../stepValidation', () => ({
  validateStep: () => ({}),
  isStepComplete: () => false,
}));

import WizardNavFooter from '../WizardNavFooter';
import { useProductBuilderStore } from '../productBuilderStore';

const props = {
  currentStep: 11,
  totalSteps: 11,
  onBack: () => {},
  onNext: () => {},
  onSave: () => {},
  onSubmitForReview: () => {},
  onOpenAgreement: () => {},
  isUpdate: false,
  saving: false,
  submitting: false,
  isEditing: false,
};

beforeEach(() => {
  builderSignature.mockClear();
  useProductBuilderStore.setState({
    hasHydrated: true,
    currentStep: 10,
    completedStepIds: [],
    isDirty: false,
    lastSaved: null,
    autosaveError: null,
    stepErrors: {},
    draftStatus: 'DRAFT',
    savedProductId: 'product-1',
    submissionMeta: { 'product-1': { signature: 'old-signature' } },
    shortDescription: '',
    fullDescription: '',
  });
});

afterEach(() => {
  cleanup();
});

describe('the footer does not recompute the submission signature per keystroke', () => {
  it('computes it once for the last step and leaves it alone while typing', () => {
    render(<WizardNavFooter {...props} />);
    expect(builderSignature).toHaveBeenCalledTimes(1);

    act(() => {
      const store = useProductBuilderStore.getState();
      for (let i = 1; i <= 5; i += 1) {
        store.setField('shortDescription', 'x'.repeat(i));
      }
    });

    expect(builderSignature).toHaveBeenCalledTimes(1);
  });
});
