/**
 * STEP 4 — the channel manager question: the reference card with the
 * explanation and two answers, "No" preselected, both choices recorded through
 * `patch`.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Step02ChannelManager from "../Step02ChannelManager";

function renderStep(overrides = {}) {
  const patch = vi.fn();
  const onBack = vi.fn();
  const onNext = vi.fn();
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(
    <Step02ChannelManager
      property={{ channelManager: { connected: false, name: "" }, ...overrides }}
      patch={patch}
      onBack={onBack}
      onNext={onNext}
      onSave={onSave}
      saving={false}
    />,
  );
  return { patch, onBack, onNext, onSave };
}

describe("Step02ChannelManager", () => {
  it("shows the page heading, the question, the explanation and both answers", () => {
    renderStep();

    expect(screen.getByText("Connect to a channel manager")).toBeTruthy();
    expect(
      screen.getByText("Do you want to connect this listing to your channel manager?"),
    ).toBeTruthy();
    expect(
      screen.getByText(/third-party tool that lets you manage rates and availability/i),
    ).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("preselects No, matching the reference", () => {
    renderStep();

    expect(
      screen.getByRole("radio", { name: /No, I won't be using a channel manager/i }).checked,
    ).toBe(true);
    expect(
      screen.getByRole("radio", { name: /Yes, I will connect this listing/i }).checked,
    ).toBe(false);
  });

  it("records Yes through patch", async () => {
    const user = userEvent.setup();
    const { patch } = renderStep();

    await user.click(screen.getByText(/Yes, I will connect this listing to my channel manager/));

    expect(patch).toHaveBeenCalledWith({ channelManager: { connected: true, name: "" } });
  });

  it("records No through patch", async () => {
    const user = userEvent.setup();
    const { patch } = renderStep({ channelManager: { connected: true, name: "Cloudbeds" } });

    await user.click(screen.getByText(/No, I won't be using a channel manager at this time/));

    expect(patch).toHaveBeenCalledWith({
      channelManager: { connected: false, name: "Cloudbeds" },
    });
  });

  it("shows the connect-later notice when Yes is selected", () => {
    renderStep({ channelManager: { connected: true, name: "" } });

    expect(screen.getByText(/only if you are already using a channel manager/i)).toBeTruthy();
    expect(
      screen.getByText(/connect your channel manager after your registration is complete/i),
    ).toBeTruthy();
  });

  it("hides the notice when Yes is not the saved answer", () => {
    renderStep({ channelManager: { connected: false, name: "" } });
    expect(screen.queryByText(/only if you are already using a channel manager/i)).toBeNull();
  });

  it("saves the draft before continuing to the next step", async () => {
    const user = userEvent.setup();
    const { onNext, onSave } = renderStep();

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onSave.mock.invocationCallOrder[0]).toBeLessThan(
      onNext.mock.invocationCallOrder[0],
    );
  });

  it("still advances when the save fails, like the standard footer", async () => {
    const user = userEvent.setup();
    const { onNext, onSave } = renderStep();
    onSave.mockRejectedValueOnce(new Error("offline"));

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("goes back through the builder", async () => {
    const user = userEvent.setup();
    const { onBack } = renderStep();

    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
