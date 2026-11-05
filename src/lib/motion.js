/**
 * Shared motion vocabulary.
 *
 * One curve and one spring across the dashboard, so a drawer, a page and a tab
 * feel like the same product. Travel is deliberately small (12–28px): the
 * point is to show where a surface came from, not to make the user watch.
 */

/** Fast-out, gentle-settle. The standard easing for entrances/exits. */
export const EASE_OUT = [0.22, 1, 0.36, 1];

/** Panels and drawers: quick, slightly springy, no bounce past the edge. */
export const PANEL_SPRING = { type: "spring", stiffness: 340, damping: 36, mass: 0.9 };

/** Tab indicators: a touch looser, so the pill visibly travels. */
export const TAB_SPRING = { type: "spring", stiffness: 380, damping: 30 };

/** Fades used for scrims and content swaps. */
export const FADE = { duration: 0.18, ease: EASE_OUT };

/** Per-direction page transitions, shared by PageTransition. */
export function pageVariants(back, distance) {
  return {
    enter: { opacity: 0, x: back ? -distance : distance },
    centre: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: back ? distance : -distance, transition: { duration: 0.13, ease: EASE_OUT } },
  };
}
