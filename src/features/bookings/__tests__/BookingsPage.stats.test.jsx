/**
 * The stat row above the booking list.
 *
 * Two things it has to get right, both of which have already gone wrong here:
 *
 *  1. It had no cancellation count at all, so a supplier could see how many
 *     bookings completed and how much they took, but not how many fell over.
 *     The count is `CANCELLED` only — REFUNDED and FAILED stay out of it, and
 *     it is derived from `filteredData` like every other card on the row, so it
 *     moves with the search box and the date filters.
 *
 *  2. It was a 5-column grid. Adding a sixth card left it on `lg:grid-cols-5`,
 *     which wraps the sixth card onto a second line on any laptop screen — the
 *     row grew a line for one number. The column count is asserted here because
 *     jsdom cannot lay out, so nothing else would notice the regression.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const fetchSupplierBookings = vi.fn();

vi.mock("../api", () => ({
  fetchSupplierBookings: (...a) => fetchSupplierBookings(...a),
  updateBookingStatus: vi.fn(),
  cancelBookingStructured: vi.fn(),
  withdrawCancellationRequest: vi.fn(),
}));

vi.mock("@/stores/authStore", () => ({
  getAuthToken: () => "test-token",
}));

// The rows, wizard and requests panel have their own tests. Stub them so this
// one is about the numbers and the grid.
vi.mock("../components/BookingCard", () => ({
  default: ({ booking }) => <div data-testid="booking-row">{booking.bookingNumber}</div>,
}));
vi.mock("../components/CancelBookingModal", () => ({ default: () => null }));
vi.mock("../components/BulkCancelWizard", () => ({ default: () => null }));
vi.mock("../components/CancellationRequestsPanel", () => ({ default: () => null }));

import BookingsPage from "../pages/BookingsPage";

let seq = 0;
const row = (status, total = 100) => ({
  id: `b-${++seq}`,
  bookingNumber: `TGA-${1000 + seq}`,
  customerName: "Ama Serwaa",
  customerEmail: "ama@example.com",
  tourName: "Shai Hills Safari",
  travelDate: "2026-11-04",
  bookingDate: "2026-10-01",
  status,
  total,
  currency: "USD",
});

// 8 rows. The REFUNDED row is the discriminator: fold it into the cancellation
// count and the card reads 2 instead of 1.
const BOOKINGS = [
  row("CONFIRMED"),
  row("CONFIRMED"),
  row("COMPLETED"),
  row("COMPLETED"),
  row("COMPLETED"),
  row("CANCELLED"),
  row("PENDING"),
  row("REFUNDED"),
];

beforeEach(() => {
  seq = 0;
  fetchSupplierBookings.mockReset();
  fetchSupplierBookings.mockResolvedValue({
    bookings: BOOKINGS,
    summary: null,
    pagination: { currentPage: 1, totalPages: 1, totalCount: BOOKINGS.length, limit: 25 },
  });
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <BookingsPage />
    </MemoryRouter>,
  );

/**
 * The grid holding the cards. Found via a label rather than a test id so the
 * selector cannot outlive the markup it is describing.
 */
const statGrid = () => screen.getByText("Total Bookings").closest(".grid");

/**
 * The value beside a card's label — scoped to the grid, because the quick
 * filters below it carry the same words ("Pending", "Confirmed", "Completed").
 */
const valueFor = (label) => {
  const cardLabel = [...statGrid().children]
    .map((el) => el.querySelector("p"))
    .find((el) => el?.textContent === label);
  // The value sits in the row above the label; the icon beside it holds no text.
  return cardLabel?.previousElementSibling?.textContent;
};

describe("the bookings stat row", () => {
  it("counts cancelled bookings alongside the other statuses", async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText("Total Bookings")).toBeInTheDocument());

    expect(valueFor("Total Bookings")).toBe("8");
    expect(valueFor("Pending")).toBe("1");
    expect(valueFor("Confirmed")).toBe("2");
    expect(valueFor("Completed")).toBe("3");
    expect(valueFor("Cancellations")).toBe("1");
  });

  it("leaves refunded bookings out of the cancellation count", async () => {
    // Same reason the assertion above cannot pass by accident: this is a
    // separate case so a REFUNDED-only list has to read 0, not 1.
    fetchSupplierBookings.mockResolvedValue({
      bookings: [row("REFUNDED"), row("FAILED")],
      summary: null,
      pagination: { currentPage: 1, totalPages: 1, totalCount: 2, limit: 25 },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText("Total Bookings")).toBeInTheDocument());
    expect(valueFor("Cancellations")).toBe("0");
  });

  it("reports no cancellations rather than hiding the card when there are none", async () => {
    fetchSupplierBookings.mockResolvedValue({
      bookings: [row("CONFIRMED"), row("COMPLETED")],
      summary: null,
      pagination: { currentPage: 1, totalPages: 1, totalCount: 2, limit: 25 },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText("Total Bookings")).toBeInTheDocument());
    expect(screen.getByText("Cancellations")).toBeInTheDocument();
    expect(valueFor("Cancellations")).toBe("0");
  });

  it("keeps all six cards on one line at lg", async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText("Total Bookings")).toBeInTheDocument());

    const grid = statGrid();
    // Six cards in five columns is five on the first line and one wrapped
    // under them — the reason the sixth card forced a second row before.
    expect(grid?.className).toContain("lg:grid-cols-6");
    expect(grid?.className).not.toContain("lg:grid-cols-5");
    expect(grid?.children).toHaveLength(6);
  });

  it("keeps three cards to a line below lg", async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText("Total Bookings")).toBeInTheDocument());

    const className = statGrid()?.className;
    expect(className).toContain("grid-cols-2");
    expect(className).toContain("sm:grid-cols-3");
  });
});