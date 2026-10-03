/**
 * STEP 13 — How you receive bookings: the safety list, the instant/request
 * choice with the Recommended tag, and the request-mode explanation and
 * warning panels.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Step11BookingPreference from "../Step11BookingPreference";

function renderStep({ bookingPreference, saving = false } = {}) {
  const patch = vi.fn();
  const onBack = vi.fn();
  const onNext = vi.fn();
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(
    <Step11BookingPreference
      property={{ type: "Apartment", bookingPreference }}
      patch={patch}
      onBack={onBack}
      onNext={onNext}
      onSave={onSave}
      saving={saving}
    />,
  );
  return { patch, onBack, onNext, onSave };
}

describe("Step11BookingPreference — how you receive bookings", () => {
  it("renders the safety list and the instant choice by default", () => {
    renderStep();

    expect(screen.getByText("How you receive bookings")).toBeTruthy();
    expect(screen.getByText(/We're here to ensure you can receive bookings safely/)).toBeTruthy();
    expect(screen.getByText(/Set house rules guest must agree to before they stay/)).toBeTruthy();
    expect(screen.getByText("How can guests book your apartment?")).toBeTruthy();
    expect(screen.getByText("Recommended")).toBeTruthy();
    expect(screen.getByRole("radio", { name: /book instantly/ }).checked).toBe(true);
  });

  it("shows the enquiry/request explanation and warning only for request mode", () => {
    renderStep({ bookingPreference: "request" });

    expect(screen.getByText(/Guests searching for a stay more than 48 hours/)).toBeTruthy();
    expect(
      screen.getByText("Are you sure you want to require your guests to request to book?"),
    ).toBeTruthy();
    expect(screen.getByRole("radio", { name: /request to book$/ }).checked).toBe(true);
  });

  it("hides the explanation panels for instant bookings", () => {
    renderStep({ bookingPreference: "instant" });
    expect(screen.queryByText(/Guests searching for a stay more than 48 hours/)).toBeNull();
    expect(
      screen.queryByText("Are you sure you want to require your guests to request to book?"),
    ).toBeNull();
  });

  it("records the request choice through patch", async () => {
    const user = userEvent.setup();
    const { patch } = renderStep();

    await user.click(screen.getByText("All guests will need to request to book"));

    expect(patch).toHaveBeenCalledWith({ bookingPreference: "request" });
  });

  it("saves the draft before continuing and goes back", async () => {
    const user = userEvent.setup();
    const { onNext, onSave, onBack } = renderStep();

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
