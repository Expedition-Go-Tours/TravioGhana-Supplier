import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fireEvent } from "@testing-library/react";
import RefundClaimDecisionModal from "./RefundClaimDecisionModal";

const claim = {
  id: "clm_1",
  claimNumber: "RCL-100042",
  type: "FULL",
  reason: "GUIDE_ISSUE",
  details: "Our guide arrived two hours late.",
  requestedAmount: 0,
  status: "SUBMITTED",
  createdAt: "2026-09-01T10:00:00.000Z",
  booking: {
    bookingNumber: "EXP-123456",
    total: 450,
    currency: "USD",
    customerName: "Ama Serwaa",
    customerEmail: "ama@example.com",
    tourTitle: "Cape Coast Castle Day Trip",
  },
};

const renderModal = (props = {}) => {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  const utils = render(
    <RefundClaimDecisionModal
      claim={claim}
      mode="approve"
      submitting={false}
      onClose={onClose}
      onConfirm={onConfirm}
      {...props}
    />
  );
  return { onClose, onConfirm, ...utils };
};

describe("RefundClaimDecisionModal", () => {
  it("renders the approval summary and confirms once", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal();

    expect(screen.getByRole("dialog", { name: "Approve refund request" })).toBeInTheDocument();
    expect(screen.getByText("Approve refund request?")).toBeInTheDocument();
    expect(screen.getAllByText(/Ama Serwaa/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Cape Coast Castle Day Trip")).toBeInTheDocument();
    expect(screen.getByText("Full refund")).toBeInTheDocument();
    expect(screen.getByText(/RCL-100042/)).toBeInTheDocument();
    expect(screen.getByText("Guide or host issue")).toBeInTheDocument();
    expect(screen.getAllByText(/\$450\.00/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Approve & forward" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disables controls and ignores Escape/backdrop while submitting", () => {
    const { onClose } = renderModal({ submitting: true });

    expect(screen.getByRole("button", { name: "Approve & forward" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes via Escape when idle", () => {
    const { onClose } = renderModal();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes via Cancel without confirming", async () => {
    const user = userEvent.setup();
    const { onClose, onConfirm } = renderModal();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("closes via backdrop click when idle", () => {
    const { container, onClose } = renderModal();
    fireEvent.click(container.firstChild);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("decline mode requires a reason before confirming and passes it through", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal({ mode: "decline" });

    expect(screen.getByRole("dialog", { name: "Decline refund request" })).toBeInTheDocument();
    const declineBtn = screen.getByRole("button", { name: "Decline request" });
    expect(declineBtn).toBeDisabled();

    const note = "The refund policy does not cover this case.";
    await user.type(screen.getByPlaceholderText(/Explain the decision/), note);
    expect(declineBtn).toBeEnabled();

    await user.click(declineBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(note);
  });
});
