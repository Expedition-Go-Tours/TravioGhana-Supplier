/**
 * STEP 6 — Languages: the reference layout (big heading, "Select languages"
 * card with the popular languages, divider and "Add additional languages"),
 * the reference footer, and saving the draft before advancing.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Step04Languages from "../Step04Languages";

function renderStep({ languages = [], saving = false } = {}) {
  const patch = vi.fn();
  const onBack = vi.fn();
  const onNext = vi.fn();
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(
    <Step04Languages
      property={{ languages }}
      patch={patch}
      onBack={onBack}
      onNext={onNext}
      onSave={onSave}
      saving={saving}
    />,
  );
  return { patch, onBack, onNext, onSave };
}

describe("Step04Languages — what languages do you speak", () => {
  it("renders the reference layout", () => {
    renderStep();

    expect(screen.getByText("What languages do you or your staff speak?")).toBeTruthy();
    expect(screen.getByText("Select languages")).toBeTruthy();

    for (const language of ["English", "French", "Italian", "Russian", "Spanish"]) {
      expect(screen.getByRole("checkbox", { name: language })).toBeTruthy();
    }
    expect(screen.getByRole("button", { name: "Add additional languages" })).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: "Twi" })).toBeNull();
  });

  it("toggles a primary language through patch", async () => {
    const user = userEvent.setup();
    const { patch } = renderStep();

    await user.click(screen.getByText("English"));

    expect(patch).toHaveBeenCalledWith({ languages: ["English"] });
  });

  it("reveals the additional languages on request", async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByRole("button", { name: "Add additional languages" }));

    for (const language of ["Twi", "Ewe", "Ga", "Hausa", "Arabic", "Chinese", "Other"]) {
      expect(screen.getByRole("checkbox", { name: language })).toBeTruthy();
    }
  });

  it("starts expanded when an additional language is already saved", () => {
    renderStep({ languages: ["Twi"] });

    expect(screen.getByRole("checkbox", { name: "Twi" }).checked).toBe(true);
    expect(screen.getByRole("button", { name: "Show fewer languages" })).toBeTruthy();
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
