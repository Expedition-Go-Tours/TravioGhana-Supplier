/**
 * Single source of truth for the dashboard's horizontal alignment.
 *
 * The header logo and every page's content must start at the same left edge,
 * otherwise pages appear to "drift" toward the centre on wide windows. The
 * Header, PageContainer and the full-bleed pages all read these values from
 * here, so the two can never disagree again.
 *
 * Rules for pages (enforced by __tests__/pageAlignment.test.jsx):
 *   - never declare your own horizontal gutter or `mx-auto` — PageContainer owns it
 *   - a narrower reading measure is fine, as long as it is left-aligned
 *     (e.g. `max-w-4xl`, never `max-w-4xl mx-auto`)
 *
 * SHELL_GUTTER must stay in sync with the fixed Header, which is what the
 * measured alignment in scripts/check-alignment.mjs compares against.
 */
export const SHELL_GUTTER = "px-4 lg:px-6";

/** One content measure for the whole dashboard, matching the admin apps. */
export const SHELL_MEASURE = "w-full max-w-[1440px]";

/** Vertical rhythm for a scrolling page (top matches the old page padding). */
export const SHELL_PADDING_Y = "pt-4 pb-10 md:pt-6";

/** Keeps short pages from collapsing against the header. */
export const SHELL_SURFACE = "min-h-[calc(100vh-64px)]";
