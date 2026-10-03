/**
 * STEP 9 — Host profile: the reference layout (heading, intro, the property /
 * host / neighbourhood checkboxes and the exclusive "None of the above"),
 * with every box unchecked by default so fields only appear once selected.
 * The footer saves the draft before advancing.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Step07HostProfile from "../Step07HostProfile";

function renderStep({ overrides = {}, saving = false } = {}) {
  const patch = vi.fn();
  const onBack = vi.fn();
  const onNext = vi.fn();
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(
    <Step07HostProfile
      property={{ hostProfile: undefined, ...overrides }}
      patch={patch}
      onBack={onBack}
      onNext={onNext}
      onSave={onSave}
      saving={saving}
    />,
  );
  return { patch, onBack, onNext, onSave };
}

describe("Step07HostProfile — the reference page", () => {
  it("renders the reference layout with every checkbox unchecked", () => {
    renderStep();

    expect(screen.getByText("Host profile")).toBeTruthy();
    expect(screen.getByText(/Help your listing stand out/)).toBeTruthy();

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(4);
    expect(checkboxes.every((box) => !box.checked)).toBe(true);

    // The fields only appear once their section is ticked.
    expect(screen.queryByPlaceholderText(/What makes your place unique/)).toBeNull();
    expect(screen.queryByLabelText("Host name")).toBeNull();
    expect(screen.queryByPlaceholderText(/What's the area like/)).toBeNull();
  });

  it("reveals the property field and its counter when checked", () => {
    renderStep({
      overrides: {
        hostProfile: { property: { included: true, about: "Hello" } },
      },
    });

    expect(
      screen.getByPlaceholderText("What makes your place unique? What can guests expect?"),
    ).toBeTruthy();
    expect(screen.getByText("About the property")).toBeTruthy();
    expect(screen.getByText("5 / 1200")).toBeTruthy();
  });

  it("reveals the host fields with their counters when checked", () => {
    renderStep({
      overrides: {
        hostProfile: { host: { included: true, name: "Ama", about: "" } },
      },
    });

    expect(screen.getByLabelText("Host name").value).toBe("Ama");
    expect(screen.getByText("3 / 80")).toBeTruthy();
    expect(
      screen.getByPlaceholderText("What are your interests? What do you like about hosting?"),
    ).toBeTruthy();
  });

  it("reveals the neighbourhood field when checked", () => {
    renderStep({
      overrides: {
        hostProfile: { neighbourhood: { included: true, about: "" } },
      },
    });

    expect(
      screen.getByPlaceholderText("What's the area like? Are there any attractions nearby?"),
    ).toBeTruthy();
  });

  it("ticks a section through patch and clears the none choice", async () => {
    const user = userEvent.setup();
    const { patch } = renderStep({
      overrides: { hostProfile: { property: { included: false, about: "" }, none: true } },
    });

    await user.click(screen.getByText("The property"));

    expect(patch).toHaveBeenCalledWith({
      hostProfile: expect.objectContaining({
        none: false,
        property: expect.objectContaining({ included: true }),
      }),
    });
  });

  it("patches a field value once its section is open", async () => {
    const user = userEvent.setup();
    const { patch } = renderStep({
      overrides: { hostProfile: { property: { included: true, about: "" } } },
    });

    await user.type(
      screen.getByPlaceholderText("What makes your place unique? What can guests expect?"),
      "A",
    );

    expect(patch).toHaveBeenCalledWith({
      hostProfile: expect.objectContaining({
        property: expect.objectContaining({ about: "A" }),
      }),
    });
  });

  it("clears the three sections when None of the above is ticked", async () => {
    const user = userEvent.setup();
    const { patch } = renderStep({
      overrides: {
        hostProfile: {
          property: { included: true, about: "x" },
          host: { included: true, name: "Ama", about: "y" },
          neighbourhood: { included: true, about: "z" },
        },
      },
    });

    await user.click(screen.getByText("None of the above/I'll add these later"));

    const [{ hostProfile }] = patch.mock.calls[0];
    expect(hostProfile.none).toBe(true);
    expect(hostProfile.property.included).toBe(false);
    expect(hostProfile.host.included).toBe(false);
    expect(hostProfile.neighbourhood.included).toBe(false);
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
