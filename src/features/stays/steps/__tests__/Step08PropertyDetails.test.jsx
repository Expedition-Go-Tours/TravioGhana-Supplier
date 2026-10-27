/**
 * STEP 10 — Property details: sleeping rows with add/remove, the guest and
 * bathroom counters, the children/cots questions and the optional size.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Step08PropertyDetails from "../Step08PropertyDetails";

function renderStep({ overrides = {}, saving = false } = {}) {
  const patch = vi.fn();
  const onBack = vi.fn();
  const onNext = vi.fn();
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(
    <Step08PropertyDetails
      property={{ type: "Apartment", ...overrides }}
      patch={patch}
      onBack={onBack}
      onNext={onNext}
      onSave={onSave}
      saving={saving}
    />,
  );
  return { patch, onBack, onNext, onSave };
}

describe("Step08PropertyDetails — the reference page", () => {
  it("renders the default sleeping arrangement, counters and questions", () => {
    renderStep();

    expect(screen.getByText("Property details")).toBeTruthy();
    expect(screen.getByText("Where can people sleep?")).toBeTruthy();
    expect(screen.getByText("Bedroom 1")).toBeTruthy();
    expect(screen.getByText("1 double bed")).toBeTruthy();
    expect(screen.getByText("Living room")).toBeTruthy();
    expect(screen.getByText("Other spaces")).toBeTruthy();
    expect(screen.getAllByText("0 beds")).toHaveLength(2);
    expect(screen.getByText("Double beds")).toBeTruthy();
    expect(screen.getByText("Single beds")).toBeTruthy();

    expect(screen.getByText("How many guests can stay?")).toBeTruthy();
    expect(screen.getByText("How many bathrooms are there?")).toBeTruthy();
    expect(screen.getByText("Do you allow children?")).toBeTruthy();
    expect(screen.getByText("Do you offer cots?")).toBeTruthy();
    expect(screen.getByText("How big is this apartment?")).toBeTruthy();
    expect(screen.getByText("Apartment size – optional")).toBeTruthy();
    expect(screen.getByText("Description")).toBeTruthy();
    expect(screen.getByLabelText("Short description")).toBeTruthy();
    expect(screen.getByLabelText("Full description")).toBeTruthy();
  });

  it("records the short and full property descriptions", async () => {
    const { patch } = renderStep();

    fireEvent.change(screen.getByLabelText("Short description"), {
      target: { value: "Garden villa" },
    });
    expect(patch.mock.calls.at(-1)[0]).toEqual({ shortDescription: "Garden villa" });

    fireEvent.change(screen.getByLabelText("Full description"), {
      target: { value: "A quiet stay near the coast." },
    });
    expect(patch.mock.calls.at(-1)[0]).toEqual({ description: "A quiet stay near the coast." });
  });

  it("adds and removes bedrooms through patch", async () => {
    const user = userEvent.setup();
    const { patch } = renderStep();

    await user.click(screen.getByRole("button", { name: /add bedroom/i }));
    const added = patch.mock.calls.at(-1)[0].sleeping.bedrooms;
    expect(added).toHaveLength(2);
    expect(added[1].name).toBe("Bedroom 2");
    expect(added[1].doubleBeds).toBe(1);

    patch.mockClear();
    await user.click(screen.getByRole("button", { name: "Remove Bedroom 1" }));
    expect(patch.mock.calls[0][0].sleeping.bedrooms).toHaveLength(0);
  });

  it("adds double and single beds to a bedroom and the shared spaces", async () => {
    const user = userEvent.setup();
    const { patch } = renderStep();

    await user.click(screen.getByRole("button", { name: "Increase double beds in Bedroom 1" }));
    expect(patch.mock.calls.at(-1)[0].sleeping.bedrooms[0].doubleBeds).toBe(2);

    await user.click(screen.getByRole("button", { name: "Increase single beds in Bedroom 1" }));
    expect(patch.mock.calls.at(-1)[0].sleeping.bedrooms[0].singleBeds).toBe(1);

    await user.click(screen.getByRole("button", { name: "Increase living room beds" }));
    expect(patch.mock.calls.at(-1)[0].sleeping.livingRoomBeds).toBe(1);

    await user.click(screen.getByRole("button", { name: "Increase other space beds" }));
    expect(patch.mock.calls.at(-1)[0].sleeping.otherSpacesBeds).toBe(1);
  });

  it("adjusts the guest and bathroom counters", async () => {
    const user = userEvent.setup();
    const { patch } = renderStep();

    await user.click(screen.getByRole("button", { name: "Decrease guests" }));
    expect(patch).toHaveBeenCalledWith({ maxGuests: 1 });

    await user.click(screen.getByRole("button", { name: "Increase bathrooms" }));
    expect(patch).toHaveBeenCalledWith({ bathrooms: 2 });
  });

  it("records the children and cots answers in the policy vocabulary", async () => {
    const user = userEvent.setup();
    const { patch } = renderStep();

    await user.click(screen.getAllByRole("radio", { name: "No" })[0]);
    expect(patch).toHaveBeenCalledWith({ children: "Adults only" });

    await user.click(screen.getAllByRole("radio", { name: "Yes" })[1]);
    expect(patch).toHaveBeenCalledWith({ cots: "Available" });
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
