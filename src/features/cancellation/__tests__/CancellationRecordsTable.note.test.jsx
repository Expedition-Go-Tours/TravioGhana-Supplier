/**
 * `CancellationRecordsTable` — the customer's free-text note.
 *
 * The backend sends the note on every record (`cancellationController`
 * returns `note: r.cancellationNote || null`) and this table renders it as a
 * second line beneath the resolved reason. A reason alone tells a supplier
 * *what* a cancellation was; the note is where the customer's explanation
 * lives.
 *
 * The reason stays truncated on one line — notes are long free text and a
 * two-line record would break the table's rhythm — so the full reason+note
 * pair is carried in the cell's `title` for hover.
 *
 * These assertions run against the desktop layout; the card layout has its
 * own suite.
 */
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CancellationRecordsTable from "../components/CancellationRecordsTable";

const baseRecord = {
  // `id` keys the row, and `reason` arrives as the backend's resolved label
  // (the customer's own choice for a customer cancel), never a raw code.
  id: "rec-1",
  travelDate: "2026-10-02",
  cancelledOn: "2026-09-30",
  reason: "Bad weather",
  note: null,
  origin: "SUPPLIER",
  bookingReference: "TRG-90123456-2026-01",
  productName: "Shai Hills Safari",
  bookingValue: 420,
  refundAmount: 420,
  countsTowardRate: true,
};

function useDesktopLayout() {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: true,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

beforeEach(useDesktopLayout);

/** Finds the reason cell for a row, identified by its booking reference. */
function reasonCellFor(reference) {
  const refCell = screen.getByText(reference);
  const row = refCell.closest("tr");
  return within(row).getAllByRole("cell")[1];
}

function renderTable(records) {
  render(
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
      totalLost={420}
    />
  );
}

describe("CancellationRecordsTable — customer note", () => {
  it("shows the note beneath the reason", () => {
    renderTable([
      {
        ...baseRecord,
        note: "Forecast said the whole week would be washed out.",
      },
    ]);

    expect(screen.getByText("Bad weather")).toBeTruthy();
    expect(
      screen.getByText("Forecast said the whole week would be washed out.")
    ).toBeTruthy();
  });

  it("puts the reason and the note together in the cell's hover title", () => {
    // Both lines are truncated on screen, so without this the full text is
    // unreachable in the table itself.
    renderTable([
      {
        ...baseRecord,
        note: "Forecast said the whole week would be washed out.",
      },
    ]);

    expect(reasonCellFor("TRG-90123456-2026-01").getAttribute("title")).toBe(
      "Bad weather\nForecast said the whole week would be washed out."
    );
  });

  it("falls back to the bare reason when there is no note", () => {
    // Most cancellations are a reason and nothing else; the title must not
    // gain a dangling newline.
    renderTable([{ ...baseRecord, note: null }]);

    expect(reasonCellFor("TRG-90123456-2026-01").getAttribute("title")).toBe(
      "Bad weather"
    );
  });

  it("renders no note line when the record has none", () => {
    renderTable([
      { ...baseRecord, id: "rec-a", bookingReference: "TRG-00000001-2026-01", note: null },
      {
        ...baseRecord,
        id: "rec-b",
        bookingReference: "TRG-00000002-2026-01",
        note: "Car broke down two hours from the site.",
      },
    ]);

    // Exactly one row carries a note, so only one note line exists at all.
    expect(
      screen.getByText("Car broke down two hours from the site.")
    ).toBeTruthy();
    const firstRowReasonCell = within(
      screen.getByText("TRG-00000001-2026-01").closest("tr")
    ).getAllByRole("cell")[1];
    expect(firstRowReasonCell.children).toHaveLength(1);
  });

  it("shows the cancellation date separately from the travel date", () => {
    // GetYourGuide measures the rate by cancellation date, so the table must
    // lead with that date — otherwise a cancellation made inside the window
    // for a future trip looks out of place.
    renderTable([baseRecord]);

    const row = screen.getByText("TRG-90123456-2026-01").closest("tr");
    const cells = within(row).getAllByRole("cell");
    expect(cells[0].textContent).toContain("2026-09-30");
    expect(cells[0].textContent).toContain("Travelled 2026-10-02");
  });

  it("keeps the reason readable when the note is long", () => {
    // The note is visually de-emphasised (small, muted) so the reason stays
    // the scannable field — a long note must not reflow the row height, which
    // is why it carries the same truncation treatment.
    renderTable([
      {
        ...baseRecord,
        note: "x".repeat(400),
      },
    ]);

    const noteEl = screen.getByText("x".repeat(400));
    expect(noteEl.className).toContain("truncate");
    expect(screen.getByText("Bad weather")).toBeTruthy();
  });
});
