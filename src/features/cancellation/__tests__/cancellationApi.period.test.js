/**
 * The cancellation summary is the one card on the Performance page that does
 * not come from the analytics endpoints, so its window is passed separately.
 * If the month is dropped here the card silently reverts to a rolling window
 * under a chart showing a specific month.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

const get = vi.fn();
vi.mock("@/lib/axios", () => ({ default: { get: (...args) => get(...args) } }));

import { fetchCancellationSummary } from "../api";

beforeEach(() => {
  vi.clearAllMocks();
  get.mockResolvedValue({ data: { data: { cancellationRate: 0 } } });
});

describe("fetchCancellationSummary", () => {
  it("asks for a rolling window by default", async () => {
    await fetchCancellationSummary(undefined, 30);

    expect(get).toHaveBeenCalledWith("/suppliers/cancellation/summary", {
      params: { days: 30 },
      skipGlobalErrorHandler: true,
    });
  });

  it("passes the calendar month when one is selected", async () => {
    await fetchCancellationSummary(undefined, 30, "2026-11");

    expect(get).toHaveBeenCalledWith("/suppliers/cancellation/summary", {
      params: { days: 30, period: "2026-11" },
      skipGlobalErrorHandler: true,
    });
  });

  it("keeps the product scope", async () => {
    await fetchCancellationSummary("tour-1", 31, "2026-11");

    expect(get).toHaveBeenCalledWith("/suppliers/cancellation/summary", {
      params: { days: 31, productId: "tour-1", period: "2026-11" },
      skipGlobalErrorHandler: true,
    });
  });
});
