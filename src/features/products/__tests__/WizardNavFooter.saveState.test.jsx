/**
 * The wizard footer is the only place the supplier learns whether their draft
 * is safe. "Draft saved" must mean a save happened: it used to also appear when
 * they merely moved to the next step, because `nextStep` stamped `lastSaved`.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup, waitFor } from '@testing-library/react';

vi.mock('../stepValidation', () => ({
  validateStep: () => ({}),
}));

import WizardNavFooter from '../WizardNavFooter';
import { useProductBuilderStore } from '../productBuilderStore';

const props = {
  currentStep: 1,
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
  useProductBuilderStore.setState({
    hasHydrated: true,
    currentStep: 0,
    completedStepIds: [],
    isDirty: false,
    lastSaved: null,
    autosaveError: null,
    stepErrors: {},
    draftStatus: null,
    submissionMeta: {},
    savedProductId: null,
  });
});

afterEach(() => {
  cleanup();
});

describe('the "Draft saved" indicator', () => {
  it('says nothing before any save has happened', async () => {
    render(<WizardNavFooter {...props} />);

    await waitFor(() => expect(screen.queryByText('Draft saved')).toBeNull());
  });

  it('appears after a real save', async () => {
    render(<WizardNavFooter {...props} />);

    act(() => {
      useProductBuilderStore.getState().markSaved();
    });

    await waitFor(() => {
      expect(screen.getByText('Draft saved')).toBeInTheDocument();
    });
  });

  it('does NOT appear when the supplier only changes step', async () => {
    render(<WizardNavFooter {...props} />);

    act(() => {
      useProductBuilderStore.getState().setField('shortDescription', 'A new summary');
    });
    act(() => {
      useProductBuilderStore.getState().nextStep();
    });

    await waitFor(() => expect(useProductBuilderStore.getState().currentStep).toBe(1));
    expect(screen.queryByText('Draft saved')).toBeNull();
    // And the draft is still flagged as unsaved work.
    expect(useProductBuilderStore.getState().isDirty).toBe(true);
  });

  it('shows the autosave error instead of a save claim', async () => {
    render(<WizardNavFooter {...props} />);

    act(() => {
      useProductBuilderStore.getState().setAutosaveError('Short summary is too long');
    });

    await waitFor(() => {
      expect(screen.getByText('Short summary is too long')).toBeInTheDocument();
    });
    expect(screen.queryByText('Draft saved')).toBeNull();
  });
});
