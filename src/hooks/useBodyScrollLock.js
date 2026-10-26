import { useEffect } from "react";

// Reference-counted so two stacked overlays cannot unlock each other: the
// second drawer to close would otherwise restore `overflow` while the first is
// still open, and the page would scroll behind it.
let locks = 0;
let previousOverflow = "";

/**
 * Freezes the document behind a full-screen overlay.
 *
 * The booking drawers are `fixed inset-0` on phones. Without this the page
 * underneath still scrolls: a swipe that starts on the drawer's body chains to
 * the document, and the list behind it drifts while the user is filling a form.
 */
export default function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return undefined;

    if (locks === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    locks += 1;

    return () => {
      locks = Math.max(0, locks - 1);
      if (locks === 0) document.body.style.overflow = previousOverflow;
    };
  }, [active]);
}
