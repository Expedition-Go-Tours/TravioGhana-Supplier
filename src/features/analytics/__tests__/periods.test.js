/**
 * The client half of the period model: labels, day counts and GA4 bounds must
 * agree with the server's window, or the page shows one month of money next to
 * another month's dates.
 */

import { describe, expect, it } from "vitest";
import { periodMeta, resolvePeriodKey, monthOptions, isMonthKey } from "../periods";

const NOW = new Date("2026-11-23T09:15:00.000Z");

describe("presets", () => {
  it("keeps the rolling window labels", () => {
    const meta = periodMeta("30d", NOW);

    expect(meta.full).toBe("Last 30 days");
    expect(meta.days).toBe(30);
    expect(meta.previousLabel).toBe("Previous period");
    expect(meta.compareText).toBe("compared with the 30 days before");
    expect(meta.isMonth).toBe(false);
  });

  it("asks GA4 for the same rolling window", () => {
    const meta = periodMeta("90d", NOW);
    const span = (new Date(meta.to) - new Date(meta.from)) / 86_400_000;

    expect(Math.round(span)).toBe(90);
  });
});

describe("calendar months", () => {
  it("describes the month, its comparison and its inclusive day bounds", () => {
    const meta = periodMeta("2026-11", NOW);

    expect(meta.isMonth).toBe(true);
    expect(meta.full).toBe("November 2026");
    expect(meta.label).toBe("Nov 2026");
    expect(meta.previousLabel).toBe("October 2026");
    expect(meta.compareText).toBe("compared with October 2026");
    expect(meta.days).toBe(30);
    expect(meta.from).toBe("2026-11-01");
    expect(meta.to).toBe("2026-11-30");
  });

  it("rolls the year over for January", () => {
    const meta = periodMeta("2026-01", new Date("2026-01-10T00:00:00Z"));

    expect(meta.previousLabel).toBe("December 2025");
    expect(meta.to).toBe("2026-01-31");
  });

  it("uses the real length of February", () => {
    expect(periodMeta("2026-02", NOW).days).toBe(28);
    expect(periodMeta("2026-02", NOW).to).toBe("2026-02-28");
    expect(periodMeta("2024-02", NOW).days).toBe(29);
  });
});

describe("resolvePeriodKey", () => {
  it("accepts presets and valid months", () => {
    expect(resolvePeriodKey("90d", NOW)).toBe("90d");
    expect(resolvePeriodKey("2026-10", NOW)).toBe("2026-10");
  });

  it("falls back to 30 days for junk, future and out-of-range months", () => {
    expect(resolvePeriodKey(undefined, NOW)).toBe("30d");
    expect(resolvePeriodKey("nope", NOW)).toBe("30d");
    expect(resolvePeriodKey("2026-12", NOW)).toBe("30d");
    expect(resolvePeriodKey("2026-13", NOW)).toBe("30d");
    expect(resolvePeriodKey("2019-01", NOW)).toBe("30d");
  });

  it("recognises month-shaped strings", () => {
    expect(isMonthKey("2026-11")).toBe(true);
    expect(isMonthKey("30d")).toBe(false);
  });
});

describe("monthOptions", () => {
  it("starts with the current month and walks backwards", () => {
    const options = monthOptions(NOW, 3);

    expect(options.map((option) => option.key)).toEqual(["2026-11", "2026-10", "2026-09"]);
    expect(options[0].label).toBe("November 2026");
  });

  it("offers 18 months by default", () => {
    expect(monthOptions(NOW)).toHaveLength(18);
  });
});
