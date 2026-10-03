/**
 * STEP 12 — Services: the Breakfast and Parking cards with the reference
 * answers and the save-before-advance footer.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Step10Services from "../Step10Services";

function renderStep({ services = { breakfast: "No", parking: "No" }, saving = false } = {}) {
  const patch = vi.fn();
  const onBack = vi.fn();
  const onNext = vi.fn();
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(
    <Step10Services
      property={{ services }}
      patch={patch}
      onBack={onBack}
      onNext={onNext}
      onSave={onSave}
      saving={saving}
    />,
  );
  return { patch, onBack, onNext, onSave };
}

describe("Step10Services — services at your property", () => {
  it("renders the Breakfast and Parking cards", () => {
    renderStep();

    expect(screen.getByText("Services at your property")).toBeTruthy();
    expect(screen.getByText("Breakfast")).toBeTruthy();
    expect(screen.getByText("Do you serve guests breakfast?")).toBeTruthy();
    expect(screen.getByText("Parking")).toBeTruthy();
    expect(screen.getByText("Is parking available to guests?")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Yes" })).toBeTruthy();
    expect(screen.getAllByRole("radio", { name: "No" })).toHaveLength(2);
    expect(screen.getByRole("radio", { name: "Yes, free" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Yes, paid" })).toBeTruthy();
  });

  it("records the breakfast and parking answers", async () => {
    const user = userEvent.setup();
    const { patch } = renderStep();

    await user.click(screen.getByRole("radio", { name: "Yes" }));
    expect(patch).toHaveBeenCalledWith({ services: { breakfast: "Yes", parking: "No" } });

    await user.click(screen.getByRole("radio", { name: "Yes, free" }));
    expect(patch).toHaveBeenCalledWith({ services: { breakfast: "No", parking: "Yes, free" } });
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
