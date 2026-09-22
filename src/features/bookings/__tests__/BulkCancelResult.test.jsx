import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BulkCancelResult } from "../components/BulkCancelWizard";

/**
 * The bulk endpoint returns either an executed summary (`cancelled`) or, when
 * the approval flag is on, a parked-requests summary (`requested`/`requests`).
 */
describe("BulkCancelResult", () => {
  it("summarises submitted requests when the batch is parked for approval", () => {
    render(
      <BulkCancelResult
        taxonomy={{ feePct: 25 }}
        result={{
          matched: 3,
          requested: 2,
          skipped: 1,
          failed: 0,
          stopSellingApplied: true,
          blockedDates: ["2026-06-15", "2026-06-16"],
          overflow: false,
          batchId: "batch-1",
          results: [
            { bookingId: "BK-1", bookingNumber: "TGA-1", ok: true, requestId: "req-1" },
            { bookingId: "BK-2", bookingNumber: "TGA-2", ok: true, requestId: "req-2" },
          ],
          requests: [],
        }}
      />
    );

    expect(screen.getByText("Requests submitted")).toBeTruthy();
    expect(screen.getByText("Skipped")).toBeTruthy();
    expect(
      screen.getByText(/2 cancellation requests submitted for review/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/Nothing has been cancelled yet and the customers have not been told/i)
    ).toBeTruthy();
    expect(screen.getByText(/Stop-selling is already live for 2 dates/i)).toBeTruthy();
    // Executed-only copy must not appear.
    expect(screen.queryByText("Total refunded")).toBeNull();
    expect(screen.queryByText("Cancelled")).toBeNull();
  });

  it("keeps the executed summary when the batch actually cancelled bookings", () => {
    render(
      <BulkCancelResult
        taxonomy={{ feePct: 25 }}
        result={{
          matched: 2,
          cancelled: 2,
          failed: 0,
          totalRefunded: 4800,
          totalFees: 1200,
          blockedDates: ["2026-06-15"],
          overflow: false,
          results: [],
        }}
      />
    );

    expect(screen.getByText("Cancelled")).toBeTruthy();
    expect(screen.getByText("Total refunded")).toBeTruthy();
    expect(screen.getByText(/2 booking\(s\) matched this run/i)).toBeTruthy();
    expect(screen.queryByText("Requests submitted")).toBeNull();
  });
});
