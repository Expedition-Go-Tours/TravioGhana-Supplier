/**
 * STEP 17 — Rate plans: the four recommended plans with their summaries and
 * the Edit toggles that reveal the fields driving them.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Step14Rates from "../Step14Rates";

function renderStep({ overrides = {}, saving = false } = {}) {
  const patch = vi.fn();
  const onBack = vi.fn();
  const onNext = vi.fn();
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(
    <Step14Rates
      property={overrides}
      patch={patch}
      onBack={onBack}
      onNext={onNext}
      onSave={onSave}
      saving={saving}
    />,
  );
  return { patch, onBack, onNext, onSave };
}

describe("Step14Rates — rate plans", () => {
  it("renders the four recommended plans with their summaries", () => {
    renderStep();

    expect(screen.getByText("Rate plans")).toBeTruthy();
    expect(screen.getByText("Standard rate plan")).toBeTruthy();
    expect(screen.getByText("Cancellation policy")).toBeTruthy();
    expect(
      screen.getAllByText(/Guests can cancel their bookings for free up to 1 day before arrival/)
        .length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Price per group size")).toBeTruthy();
    expect(screen.getAllByText("GHS 29")).toHaveLength(1);
    expect(screen.getByText("GHS 26.1")).toBeTruthy();

    expect(screen.getByText("Child prices for families")).toBeTruthy();
    expect(screen.getByText("Children stay for free (up to 17 years old)")).toBeTruthy();

    expect(screen.getByText("Non-refundable rate plan")).toBeTruthy();
    expect(
      screen.getByText(/Guests will pay 10% less than the standard rate/),
    ).toBeTruthy();

    expect(screen.getByText("Weekly rate plan")).toBeTruthy();
    expect(
      screen.getByText(/Guests will pay 15% less than the standard rate when they book for at least 7 nights/),
    ).toBeTruthy();

    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(5);
  });

  it("reveals an editor and records the edited value", async () => {
    const user = userEvent.setup();
    const { patch } = renderStep();

    await user.click(screen.getAllByRole("button", { name: "Edit" })[3]);
    const discountInput = screen.getByDisplayValue("10");
    fireEvent.change(discountInput, { target: { value: "20" } });

    expect(patch).toHaveBeenCalled();
    const settings = patch.mock.calls.at(-1)[0].ratePlanSettings;
    expect(settings.nonRefundable.discount).toBe(20);
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
