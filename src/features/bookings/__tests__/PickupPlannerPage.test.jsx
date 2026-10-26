/**
 * The Pickup Planner renders a type-agnostic, day-grouped run: KPI counts from
 * the range-wide `counts`, a pickup-state filter that hits the API, compact
 * stop rows, and a "mark picked up" run action.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";

const fetchPickupPlanner = vi.fn();
const fetchAllPickupPlanner = vi.fn();
const updateBookingPickup = vi.fn();
const reorderPickupStops = vi.fn();
const teamRole = vi.hoisted(() => ({ manage: true }));

vi.mock("../api", () => ({
  fetchPickupPlanner: (...args) => fetchPickupPlanner(...args),
  fetchAllPickupPlanner: (...args) => fetchAllPickupPlanner(...args),
  updateBookingPickup: (...args) => updateBookingPickup(...args),
  reorderPickupStops: (...args) => reorderPickupStops(...args),
}));
vi.mock("@/stores/authStore", () => ({ getAuthToken: () => "token" }));
vi.mock("@/hooks/useTeamRole", () => ({
  useTeamRole: () => ({ hasPermission: () => teamRole.manage }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() } }));

import PickupPlannerPage from "../pages/PickupPlannerPage";

const baseBooking = (over = {}) => ({
  id: over.id,
  bookingNumber: over.id,
  customerName: over.customerName || "Ann Boateng",
  contactPhone: "0244000000",
  tourName: "Accra City Tour",
  travelDate: "2026-10-01",
  selectedTime: "08:00",
  status: "CONFIRMED",
  pickup: {
    place: "Kempinski Hotel",
    areaName: "East Legon",
    address: {
      name: "12 Akuafo St",
      address: "12 Akuafo St, East Legon, Accra",
      lat: 5.6037,
      lng: -0.187,
    },
    time: "08:00",
    instructions: "Lobby",
  },
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
    teamRole.manage = true;
    mockPlanner([
      baseBooking({ id: "b1", pickupState: "confirmed" }),
      baseBooking({ id: "b2", customerName: "Kofi Mensah", pickupState: "deferred" }),
    ]);
  });

  it("shows range-wide KPI counts, the exact address and the stop rows", async () => {
    render(<PickupPlannerPage />);

    await waitFor(() => expect(screen.getByText("Kofi Mensah")).toBeInTheDocument());
    expect(screen.getByText("Ann Boateng")).toBeInTheDocument();
    // The card must render the canonical street address, not the old
    // "place" label (Kempinski Hotel) that used to win the priority.
    expect(screen.getAllByText("12 Akuafo St, East Legon, Accra").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Zone: East Legon/).length).toBeGreaterThan(0);
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
    fireEvent.click(within(group).getByRole("button", { name: /needs info/i }));

    await waitFor(() =>
      expect(fetchPickupPlanner).toHaveBeenLastCalledWith(expect.objectContaining({ pickupState: "incomplete" }))
    );
  });

  it("sends the search term to the server instead of filtering only this page", async () => {
    render(<PickupPlannerPage />);
    await waitFor(() => expect(screen.getByText("Ann Boateng")).toBeInTheDocument());
    fetchPickupPlanner.mockClear();

    fireEvent.change(screen.getByLabelText("Search pickups"), { target: { value: "akuafo" } });

    await waitFor(
      () => expect(fetchPickupPlanner).toHaveBeenCalledWith(expect.objectContaining({ q: "akuafo", page: 1 })),
      { timeout: 2000 }
    );
  });

  it("reorders against the complete day, not only the visible rows", async () => {
    fetchAllPickupPlanner.mockResolvedValue({
      bookings: [
        baseBooking({ id: "b1" }),
        baseBooking({ id: "b2", customerName: "Kofi Mensah" }),
      ],
      totalCount: 2,
      truncated: false,
    });
    reorderPickupStops.mockResolvedValue({});

    render(<PickupPlannerPage />);
    await waitFor(() => expect(screen.getByText("Kofi Mensah")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Move Kofi Mensah's stop up" }));

    await waitFor(() =>
      expect(reorderPickupStops).toHaveBeenCalledWith("2026-10-01", ["b2", "b1"])
    );
    expect(fetchAllPickupPlanner).toHaveBeenCalledWith({
      from: "2026-10-01",
      to: "2026-10-01",
    });
  });

  it("marks a stop picked up without changing the pickup details", async () => {
    updateBookingPickup.mockResolvedValue({ id: "b1" });
    render(<PickupPlannerPage />);

    await waitFor(() => expect(screen.getByText("Ann Boateng")).toBeInTheDocument());

    const buttons = screen.getAllByRole("button", { name: "Mark picked up" });
    fireEvent.click(buttons[0]);

    await waitFor(() => expect(updateBookingPickup).toHaveBeenCalledWith("b1", { pickedUp: true }));
  });

  it("hides manage actions for a viewer with bookings.view only", async () => {
    teamRole.manage = false;
    render(<PickupPlannerPage />);

    await waitFor(() => expect(screen.getByText("Ann Boateng")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Mark picked up" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.getAllByText("View only").length).toBeGreaterThan(0);
  });
});
