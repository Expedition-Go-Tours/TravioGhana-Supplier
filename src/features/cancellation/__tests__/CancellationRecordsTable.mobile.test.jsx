/**
 * `CancellationRecordsTable` on a phone.
 *
 * The records table used to be one wide grid inside `overflow-x-auto`: at
 * 390px the supplier saw the reason and the date, and had to scroll sideways
 * to reach booking reference, value, refund and rate impact — the columns the
 * page is for. It is now a card list below 1024px, with a sort control that
 * can express what the clickable table headers express on desktop.
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CancellationRecordsTable from "../components/CancellationRecordsTable";

const record = {
  id: "rec-1",
  travelDate: "2026-10-02",
  cancelledOn: "2026-09-30",
  reason: "Health or medical reasons",
  note: "Hospital appointment moved forward.",
  origin: "CUSTOMER",
  bookingReference: "TRG-90123456-2026-01",
  productName: "Shai Hills Safari",
  bookingValue: 420,
  refundAmount: 420,
  countsTowardRate: false,
};

function useNarrowLayout() {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

beforeEach(useNarrowLayout);

function renderTable(records = [record]) {
  return render(
    <CancellationRecordsTable
      records={records}
      pagination={{ currentPage: 1, totalPages: 1, totalCount: records.length }}
      sortField="cancelledOn"
      sortDir="desc"
      onSort={vi.fn()}
      onSortChange={vi.fn()}
      onPageChange={vi.fn()}
      onExportCSV={vi.fn()}
      days={90}
      totalLost={0}
    />
  );
}

describe("CancellationRecordsTable — narrow layout", () => {
  it("renders cards instead of a table", () => {
    renderTable();

    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("Health or medical reasons")).toBeTruthy();
    expect(screen.getByText("TRG-90123456-2026-01")).toBeTruthy();
    expect(screen.getByText("Shai Hills Safari")).toBeTruthy();
    expect(screen.getByText("Excluded")).toBeTruthy();
  });

  it("keeps every field visible without horizontal scrolling", () => {
    const { container } = renderTable();

    expect(container.querySelector(".overflow-x-auto")).toBeNull();
    expect(screen.getByText(/Hospital appointment moved forward/)).toBeTruthy();
    expect(screen.getByText(/Cancelled 2026-09-30/)).toBeTruthy();
    expect(screen.getByText(/Travelled 2026-10-02/)).toBeTruthy();
    expect(screen.getByText(/Refunded/)).toBeTruthy();
  });

  it("offers a sort control in place of the clickable headers", () => {
    renderTable();

    const sort = screen.getByLabelText("Sort by");
    expect(sort.tagName).toBe("SELECT");
    expect(sort.value).toBe("cancelledOn:desc");
  });

  it("names who cancelled the booking", () => {
    renderTable();

    expect(screen.getByText("Customer")).toBeTruthy();
  });
});
