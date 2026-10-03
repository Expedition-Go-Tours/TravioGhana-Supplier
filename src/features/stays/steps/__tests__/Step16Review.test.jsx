/**
 * The closing screen: the reassurance questions, the two certifications
 * gating "Open for bookings", and the "I'm not ready" exit.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Step16Review from "../Step16Review";

function renderStep({ agreement = {}, submitting = false } = {}) {
  const patch = vi.fn();
  const onSubmit = vi.fn();
  const onExit = vi.fn();
  render(
    <Step16Review
      property={{ agreement }}
      patch={patch}
      onSubmit={onSubmit}
      onExit={onExit}
      submitting={submitting}
    />,
  );
  return { patch, onSubmit, onExit };
}

describe("Step16Review — open for bookings", () => {
  it("shows the closing copy and the three questions", () => {
    renderStep();

    expect(
      screen.getByText(
        "That's it! You've done everything you need to before your first guest stays.",
      ),
    ).toBeTruthy();
    expect(screen.getByText(/Some important information/)).toBeTruthy();
    expect(screen.getByText("Can I decide when I get bookings?")).toBeTruthy();
    expect(screen.getByText("Are bookings confirmed straight away?")).toBeTruthy();
    expect(screen.getByText("Can I choose who stays at my place?")).toBeTruthy();
    expect(screen.getByText("I'm not ready")).toBeTruthy();
  });

  it("keeps Open for bookings disabled until both certifications are checked", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderStep();

    const open = screen.getByRole("button", { name: "Open for bookings" });
    expect(open.disabled).toBe(true);
    await user.click(open);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("enables Open for bookings with both certifications and submits", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderStep({
      agreement: { certifyBusiness: true, certifyTerms: true },
    });

    const open = screen.getByRole("button", { name: "Open for bookings" });
    expect(open.disabled).toBe(false);
    await user.click(open);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("records a certification through patch", async () => {
    const user = userEvent.setup();
    const { patch } = renderStep();

    await user.click(screen.getByText(/I certify that this is a legitimate/));

    expect(patch).toHaveBeenCalledWith({
      agreement: expect.objectContaining({ certifyBusiness: true }),
    });
  });

  it("exits through I'm not ready", async () => {
    const user = userEvent.setup();
    const { onExit } = renderStep();

    await user.click(screen.getByText("I'm not ready"));

    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
