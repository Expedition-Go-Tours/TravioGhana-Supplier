/**
 * STEP 18 — Availability: the first-date choice, the calendar window, the
 * import/skip sync and the 30+ nights question that gates Continue.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Step15Availability from "../Step15Availability";

function renderStep({ overrides = {}, saving = false } = {}) {
  const patch = vi.fn();
  const onBack = vi.fn();
  const onNext = vi.fn();
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(
    <Step15Availability
      property={{ startMode: "asap", calendarWindow: "365 days", calendarImport: { mode: "import", url: "" }, ...overrides }}
      patch={patch}
      onBack={onBack}
      onNext={onNext}
      onSave={onSave}
      saving={saving}
    />,
  );
  return { patch, onBack, onNext, onSave };
}

describe("Step15Availability — availability", () => {
  it("renders the reference cards with the reference defaults", () => {
    renderStep();

    expect(screen.getByText("Availability")).toBeTruthy();
    expect(screen.getByText("When is the first date that guests can check in?")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "As soon as possible" }).checked).toBe(true);
    expect(screen.getByRole("radio", { name: "On a specific date" }).checked).toBe(false);

    expect(screen.getByText("How far in advance do you want to keep your calendar bookable?")).toBeTruthy();
    expect(screen.getByText("Show availability for up to:")).toBeTruthy();
    expect(screen.getByText("365 days")).toBeTruthy();

    expect(screen.getByRole("radio", { name: /Import availability calendar/ }).checked).toBe(true);
    expect(screen.getByLabelText("Paste your calendar link here")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Import" }).disabled).toBe(true);
    expect(screen.getByRole("radio", { name: "Skip" }).checked).toBe(false);

    expect(screen.getByText("Do you want to allow 30+ night stays?")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Yes" }).checked).toBe(false);
    expect(screen.getByRole("radio", { name: "No" }).checked).toBe(false);
    expect(screen.getByRole("button", { name: "Continue" }).disabled).toBe(true);

    expect(
      screen.getAllByText("Where to find calendar links").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("What if I want to change my selection later on?")).toBeTruthy();
  });

  it("reveals the date field for a specific first date", () => {
    renderStep({ overrides: { startMode: "date" } });
    expect(screen.getByLabelText("First date guests can check in")).toBeTruthy();
  });

  it("records the long-stays answer through patch", async () => {
    const user = userEvent.setup();
    const { patch } = renderStep();

    await user.click(screen.getByRole("radio", { name: "Yes" }));
    expect(patch).toHaveBeenCalledWith({ longStays: "yes" });
  });

  it("enables Continue once the 30+ nights question is answered", () => {
    renderStep({ overrides: { longStays: "yes" } });
    expect(screen.getByRole("button", { name: "Continue" }).disabled).toBe(false);
  });

  it("records the import URL and the skip choice", async () => {
    const user = userEvent.setup();
    const { patch } = renderStep();

    await user.type(screen.getByLabelText("Paste your calendar link here"), "x");
    expect(patch).toHaveBeenCalledWith({ calendarImport: { mode: "import", url: "x" } });

    await user.click(screen.getByRole("radio", { name: "Skip" }));
    expect(patch).toHaveBeenCalledWith({ calendarImport: { mode: "skip", url: "" } });
  });

  it("saves the draft before continuing and goes back", async () => {
    const user = userEvent.setup();
    const { onNext, onSave, onBack } = renderStep({ overrides: { longStays: "yes" } });

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
