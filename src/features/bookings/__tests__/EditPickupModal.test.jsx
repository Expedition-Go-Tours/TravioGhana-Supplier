import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";

const updateBookingPickup = vi.fn();

vi.mock("../api", () => ({
  updateBookingPickup: (...args) => updateBookingPickup(...args),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));
vi.mock("@/components/shared/AmPmTimePicker", () => ({
  default: ({ value, onChange, allowEmpty, emptyLabel }) => (
    <div>
      <input
        aria-label="Pickup time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {allowEmpty && !value && <span>{emptyLabel}</span>}
    </div>
  ),
}));
vi.mock("@/components/shared/LocationMapPicker", () => ({
  default: ({ onSelect }) => (
    <div>
      <p>Map picker</p>
      <button
        type="button"
        onClick={() =>
          onSelect({
            formatted: "New Place, Accra",
            latitude: 5.7,
            longitude: -0.1,
          })
        }
      >
        Pick map point
      </button>
    </div>
  ),
}));
vi.mock("../components/PickupMapPreview", () => ({
  default: () => <div data-testid="pickup-map-preview" />,
}));

import EditPickupModal from "../components/pickup/EditPickupModal";

const makeBooking = (over = {}) => ({
  id: "b1",
  bookingNumber: "TRG-1",
  tourName: "City Tour",
  travelDate: "2026-10-01T00:00:00.000Z",
  selectedTime: "09:00",
  travelers: 2,
  status: "CONFIRMED",
  paymentTiming: "now",
  paymentStatus: "SUCCEEDED",
  pickupState: "confirmed",
  pickupConfig: {
    pickupAreas: [{ name: "East Legon", time: "08:30" }],
  },
  pickup: {
    place: "Kempinski Hotel",
    areaName: "East Legon",
    address: {
      name: "Kempinski Hotel",
      address: "12 Akuafo St, East Legon, Accra",
      lat: 5.6037,
      lng: -0.187,
    },
    time: "08:00",
    instructions: "Lobby",
    updatedBy: "supplier-1",
  },
  ...over,
});

const saved = {
  data: {
    data: {
      pickupNotification: {
        changed: true,
        inAppQueued: true,
        emailQueued: true,
        emailSuppressedReason: null,
      },
    },
  },
};

describe("EditPickupModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateBookingPickup.mockResolvedValue(saved);
  });

  it("shows the customer's canonical address, not the legacy place label alone", () => {
    render(<EditPickupModal booking={makeBooking()} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByText("12 Akuafo St, East Legon, Accra")).toBeInTheDocument();
    expect(screen.getByText("Zone: East Legon")).toBeInTheDocument();
    expect(screen.getByText(/Confirmed by supplier/)).toBeInTheDocument();
  });

  it("saves a time-only change without touching the customer's location", async () => {
    const onSaved = vi.fn();
    render(<EditPickupModal booking={makeBooking()} onClose={vi.fn()} onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText("Pickup time"), { target: { value: "09:30" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateBookingPickup).toHaveBeenCalledWith("b1", { pickupTime: "09:30" }));
    expect(onSaved).toHaveBeenCalled();
  });

  it("sends the canonical address and clears stale labels when the supplier moves the point", async () => {
    render(<EditPickupModal booking={makeBooking()} onClose={vi.fn()} onSaved={vi.fn()} />);

    fireEvent.click(screen.getByRole("radio", { name: /change pickup/i }));
    fireEvent.click(screen.getByRole("button", { name: "Pick map point" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(updateBookingPickup).toHaveBeenCalledWith("b1", {
        pickupAddress: {
          name: "New Place",
          address: "New Place, Accra",
          lat: 5.7,
          lng: -0.1,
        },
        areaName: "",
        locationName: "",
        pickupPlace: "",
      })
    );
  });

  it("really keeps the customer's point after the supplier explores a new one", async () => {
    render(<EditPickupModal booking={makeBooking()} onClose={vi.fn()} onSaved={vi.fn()} />);

    fireEvent.click(screen.getByRole("radio", { name: /change pickup/i }));
    fireEvent.click(screen.getByRole("button", { name: "Pick map point" }));
    fireEvent.click(screen.getByRole("radio", { name: /keep customer/i }));
    fireEvent.change(screen.getByLabelText("Pickup time"), { target: { value: "09:30" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(updateBookingPickup).toHaveBeenCalledWith("b1", { pickupTime: "09:30" })
    );
  });

  it("explains that a pay-later booking's email is held, matching the API flags", async () => {
    updateBookingPickup.mockResolvedValue({
      data: {
        data: {
          pickupNotification: {
            changed: true,
            inAppQueued: true,
            emailQueued: false,
            emailSuppressedReason: "AWAITING_PAYMENT",
          },
        },
      },
    });
    render(
      <EditPickupModal
        booking={makeBooking({ paymentTiming: "later", paymentStatus: "PENDING" })}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("Pickup time"), { target: { value: "09:30" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Pickup saved. Customer notified in the app; email will send after payment."
      )
    );
  });

  it("is read-only for a cancelled booking", () => {
    render(
      <EditPickupModal
        booking={makeBooking({ status: "CANCELLED" })}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    expect(screen.getByText(/can no longer be edited/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });
});
