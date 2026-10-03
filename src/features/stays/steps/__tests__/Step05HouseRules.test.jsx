/**
 * STEP 7 — House rules: the reference layout (heading, switch/radio/time
 * card, dismissible tips card, back-arrow + Continue footer). The switches
 * map onto the existing policy vocabulary and the footer saves before
 * advancing.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Step05HouseRules from "../Step05HouseRules";

function renderStep({ overrides = {}, saving = false } = {}) {
  const patch = vi.fn();
  const onBack = vi.fn();
  const onNext = vi.fn();
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(
    <Step05HouseRules
      property={{
        pets: "Not allowed",
        smoking: "No smoking",
        parties: "Not allowed",
        checkin: "14:00",
        checkinEnd: "18:00",
        checkoutStart: "08:00",
        checkout: "11:00",
        ...overrides,
      }}
      patch={patch}
      onBack={onBack}
      onNext={onNext}
      onSave={onSave}
      saving={saving}
    />,
  );
  return { patch, onBack, onNext, onSave };
}

describe("Step05HouseRules — the reference page", () => {
  it("renders the reference layout", () => {
    renderStep();

    expect(screen.getByText("House rules")).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Smoking allowed" })).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Parties/events allowed" })).toBeTruthy();

    expect(screen.getByText("Do you allow pets?")).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "No" }).checked).toBe(true);

    expect(screen.getByText("Check in")).toBeTruthy();
    expect(screen.getByText("Check out")).toBeTruthy();
    expect(screen.getAllByText("From")).toHaveLength(2);
    expect(screen.getAllByText("Until")).toHaveLength(2);

    expect(screen.getByText("What if my house rules change?")).toBeTruthy();
  });

  it("records the smoking switch through the policy vocabulary", async () => {
    const user = userEvent.setup();
    const { patch } = renderStep();

    await user.click(screen.getByRole("switch", { name: "Smoking allowed" }));

    expect(patch).toHaveBeenCalledWith({ smoking: "Allowed" });
  });

  it("records the parties switch and the pets answer", async () => {
    const user = userEvent.setup();
    const { patch } = renderStep();

    await user.click(screen.getByRole("switch", { name: "Parties/events allowed" }));
    expect(patch).toHaveBeenCalledWith({ parties: "Allowed" });

    await user.click(screen.getByText("Upon request"));
    expect(patch).toHaveBeenCalledWith({ pets: "On request" });
  });

  it("keeps an already-allowed rule switched on", () => {
    renderStep({ overrides: { smoking: "Allowed", parties: "Allowed" } });

    expect(screen.getByRole("switch", { name: "Smoking allowed" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("switch", { name: "Parties/events allowed" }).getAttribute("aria-checked")).toBe("true");
  });

  it("dismisses the tips card", async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByRole("button", { name: /dismiss house rules tips/i }));

    expect(screen.queryByText("What if my house rules change?")).toBeNull();
  });

  it("saves the draft before continuing", async () => {
    const user = userEvent.setup();
    const { onNext, onSave } = renderStep();

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onSave.mock.invocationCallOrder[0]).toBeLessThan(
      onNext.mock.invocationCallOrder[0],
    );
  });

  it("goes back through the builder", async () => {
    const user = userEvent.setup();
    const { onBack } = renderStep();

    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
