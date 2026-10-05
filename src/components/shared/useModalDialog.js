import { useEffect, useRef } from "react";

/**
 * The bits every modal on this app needs and most of them were missing:
 * move focus in, keep it in, close on Escape, give focus back on the way out.
 *
 * The payout dialogs are the reason this exists. They were `fixed inset-0`
 * overlays with `role`-less panels and no key handling, so a keyboard user who
 * opened one was still driving the page behind it — Tab walked straight out to
 * the sidebar under a dark backdrop — and Escape did nothing at all. A modal
 * that cannot be dismissed from the keyboard is not a modal, it is a trap.
 *
 * `PayoutMethodFormSheet` already did most of this by hand; point new dialogs
 * here rather than copying that effect a fourth time.
 *
 * Usage:
 *   const { panelRef, closeRef } = useModalDialog({
 *     open: showThing,
 *     onClose: () => setShowThing(false),
 *     enabled: !submitting,          // pass false to lock Escape mid-save
 *   });
 *
 * Then on the panel: ref={panelRef} tabIndex={-1} role="dialog"
 * aria-modal="true" aria-labelledby="<id of its heading>"
 * and on the dismiss control: ref={closeRef} aria-label="Close"
 */
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function useModalDialog({ open, onClose, enabled = true }) {
  const panelRef = useRef(null);
  // Lets a dialog nominate its dismiss control as the first stop, so focus does
  // not land on "Submit" by default.
  const closeRef = useRef(null);
  const returnRef = useRef(null);

  // Held in a ref so the listener is registered once per open, not re-bound on
  // every render — otherwise `onClose`/`enabled` changing identity would drop
  // and re-add the listener mid-interaction. Written in an effect rather than
  // during render (react-hooks/refs); declared ahead of the listener effect so
  // it is already current by the time any key is pressed.
  const latest = useRef({ onClose, enabled });
  useEffect(() => {
    latest.current = { onClose, enabled };
  }, [onClose, enabled]);

  // Remember the trigger *before* focus moves, and hand it back on the way out.
  useEffect(() => {
    if (!open) return undefined;
    returnRef.current = document.activeElement;
    return () => {
      const target = returnRef.current;
      // `isConnected` guards the case where the trigger unmounted with the page.
      if (target && typeof target.focus === "function" && document.contains(target)) target.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    // Does this element actually take focus? `offsetWidth` is the honest signal
    // in a browser, but jsdom lays nothing out and reports every element as
    // 0x0 — so trusting it unconditionally silently empties the list under test
    // and the trap stops trapping. Probe whether the environment does layout at
    // all, and only then apply the size test.
    const doesLayout = typeof document !== "undefined" && document.documentElement.clientHeight > 0;
    const reachable = (el) => {
      if (el.hidden) return false;
      if (el.getAttribute("aria-hidden") === "true") return false;
      if (doesLayout && el.offsetWidth === 0 && el.offsetHeight === 0) return false;
      return true;
    };

    const focusables = () => {
      const panel = panelRef.current;
      if (!panel) return [];
      return [...panel.querySelectorAll(FOCUSABLE)].filter(reachable);
    };

    // In: the nominated close control, else the first control, else the panel.
    (closeRef.current || focusables()[0] || panelRef.current)?.focus?.();

    const onKey = (e) => {
      if (e.key === "Escape") {
        // Stop it here so a page-level Escape handler cannot also fire and close
        // something else behind this dialog.
        if (latest.current.enabled) {
          e.preventDefault();
          e.stopPropagation();
          latest.current.onClose?.();
        }
        return;
      }

      if (e.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) {
        // Nothing to move to. Keep focus on the panel rather than letting it fall
        // through to the document.
        e.preventDefault();
        panelRef.current?.focus?.();
        return;
      }

      const { activeElement } = document;
      const first = items[0];
      const last = items[items.length - 1];

      if (!panelRef.current?.contains(activeElement)) {
        // Focus had escaped (a click on the backdrop, say). Pull it back to the
        // start of the dialog rather than letting it roam the page behind.
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && activeElement === first) {
        e.preventDefault();
        last.focus();
        return;
      }
      if (!e.shiftKey && activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  return { panelRef, closeRef };
}

export default useModalDialog;