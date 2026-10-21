/**
 * Who is allowed to say "saved".
 *
 * `nextStep` used to clear `isDirty` and stamp `lastSaved`, so stepping through
 * the wizard announced "Draft saved" for a save that never happened AND turned
 * off the unsaved-changes guard for edits that existed only in the browser tab.
 * Only a real save may clear the dirty flag.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { useProductBuilderStore } from '../productBuilderStore';

const store = () => useProductBuilderStore.getState();

beforeEach(() => {
  useProductBuilderStore.setState({
    hasHydrated: true,
    currentStep: 0,
    completedStepIds: [],
    isDirty: false,
    lastSaved: null,
    autosaveError: null,
  });
});

describe('the dirty flag', () => {
  it('is set by an edit', () => {
    store().setField('shortDescription', 'A new summary');

    expect(store().isDirty).toBe(true);
    expect(store().lastSaved).toBeNull();
  });

  it('is cleared only by an actual save', () => {
    store().setField('shortDescription', 'A new summary');
    store().markSaved();

    expect(store().isDirty).toBe(false);
    expect(store().lastSaved).toBeTruthy();
    expect(store().autosaveError).toBeNull();
  });

  it('stays dirty when the supplier moves to the next step', () => {
    store().setField('shortDescription', 'A new summary');
    const before = store().lastSaved;

    store().nextStep();

    // The regression: stepping is not saving.
    expect(store().isDirty).toBe(true);
    expect(store().lastSaved).toBe(before);
  });

  it('does not fabricate a save time when a clean draft moves on', () => {
    store().nextStep();

    // No save has ever happened for this draft, so there is no save time —
    // and certainly not one that claims "just now".
    expect(store().lastSaved).toBeNull();
    expect(store().isDirty).toBe(false);
  });

  it('keeps the dirty flag through backwards navigation too', () => {
    store().setField('shortDescription', 'A new summary');
    useProductBuilderStore.setState({ currentStep: 3 });

    store().prevStep();

    expect(store().isDirty).toBe(true);
    expect(store().lastSaved).toBeNull();
  });
});
