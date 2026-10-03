/**
 * STEP 11 — Amenities: the grouped checklist, the at-least-one gate on
 * Continue and the save-before-advance footer.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Step09Amenities from "../Step09Amenities";

function renderStep({ facilities = [], saving = false } = {}) {
  const patch = vi.fn();
  const onBack = vi.fn();
  const onNext = vi.fn();
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(
    <Step09Amenities
      property={{ facilities }}
      patch={patch}
      onBack={onBack}
      onNext={onNext}
      onSave={onSave}
      saving={saving}
    />,
  );
  return { patch, onBack, onNext, onSave };
}

describe("Step09Amenities — what can guests use", () => {
  it("renders the grouped reference checklist", () => {
    renderStep();

    expect(screen.getByText("What can guests use at your place?")).toBeTruthy();
    for (const label of ["General", "Cooking and cleaning", "Entertainment", "Outside and view"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    for (const amenity of [
      "Air conditioning",
      "Free WiFi",
      "Kitchen",
      "Flat-screen TV",
      "Sauna",
      "Balcony",
      "View",
    ]) {
      expect(screen.getByRole("checkbox", { name: amenity })).toBeTruthy();
    }
  });

  it("keeps Continue disabled until one amenity is selected", () => {
    renderStep();
    expect(screen.getByRole("button", { name: "Continue" }).disabled).toBe(true);
  });

  it("toggles an amenity through patch", async () => {
    const user = userEvent.setup();
    const { patch } = renderStep({ facilities: ["Heating"] });

    await user.click(screen.getByRole("checkbox", { name: "Sauna" }));

    expect(patch).toHaveBeenCalledWith({ facilities: ["Heating", "Sauna"] });
  });

  it("saves the draft before continuing and goes back", async () => {
    const user = userEvent.setup();
    const { onNext, onSave, onBack } = renderStep({ facilities: ["Heating"] });

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
