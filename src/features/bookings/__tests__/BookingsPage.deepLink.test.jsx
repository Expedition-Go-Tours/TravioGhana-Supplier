/**
 * Deep links into one booking.
 *
 * A notification, the chat panel and the dashboard all link to
 * `/bookings?bookingId=…`. That used to be handled as a row highlight only —
 * the drawer is driven by `?detail=` — so a booking that was not on the
 * currently loaded page (different filters, page 3 of history) got no
 * reaction at all and the notification looked broken. The page now consumes
 * `bookingId` into `detail`, so the drawer opens whatever the list contains.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";

const fetchSupplierBookings = vi.fn();
const fetchCommissionCover = vi.fn();

vi.mock("../api", () => ({
  fetchSupplierBookings: (...a) => fetchSupplierBookings(...a),
  fetchCommissionCover: (...a) => fetchCommissionCover(...a),
  updateBookingStatus: vi.fn(),
  cancelBookingStructured: vi.fn(),
  withdrawCancellationRequest: vi.fn(),
  fetchRefundQuote: vi.fn(),
  createRefundRequest: vi.fn(),
  newRefundRequestIdempotencyKey: () => "test-key",
}));

vi.mock("@/stores/authStore", () => ({
  getAuthToken: () => "test-token",
}));

// The rows and the other drawers have their own tests; this one is about what
// the URL drives. The drawer stub records the id it was handed, which is the
// whole assertion: it must be the notification's booking, not "nothing".
const detailProps = [];
vi.mock("../components/BookingDetailDrawer", () => ({
  default: ({ bookingId, onClose }) => {
    detailProps.push({ bookingId, onClose });
    return (
      <div data-testid="booking-drawer">
        Drawer for {bookingId}
        <button type="button" onClick={onClose}>Close drawer</button>
      </div>
    );
  },
}));
vi.mock("../components/BookingCard", () => ({
  default: ({ booking }) => <div data-testid="booking-row">{booking.bookingNumber}</div>,
}));
vi.mock("../components/CancelBookingModal", () => ({ default: () => null }));
vi.mock("../components/RequestRefundModal", () => ({ default: () => null }));
vi.mock("../components/BulkCancelWizard", () => ({ default: () => null }));
vi.mock("../components/CancellationRequestsPanel", () => ({ default: () => null }));
vi.mock("../components/CreateBookingDrawer", () => ({ default: () => null }));

vi.mock("@/hooks/useTeamRole", () => ({
  useTeamRole: () => ({
    hasPermission: () => true,
    supplierCreatedBookings: true,
    uiPreferences: {},
  }),
}));
vi.mock("@/features/products/api", () => ({ listMyProducts: vi.fn() }));

import BookingsPage from "../pages/BookingsPage";

const row = (id, bookingNumber) => ({
  id,
  bookingNumber,
  customerName: "Ama Serwaa",
  customerEmail: "ama@example.com",
  tourName: "Shai Hills Safari",
  travelDate: "2026-11-04",
  bookingDate: "2026-10-01",
  status: "CONFIRMED",
  total: 100,
  currency: "USD",
});

/** Reads the URL the router ended up on, so we can assert params. */
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

const renderPage = (initialUrl = "/bookings") =>
  render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <LocationProbe />
      <BookingsPage />
    </MemoryRouter>,
  );

const currentUrl = () => screen.getByTestId("location").textContent;

beforeEach(() => {
  detailProps.length = 0;
  fetchSupplierBookings.mockReset();
  // The deep-linked booking is deliberately NOT in this list: it may be on
  // another page or filtered out, and the drawer must open regardless.
  fetchSupplierBookings.mockResolvedValue({
    bookings: [row("b-1", "TGA-1001"), row("b-2", "TGA-1002")],
    summary: null,
    pagination: { currentPage: 1, totalPages: 1, totalCount: 2, limit: 25 },
  });
  fetchCommissionCover.mockReset();
  fetchCommissionCover.mockResolvedValue({
    usable: true,
    currencies: [{ currency: "USD", available: 500, eligible: 500, openCharges: 0 }],
  });
});

describe("a ?bookingId deep link", () => {
  it("opens that booking's drawer even when the list does not contain it", async () => {
    renderPage("/bookings?bookingId=b-999");

    expect(await screen.findByTestId("booking-drawer")).toHaveTextContent(
      "Drawer for b-999",
    );
  });

  it("moves the id into ?detail and leaves no bookingId behind", async () => {
    renderPage("/bookings?bookingId=b-2");

    await screen.findByTestId("booking-drawer");
    await waitFor(() => {
      expect(currentUrl()).toBe("/bookings?detail=b-2");
    });
  });

  it("keeps the other filters when it rewrites the URL", async () => {
    renderPage("/bookings?tab=CONFIRMED&bookingId=b-2");

    await screen.findByTestId("booking-drawer");
    await waitFor(() => {
      expect(currentUrl()).toBe("/bookings?tab=CONFIRMED&detail=b-2");
    });
  });

  it("closes the drawer without re-opening it from the leftover param", async () => {
    const user = userEvent.setup();
    renderPage("/bookings?bookingId=b-2");

    await screen.findByTestId("booking-drawer");
    await user.click(screen.getByRole("button", { name: "Close drawer" }));

    await waitFor(() => {
      expect(screen.queryByTestId("booking-drawer")).not.toBeInTheDocument();
    });
    // Still on the bookings list, with the deep link gone.
    expect(currentUrl()).toBe("/bookings");
  });

  it("still opens a ?detail link directly", async () => {
    renderPage("/bookings?detail=b-1");

    expect(await screen.findByTestId("booking-drawer")).toHaveTextContent(
      "Drawer for b-1",
    );
  });
});
