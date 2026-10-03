/**
 * STEP 6 — Photos: the reference layout (heading, upload card, dismissible
 * tips card, back-arrow + Continue footer) with the 5-photo minimum gating
 * Continue and the footer saving the draft before advancing.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Step03Photos from "../Step03Photos";

const PHOTO = "data:image/png;base64,iVBORw0KGgo=";

function renderStep({
  overrides = {},
  saving = false,
} = {}) {
  const onAddPhotos = vi.fn().mockResolvedValue(undefined);
  const onRemovePhoto = vi.fn().mockResolvedValue(undefined);
  const onBack = vi.fn();
  const onNext = vi.fn();
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(
    <Step03Photos
      property={{ photos: [], ...overrides }}
      onAddPhotos={onAddPhotos}
      onRemovePhoto={onRemovePhoto}
      onBack={onBack}
      onNext={onNext}
      onSave={onSave}
      saving={saving}
    />,
  );
  return { onAddPhotos, onRemovePhoto, onBack, onNext, onSave };
}

describe("Step03Photos — the upload step", () => {
  it("renders the reference layout", () => {
    renderStep();

    expect(screen.getByText("What does your place look like?")).toBeTruthy();
    expect(screen.getByText("Upload at least 5 photos of your property.")).toBeTruthy();
    expect(screen.getByText(/The more you upload/)).toBeTruthy();
    expect(screen.getByText("Drag and drop or")).toBeTruthy();
    expect(screen.getByRole("button", { name: /upload photos/i })).toBeTruthy();
    expect(screen.getByText("jpg/jpeg or png, maximum 2MB each")).toBeTruthy();

    expect(screen.getByText("What if I don't have professional photos?")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /here are some tips for taking great photos/i }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /dismiss photo tips/i })).toBeTruthy();
  });

  it("keeps Continue disabled until five photos are uploaded", () => {
    renderStep({ overrides: { photos: [PHOTO, PHOTO, PHOTO, PHOTO] } });
    expect(screen.getByRole("button", { name: "Continue" }).disabled).toBe(true);
  });

  it("enables Continue with five photos and saves before advancing", async () => {
    const user = userEvent.setup();
    const { onNext, onSave } = renderStep({
      overrides: { photos: [PHOTO, PHOTO, PHOTO, PHOTO, PHOTO] },
    });

    const continueButton = screen.getByRole("button", { name: "Continue" });
    expect(continueButton.disabled).toBe(false);

    await user.click(continueButton);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onSave.mock.invocationCallOrder[0]).toBeLessThan(onNext.mock.invocationCallOrder[0]);
  });

  it("shows the uploaded photos with a cover badge and removes through the callback", async () => {
    const user = userEvent.setup();
    const { onRemovePhoto } = renderStep({ overrides: { photos: [PHOTO, PHOTO] } });

    expect(screen.getByText("Cover")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Remove photo 2" }));
    expect(onRemovePhoto).toHaveBeenCalledWith(1);
  });

  it("dismisses the tips card", async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByRole("button", { name: /dismiss photo tips/i }));

    expect(screen.queryByText("What if I don't have professional photos?")).toBeNull();
  });

  it("goes back through the builder", async () => {
    const user = userEvent.setup();
    const { onBack } = renderStep();

    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
