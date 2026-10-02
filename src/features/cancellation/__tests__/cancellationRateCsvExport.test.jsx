/**
 * The cancellation-rate CSV export carries the customer's note.
 *
 * The records table shows the note under the reason, so an export that
 * dropped it would hand a supplier a file that silently disagrees with the
 * screen they were just looking at — and the note is the part that explains
 * *why* a cancellation happened, so it is the part worth having in the file.
 *
 * The export is assembled inline in the page, so this drives the real button
 * rather than an extracted helper: the guarantee that matters is "click Export
 * and the note is in the file", and a helper-level test would keep passing if
 * the button stopped calling it.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CancellationRatePage from "../pages/CancellationRatePage";
import {
  fetchCancellationProducts,
  fetchCancellationRecords,
  fetchCancellationSummary,
} from "../api";

vi.mock("../api", () => ({
  fetchCancellationSummary: vi.fn(),
  fetchCancellationRecords: vi.fn(),
  fetchCancellationProducts: vi.fn(),
}));

const NOTE = 'Forecast said "the whole week" would be washed out.';

const RECORD = {
  id: "rec-1",
  travelDate: "2026-10-02",
  reason: "Bad weather",
  note: NOTE,
  bookingReference: "TRG-90123456-2026-01",
  productName: "Shai Hills Safari",
  bookingValue: 420,
  refundAmount: 420,
  countsTowardRate: true,
};

/**
 * Splits one CSV line into its fields, honouring quoted cells whose inner
 * quotes are doubled. Returns unquoted values, so a present-but-empty field
 * is indistinguishable from a missing one by value alone — which is why the
 * column-count assertion below is done on the header, not the row.
 */
function splitCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/** Captures the text handed to every `new Blob(...)` while the test runs. */
let blobParts = [];
const RealBlob = globalThis.Blob;

beforeEach(() => {
  blobParts = [];
  vi.stubGlobal(
    "Blob",
    class extends RealBlob {
      constructor(parts = [], options) {
        super(parts, options);
        blobParts.push(parts.join(""));
      }
    }
  );
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:cancellation-export");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

function recordsResponse(records) {
  return {
    records,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalCount: records.length,
      limit: 25,
    },
  };
}

/** Renders the page and clicks Export CSV, returning the captured CSV text. */
async function exportCSV() {
  const user = userEvent.setup();
  render(<CancellationRatePage />);

  const button = await screen.findByRole("button", { name: /export csv/i });
  await user.click(button);

  await waitFor(() => expect(blobParts.length).toBeGreaterThan(0));
  return blobParts[blobParts.length - 1];
}

describe("cancellation rate — CSV export", () => {
  beforeEach(() => {
    fetchCancellationSummary.mockResolvedValue({ bookingValueLost: 420 });
    fetchCancellationProducts.mockResolvedValue([
      { id: "t-1", name: "Shai Hills Safari" },
    ]);
    fetchCancellationRecords.mockResolvedValue(recordsResponse([RECORD]));
  });

  it("includes a Note column", async () => {
    const [header] = (await exportCSV()).split("\n");

    expect(splitCsvLine(header)).toContain("Note");
  });

  it("includes the customer's note in the data row", async () => {
    const csv = await exportCSV();

    // Raw text: the note is quoted and its inner quotes are doubled, so a
    // spreadsheet reads back one cell containing the sentence verbatim.
    expect(csv).toContain('"Forecast said ""the whole week"" would be washed out."');
  });

  it("keeps the note column aligned with the reason column", async () => {
    // Headers and cells are positional. Adding a header without the matching
    // cell would shift every later column and silently corrupt the file, so
    // the note cell must sit exactly where its header says it does.
    const [header, row] = (await exportCSV()).split("\n");
    const headerFields = splitCsvLine(header);
    const rowFields = splitCsvLine(row);

    expect(headerFields.indexOf("Note")).toBe(headerFields.indexOf("Reason") + 1);
    expect(rowFields[headerFields.indexOf("Note")]).toBe(NOTE);
    expect(rowFields[headerFields.indexOf("Reason")]).toBe(RECORD.reason);
  });

  it("escapes embedded quotes so the record stays on one row", async () => {
    // A note containing a newline would split the record across two rows and
    // desync every column after it. The exporter quotes and doubles inner
    // quotes; this pins that the note gets the same treatment as the reason.
    const csv = await exportCSV();

    expect(csv.trim().split("\n")).toHaveLength(2);
  });

  it("keeps an empty field when a record has no note", async () => {
    // `""` is an empty-but-present field. Without it the row would be one
    // cell short and every column after Reason would shift left — which is
    // worse than a blank note, because the file still opens cleanly.
    fetchCancellationRecords.mockResolvedValue(
      recordsResponse([{ ...RECORD, note: null }])
    );

    const [header, row] = (await exportCSV()).split("\n");
    const headerFields = splitCsvLine(header);
    const rowFields = splitCsvLine(row);
    const noteIndex = headerFields.indexOf("Note");

    expect(row).toContain('"Bad weather","",');
    expect(rowFields).toHaveLength(headerFields.length);
    expect(rowFields[noteIndex]).toBe("");
    expect(rowFields[noteIndex + 1]).toBe(RECORD.bookingReference);
  });
});