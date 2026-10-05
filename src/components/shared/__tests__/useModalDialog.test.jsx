import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * These lock in the four things the payout dialog got wrong. It was a
 * `fixed inset-0` overlay with no key handling at all, so:
 *   - Escape did nothing (measured in a real browser: overlay still present
 *     after 30s of retries),
 *   - the panel had no role, so nothing announced it as a dialog,
 *   - focus stayed on the trigger *behind* the overlay and Tab walked out to
 *     the sidebar, i.e. the page behind was still keyboard-operable,
 *   - the X was an icon-only button with no accessible name.
 */
import { useModalDialog } from '../useModalDialog';

function Dialog({ enabled = true, label = 'Confirm thing' }) {
  const [open, setOpen] = useState(false);
  const { panelRef, closeRef } = useModalDialog({ open, onClose: () => setOpen(false), enabled });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open it
      </button>
      <button type="button">Behind the dialog</button>
      {open && (
        <div>
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            className="panel"
          >
            <button ref={closeRef} type="button" aria-label="Close">
              x
            </button>
            <input aria-label="A field" />
            <button type="button">Submit</button>
          </div>
        </div>
      )}
    </>
  );
}

describe('useModalDialog', () => {
  it('closes on Escape', async () => {
    render(<Dialog />);
    await userEvent.click(screen.getByRole('button', { name: /open it/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('refuses Escape while the dialog is locked, e.g. mid-save', async () => {
    render(<Dialog enabled={false} />);
    await userEvent.click(screen.getByRole('button', { name: /open it/i }));

    await userEvent.keyboard('{Escape}');
    // A half-sent payout request must not be dismissible out from under itself.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('moves focus into the dialog, onto the nominated close control', async () => {
    render(<Dialog />);
    await userEvent.click(screen.getByRole('button', { name: /open it/i }));

    // Not "Submit" — a modal that opens with the destructive action focused is
    // how people confirm things they meant to cancel.
    await waitFor(() => expect(screen.getByRole('button', { name: /close/i })).toHaveFocus());
  });

  it('keeps Tab inside the dialog instead of reaching the page behind it', async () => {
    render(<Dialog />);
    await userEvent.click(screen.getByRole('button', { name: /open it/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /close/i })).toHaveFocus());

    const close = screen.getByRole('button', { name: /close/i });
    const field = screen.getByRole('textbox', { name: /a field/i });
    const submit = screen.getByRole('button', { name: /submit/i });

    // `userEvent.tab()` computes the next stop itself and never lets the
    // browser run its default Tab, so it cannot exercise a trap. A real Tab is a
    // keydown that the handler intercepts *before* focus moves, so dispatch it.
    const tab = (shift = false) =>
      fireEvent.keyDown(document.activeElement, { key: 'Tab', shiftKey: shift });

    // Past the last control, focus wraps back inside rather than escaping.
    submit.focus();
    tab();
    expect(close).toHaveFocus();

    // And backwards off the first control, likewise.
    close.focus();
    tab(true);
    expect(submit).toHaveFocus();

    // Mid-dialog Tab is deliberately left alone: the handler neither moves nor
    // prevents focus there, so the browser's own traversal decides. jsdom has no
    // default Tab, so what we can assert is that nothing happened.
    field.focus();
    tab();
    expect(field).toHaveFocus();
    expect(close).not.toHaveFocus();
    expect(submit).not.toHaveFocus();

    // The case that was actually broken on the real page: focus had ended up
    // outside the dialog (on the trigger behind the overlay) and Tab walked on
    // into the sidebar. It must be pulled back in.
    screen.getByRole('button', { name: /behind the dialog/i }).focus();
    tab();
    expect(close).toHaveFocus();
    expect(screen.getByRole('button', { name: /behind the dialog/i })).not.toHaveFocus();
  });

  it('returns focus to whatever opened it', async () => {
    render(<Dialog />);
    const trigger = screen.getByRole('button', { name: /open it/i });
    await userEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // Without this, focus lands on <body> and a keyboard user has to tab the
    // whole page back to where they were.
    expect(trigger).toHaveFocus();
  });

  it('is inert until opened, and does not steal focus on mount', () => {
    const onClose = vi.fn();
    render(<Dialog label="Never opened" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('reads the latest onClose rather than the one captured at open time', async () => {
    // Guards the stale-closure trap: the listener is bound once per open, so it
    // has to read through a ref or it would call a stale setter after the
    // component re-rendered with new props.
    function Racy() {
      const [open, setOpen] = useState(false);
      const [n, setN] = useState(0);
      const { panelRef, closeRef } = useModalDialog({ open, onClose: () => setOpen(false) });
      return (
        <>
          <button type="button" onClick={() => setN((v) => v + 1)}>
            rerender {n}
          </button>
          <span data-testid="n">{n}</span>
          {open && (
            <div role="dialog" aria-label="d" tabIndex={-1} ref={panelRef}>
              <button type="button" ref={closeRef} aria-label="Close" onClick={() => setOpen(true)}>
                keep open
              </button>
              <button type="button" onClick={() => setOpen(false)}>
                close
              </button>
            </div>
          )}
          <button type="button" onClick={() => setOpen(true)}>
            open
          </button>
        </>
      );
    }

    render(<Racy />);
    await userEvent.click(screen.getByRole('button', { name: 'open' }));
    await userEvent.click(screen.getByRole('button', { name: 'rerender 0' }));
    expect(screen.getByTestId('n')).toHaveTextContent('1');

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});