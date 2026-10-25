import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../api", () => ({
  newPaymentLinkIdempotencyKey: () => "idem-test-1",
}));

import BookingAttentionPanel, { AttentionBadge } from "../components/BookingAttention";

const attention = (over = {}) => ({
  level: "ACTION_REQUIRED",
  code: "PAYMENT_ACTION_REQUIRED",
  reasonCode: "AUTHENTICATION_REQUIRED",
  title: "Payment not confirmed",
  message: "Payment has not been confirmed for this reservation.",
  nextStep: "Send the customer a new secure payment link so they can pay with another card.",
  deadlineAt: "2026-11-01T07:00:00.000Z",
  payment: {
    confirmed: false,
    confirmationState: "UNCONFIRMED",
    amountDue: { amount: 120, currency: "USD" },
    failureReason: "The customer must verify the payment with their bank (3D Secure).",
    failureCode: "AUTHENTICATION_REQUIRED",
    retrying: false,
    lastAttemptAt: null,
  },
  link: {
    active: false,
    expiresAt: null,
    emailState: "NOT_SENT",
    lastEmailedAt: null,
    canSend: true,
    canResend: false,
    canRegenerate: false,
    canSendInChat: true,
    customerEmailOnFile: true,
  },
  actions: [{ code: "SEND_PAYMENT_LINK", label: "Send payment link" }],
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("booking attention", () => {
  it("renders a persistent labelled badge without claiming payment", () => {
    render(<AttentionBadge attention={attention({ level: "WARNING", code: "RESERVATION_AT_RISK" })} />);
    const badge = screen.getByLabelText(/Payment at risk/i);
    expect(badge).toHaveTextContent("Payment at risk");
    expect(badge).not.toHaveTextContent(/paid/i);
  });

  it("shows the server reason and sends the chat preference with one idempotency key", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn().mockResolvedValue({
      paymentLink: { emailState: "QUEUED" },
    });
    render(<BookingAttentionPanel attention={attention()} onAction={onAction} />);

    expect(screen.getByText(/3D Secure/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Not confirmed/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("checkbox", { name: /Also post the link in chat/i }));
    await user.click(screen.getByRole("button", { name: "Send payment link" }));

    await waitFor(() => expect(onAction).toHaveBeenCalledTimes(1));
    expect(onAction).toHaveBeenCalledWith({
      action: "SEND_PAYMENT_LINK",
      sendInChat: true,
      idempotencyKey: "idem-test-1",
    });
    expect(await screen.findByText(/queued/i)).toBeInTheDocument();
    expect(screen.queryByText(/paid in full/i)).toBeNull();
  });

  it("requires confirmation before replacing a live link", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn().mockResolvedValue({});
    render(
      <BookingAttentionPanel
        attention={attention({
          link: {
            ...attention().link,
            active: true,
            emailState: "SENT",
            canSend: false,
            canResend: true,
            canRegenerate: true,
            canSendInChat: false,
          },
          actions: [
            { code: "RESEND_PAYMENT_LINK", label: "Resend payment link" },
            { code: "REGENERATE_PAYMENT_LINK", label: "Generate new link" },
          ],
        })}
        onAction={onAction}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Generate new link" }));
    expect(onAction).not.toHaveBeenCalled();
    expect(screen.getByText(/old link stops working immediately/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Yes, replace it/i }));
    await waitFor(() => expect(onAction).toHaveBeenCalledWith(expect.objectContaining({
      action: "REGENERATE_PAYMENT_LINK",
    })));
  });

  it("treats a network failure as unconfirmed and tells the supplier to refresh", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn().mockRejectedValue(new Error("Network Error"));
    render(<BookingAttentionPanel attention={attention()} onAction={onAction} onRefresh={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Send payment link" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /could not confirm whether the payment link action completed/i,
    );
    expect(screen.getByRole("button", { name: /Refresh booking/i })).toBeInTheDocument();
  });

  it("does not render actions the server did not permit", () => {
    render(
      <BookingAttentionPanel
        attention={attention({
          actions: [],
          link: { ...attention().link, canSend: false, canResend: false, canRegenerate: false, canSendInChat: false },
        })}
        onAction={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: /payment link/i })).toBeNull();
  });
});
