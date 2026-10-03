/**
 * STEP 16 — Price per night: the competitive range, the nightly price with
 * the commission/earnings breakdown, and the 20% launch promotion.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Step13PricePerNight from "../Step13PricePerNight";

function renderStep({ overrides = {}, saving = false } = {}) {
  const patch = vi.fn();
  const onBack = vi.fn();
  const onNext = vi.fn();
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(
    <Step13PricePerNight
      property={{ pricePerNight: "29.00", currency: "GHS", promotion: true, ...overrides }}
      patch={patch}
      onBack={onBack}
      onNext={onNext}
      onSave={onSave}
      saving={saving}
    />,
  );
  return { patch, onBack, onNext, onSave };
}

describe("Step13PricePerNight — price per night", () => {
  it("renders the range, the price field and the promotion", () => {
    renderStep();

    expect(screen.getByText("Price per night")).toBeTruthy();
    expect(screen.getByText("Median: GHS 402")).toBeTruthy();
    expect(screen.getByText("GHS 120")).toBeTruthy();
    expect(screen.getByText("GHS 673")).toBeTruthy();

    expect(screen.getByLabelText("Price guests pay")).toBeTruthy();
    expect(screen.getByDisplayValue("29.00")).toBeTruthy();
    expect(screen.getByText(/Including taxes, commission and charges/)).toBeTruthy();
    expect(screen.getByText("GHS 24.65")).toBeTruthy();
    expect(screen.getByText("Currency you receive payments in")).toBeTruthy();
    expect(screen.getAllByText("GHS").length).toBeGreaterThan(0);
    expect(screen.getByText(/Your earnings \(including taxes\)/)).toBeTruthy();

    expect(
      screen.getByRole("checkbox", { name: /Get guests' attention with a 20% discount/ }).checked,
    ).toBe(true);
    expect(screen.getByText(/GHS 23\.2 per night/)).toBeTruthy();
  });

  it("formats the whole step in the chosen payout currency", () => {
    renderStep({ overrides: { currency: "USD" } });

    expect(screen.getByText("Median: USD 402")).toBeTruthy();
    expect(screen.getByText("USD 24.65")).toBeTruthy();
    expect(screen.getByText(/USD 23\.2 per night/)).toBeTruthy();
  });

  it("records a typed price and toggles the promotion", async () => {
    const user = userEvent.setup();
    const { patch } = renderStep();

    fireEvent.change(screen.getByLabelText("Price guests pay"), { target: { value: "35" } });
    expect(patch).toHaveBeenCalledWith({ pricePerNight: "35" });

    await user.click(screen.getByRole("checkbox", { name: /20% discount/ }));
    expect(patch).toHaveBeenCalledWith({ promotion: false });
  });

  it("dismisses the tips cards independently", async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByRole("button", { name: "Dismiss price tips" }));
    expect(screen.queryByText("What if I'm not sure about my price?")).toBeNull();
    expect(screen.getByText("Rules for setting up a promotion")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Dismiss promotion tips" }));
    expect(screen.queryByText("Rules for setting up a promotion")).toBeNull();
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
