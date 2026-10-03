/**
 * STEP 8 — Property name: the reference layout (heading, name card, two
 * dismissible tips cards, back-arrow + Continue footer). Continue stays
 * disabled until a name is typed and saves the draft before advancing.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Step06Identity from "../Step06Identity";

function renderStep({ overrides = {}, saving = false } = {}) {
  const patch = vi.fn();
  const onBack = vi.fn();
  const onNext = vi.fn();
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(
    <Step06Identity
      property={{ name: "", ...overrides }}
      patch={patch}
      onBack={onBack}
      onNext={onNext}
      onSave={onSave}
      saving={saving}
    />,
  );
  return { patch, onBack, onNext, onSave };
}

describe("Step06Identity — what's the name of your place", () => {
  it("renders the reference layout", () => {
    renderStep();

    expect(screen.getByText("What's the name of your place?")).toBeTruthy();
    expect(screen.getByLabelText("Property name")).toBeTruthy();

    expect(screen.getByText("What should I consider when choosing a name?")).toBeTruthy();
    expect(screen.getByText("Keep it short and catchy")).toBeTruthy();
    expect(screen.getByText("Avoid abbreviations")).toBeTruthy();
    expect(screen.getByText("Stick to the facts")).toBeTruthy();

    expect(screen.getByText("Why do I need to name my property?")).toBeTruthy();
    expect(screen.getByText(/This is the name that will appear as the title/)).toBeTruthy();
  });

  it("hides the 'Untitled property' placeholder from the name field", () => {
    renderStep({ overrides: { name: "Untitled property" } });
    expect(screen.getByLabelText("Property name").value).toBe("");
  });

  it("reports the name through patch", async () => {
    const user = userEvent.setup();
    const { patch } = renderStep();

    await user.type(screen.getByLabelText("Property name"), "A");

    expect(patch).toHaveBeenCalledWith({ name: "A" });
  });

  it("keeps Continue disabled until a name is typed", async () => {
    const user = userEvent.setup();
    const { onNext } = renderStep();

    expect(screen.getByRole("button", { name: "Continue" }).disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onNext).not.toHaveBeenCalled();
  });

  it("dismisses each tips card independently", async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByRole("button", { name: "Dismiss name tips" }));
    expect(screen.queryByText("What should I consider when choosing a name?")).toBeNull();
    expect(screen.getByText("Why do I need to name my property?")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Dismiss naming help" }));
    expect(screen.queryByText("Why do I need to name my property?")).toBeNull();
  });

  it("saves the draft before continuing", async () => {
    const user = userEvent.setup();
    const { onNext, onSave } = renderStep({ overrides: { name: "Akwaaba" } });

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
