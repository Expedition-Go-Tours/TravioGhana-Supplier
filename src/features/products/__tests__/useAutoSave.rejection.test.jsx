/**
 * Autosave must never claim a draft is saved when the server rejected it.
 *
 * A 4xx used to be handled with `markSaved()`, which cleared `isDirty`. The
 * builder then showed "Saved" while the supplier's latest edits existed only
 * in their browser tab — navigating away or refreshing dropped them silently.
 * A rejected draft stays dirty, and the reason is surfaced.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const createProduct = vi.fn();
const updateProduct = vi.fn();

vi.mock('../api', () => ({
  createProduct: (...args) => createProduct(...args),
  updateProduct: (...args) => updateProduct(...args),
}));

import { useAutoSave } from '../useAutoSave';
import { useProductBuilderStore } from '../productBuilderStore';

function markDirty() {
  // A real edit: `setField` marks the draft dirty and clears the autosave
  // error, exactly like typing into a form field does.
  act(() => {
    useProductBuilderStore.getState().setField('shortDescription', 'A brand new summary');
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  createProduct.mockReset();
  updateProduct.mockReset();
  useProductBuilderStore.setState({
    hasHydrated: true,
    isDirty: false,
    isSaving: false,
    isSubmitting: false,
    autosaveError: null,
    draftStatus: 'DRAFT',
    savedProductId: null,
    stepErrors: {},
    currentStep: 0,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

async function flushAutosave() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3100);
  });
}

describe('autosave on a rejected draft', () => {
  it('keeps the draft dirty when the server answers 400', async () => {
    createProduct.mockRejectedValue({
      response: { status: 400, data: { message: 'Short summary is too long' } },
    });

    renderHook(() => useAutoSave());
    markDirty();
    await flushAutosave();

    expect(createProduct).toHaveBeenCalledTimes(1);
    expect(useProductBuilderStore.getState().autosaveError).toBe('Short summary is too long');
    // The core regression: not "saved".
    expect(useProductBuilderStore.getState().isDirty).toBe(true);
    expect(useProductBuilderStore.getState().isSaving).toBe(false);
  });

  it('clears the dirty flag only after a successful save', async () => {
    createProduct.mockResolvedValue({ data: { data: { tour: { id: 'tour-1' } } } });

    renderHook(() => useAutoSave());
    markDirty();
    await flushAutosave();

    expect(useProductBuilderStore.getState().savedProductId).toBe('tour-1');
    expect(useProductBuilderStore.getState().isDirty).toBe(false);
    expect(useProductBuilderStore.getState().autosaveError).toBeNull();
  });

  it('keeps the draft dirty when the save fails outright', async () => {
    createProduct.mockRejectedValue(new Error('Network down'));

    renderHook(() => useAutoSave());
    markDirty();
    await flushAutosave();

    expect(useProductBuilderStore.getState().autosaveError).toBe('Network down');
    expect(useProductBuilderStore.getState().isDirty).toBe(true);
  });
});
