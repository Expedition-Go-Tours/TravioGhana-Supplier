/**
 * The Pickup Planner renders a type-agnostic, day-grouped run: KPI counts from
 * the range-wide `counts`, a pickup-state filter that hits the API, compact
 * stop rows, and a "mark picked up" run action.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";

const fetchPickupPlanner = vi.fn();
const updateBookingPickup = vi.fn();
const reorderPickupStops = vi.fn();

vi.mock("../api", () => ({
  fetchPickupPlanner: (...args) => fetchPickupPlanner(...args),
  updateBookingPickup: (...args) => updateBookingPickup(...args),
  reorderPickupStops: (...args) => reorderPickupStops(...args),
}));
vi.mock("@/stores/authStore", () => ({ getAuthToken: () => "token" }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import PickupPlannerPage from "../pages/PickupPlannerPage";

const baseBooking = (over = {}) => ({
  id: over.id,
  bookingNumber: over.id,
  customerName: over.customerName || "Ann Boateng",
  customerPhone: "0244000000",
  tourName: "Accra City Tour",
  travelDate: "2026-10-01",
  selectedTime: "08:00",
  status: "CONFIRMED",
  pickup: { place: "Kempinski Hotel", time: "08:00", instructions: "Lobby" },
  pickupState: over.pickupState || "confirmed",
  pickupOrder: over.pickupOrder ?? null,
  pickedUpAt: over.pickedUpAt ?? null,
  travelersRaw: { adults: 2 },
  isIncomplete: over.pickupState === "incomplete",
});

const COUNTS = { all: 2, deferred: 2, incomplete: 3, confirmed: 5, pickedUp: 1 };

function mockPlanner(bookings) {
  fetchPickupPlanner.mockResolvedValue({
    bookings,
    counts: COUNTS,
    pagination: { currentPage: 1, totalPages: 1, totalCount: bookings.length, limit: 50 },
  });
}

describe("PickupPlannerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlanner([
      baseBooking({ id: "b1", pickupState: "confirmed" }),
      baseBooking({ id: "b2", customerName: "Kofi Mensah", pickupState: "deferred" }),
    ]);
  });

  it("shows range-wide KPI counts and the stop rows", async () => {
    render(<PickupPlannerPage />);

    await waitFor(() => expect(screen.getByText("Kofi Mensah")).toBeInTheDocument());
    expect(screen.getByText("Ann Boateng")).toBeInTheDocument();
    // KPI values come from `counts`, not the page length.
    expect(within(screen.getByTestId("kpi-deferred")).getByText("2")).toBeInTheDocument();
    expect(within(screen.getByTestId("kpi-incomplete")).getByText("3")).toBeInTheDocument();
    expect(within(screen.getByTestId("kpi-confirmed")).getByText("5")).toBeInTheDocument();
    expect(within(screen.getByTestId("kpi-pickedup")).getByText("1")).toBeInTheDocument();
  });

  it("filters by pickup state on the server", async () => {
    render(<PickupPlannerPage />);
    await waitFor(() => expect(fetchPickupPlanner).toHaveBeenCalled());

    const group = screen.getByRole("group", { name: "Pickup state filter" });
    fireEvent.click(within(group).getByRole("button", { name: /incomplete/i }));

    await waitFor(() =>
      expect(fetchPickupPlanner).toHaveBeenLastCalledWith(expect.objectContaining({ pickupState: "incomplete" }))
    );
  });

  it("marks a stop picked up without changing the pickup details", async () => {
    updateBookingPickup.mockResolvedValue({ id: "b1" });
    render(<PickupPlannerPage />);

    await waitFor(() => expect(screen.getByText("Ann Boateng")).toBeInTheDocument());

    const buttons = screen.getAllByRole("button", { name: "Mark picked up" });
    fireEvent.click(buttons[0]);

    await waitFor(() => expect(updateBookingPickup).toHaveBeenCalledWith("b1", { pickedUp: true }));
  });
});
