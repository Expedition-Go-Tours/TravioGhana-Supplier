import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the finance deep-link contract that blanked the page:
 *  - the notification mapper must never emit the dead `?tab=requests` route
 *    (payout requests moved into the Payouts tab; the old link matched no tab,
 *    fetched no data and left the content area empty)
 *  - FinancePage must normalize unknown/stale `?tab=` values so any legacy
 *    link falls back to the default Earnings view instead of blanking out
 */

const FINANCE_PAGE = resolve(process.cwd(), "src", "features", "finance", "pages", "FinancePage.jsx");
const NOTIFICATION_PRESENTATION = resolve(
  process.cwd(),
  "src",
  "features",
  "notifications",
  "utils",
  "notificationPresentation.js"
);

describe("FinancePage tab normalization", () => {
  const source = readFileSync(FINANCE_PAGE, "utf8");

  it("normalizes an unknown ?tab= value instead of trusting the URL", () => {
    expect(source).toContain('searchParams.get("tab") || "earnings"');
    expect(source).toContain("TABS.some((tab) => tab.key === requestedTab)");
  });

  it("never references the dead requests tab", () => {
    expect(source).not.toContain("tab=requests");
  });
});

describe("notification payout routes", () => {
  const source = readFileSync(NOTIFICATION_PRESENTATION, "utf8");

  it("never emits the dead requests tab", () => {
    expect(source).not.toContain("tab=requests");
  });

  it("routes payout requests to the Payouts tab", () => {
    expect(source).toContain('"/finance?tab=payouts"');
  });
});