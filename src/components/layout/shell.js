/**
 * Single source of truth for the dashboard's horizontal alignment.
 *
 * The content column is CENTRED in the space right of the sidebar, and the
 * fixed Header's inner column uses the same measure, so the logo always sits
 * on the page column's left edge. Before this, the column was flush left and
 * a 1920 window left ~210px of dead space on the right; the admin dashboard
 * (TravioGhana-Admin/src/components/layout/AppLayout.tsx) was already centred,
 * so this also brings the two internal apps onto one measure.
 *
 * Rules for pages (enforced by __tests__/pageAlignment.test.js):
 *   - never declare your own horizontal gutter — PageContainer owns it
 *   - never centre a page root with `mx-auto` — the column is already centred,
 *     so a second centring moves that page's title off the logo rail by a
 *     different amount on every width and sidebar state
 *   - a narrower reading measure (`max-w-4xl`) is fine: it stays left-aligned
 *     on the column edge, exactly like the full-width pages
 *
 * SHELL_GUTTER and SHELL_MEASURE must stay in sync with the fixed Header,
 * which is what the measured alignment in scripts/check-alignment.mjs compares
 * against.
 */
export const SHELL_GUTTER = "px-4 lg:px-6";

/**
 * One content measure for the whole dashboard, matching the admin apps.
 * `mx-auto` lives here on purpose: nothing can take the column without
 * centring it, and the ProductDetail bleed route (which composes the same
 * token) inherits the centring for free.
 */
export const SHELL_MEASURE = "w-full max-w-[1440px] mx-auto";

/** Vertical rhythm for a scrolling page (top matches the old page padding). */
export const SHELL_PADDING_Y = "pt-4 pb-10 md:pt-6";

/** Keeps short pages from collapsing against the header. */
export const SHELL_SURFACE = "min-h-[calc(100vh-64px)]";
