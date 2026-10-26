import { useCallback, useSyncExternalStore } from "react";

const supported = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function";

/**
 * Subscribes to a CSS media query.
 *
 * Used where the *same* control has to live in two different places on the
 * page rather than merely look different: rendering both and hiding one with
 * `display:none` leaves a duplicate control in the DOM, which assistive tech
 * sees whenever the hiding stylesheet has not loaded.
 */
export default function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      if (!supported()) return () => {};

      const mql = window.matchMedia(query);
      // Safari < 14 only has the deprecated listener API.
      if (typeof mql.addEventListener === "function") {
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
      }
      mql.addListener(onChange);
      return () => mql.removeListener(onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => (supported() ? window.matchMedia(query).matches : false),
    [query],
  );

  // No server render in this app, but the third argument keeps the hook safe
  // if it is ever rendered outside a browser.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
