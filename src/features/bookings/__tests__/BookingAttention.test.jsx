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

/**
 * The link block now answers the three questions a supplier actually has:
 * did it go out, how long is it good for, and may I send another one?
 */
describe("payment link state", () => {
  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;
  const iso = (msFromNow) => new Date(Date.now() + msFromNow).toISOString();

  const withLink = (link) =>
    attention({
      link: {
        state: "NONE",
        active: false,
        expiresAt: null,
        emailState: "NOT_SENT",
        lastEmailedAt: null,
        canSend: false,
        canResend: false,
        canRegenerate: false,
        canSendInChat: false,
        customerEmailOnFile: true,
        sentCount: 0,
        channels: { email: false, chat: false },
        nextResendAt: null,
        supersededAt: null,
        atTouchLimit: false,
        ...link,
      },
    });

  it("shows a sent link, counts it down, and holds the next resend", () => {
    render(
      <BookingAttentionPanel
        attention={{
          ...withLink({
            state: "SENT",
            active: true,
            emailState: "SENT",
            expiresAt: iso(90 * MINUTE),
            lastEmailedAt: iso(-3 * HOUR),
            sentCount: 1,
            channels: { email: true, chat: false },
            nextResendAt: iso(90 * MINUTE),
            canResend: true,
          }),
          actions: [{ code: "RESEND_PAYMENT_LINK", label: "Resend link" }],
        }}
        onAction={vi.fn()}
      />
    );

    expect(screen.getByText(/Payment link emailed/)).toBeInTheDocument();
    expect(screen.getByText(/expires in 1h 30m/)).toBeInTheDocument();
    expect(screen.getByText(/Payable until/)).toBeInTheDocument();
    expect(screen.getByText(/Next resend available in 1h 30m/)).toBeInTheDocument();

    // The resend button exists but is held until the cooldown passes.
    const resend = screen.getByRole("button", { name: /Resend link/i });
    expect(resend).toBeDisabled();
  });

  it("names the chat channel when the link went out on both", () => {
    render(
      <BookingAttentionPanel
        attention={withLink({
          state: "SENT",
          active: true,
          emailState: "SENT",
          expiresAt: iso(20 * HOUR),
          lastEmailedAt: iso(-MINUTE),
          sentCount: 2,
          channels: { email: true, chat: true },
        })}
        onAction={vi.fn()}
      />
    );

    expect(screen.getByText(/also posted in chat/)).toBeInTheDocument();
  });

  it("warns that a newer link replaced an older one", () => {
    render(
      <BookingAttentionPanel
        attention={withLink({
          state: "SENT",
          active: true,
          emailState: "SENT",
          expiresAt: iso(12 * HOUR),
          supersededAt: iso(-2 * HOUR),
        })}
        onAction={vi.fn()}
      />
    );

    expect(screen.getByText(/older link no longer works/)).toBeInTheDocument();
  });

  it("says an expired link can no longer be paid", () => {
    render(
      <BookingAttentionPanel
        attention={withLink({
          state: "EXPIRED",
          expiresAt: iso(-2 * HOUR),
          emailState: "SENT",
          lastEmailedAt: iso(-26 * HOUR),
        })}
        onAction={vi.fn()}
      />
    );

    expect(screen.getByText(/can no longer be paid/)).toBeInTheDocument();
  });

  it("announces a paid booking instead of a live link", () => {
    render(
      <BookingAttentionPanel
        attention={attention({
          payment: {
            confirmed: true,
            confirmationState: "CONFIRMED",
            amountDue: null,
            failureReason: null,
            failureCode: null,
            retrying: false,
            lastAttemptAt: iso(-20 * MINUTE),
          },
          link: withLink({ state: "PAID", active: false }).link,
        })}
        onAction={vi.fn()}
      />
    );

    expect(screen.getByText(/Paid/)).toBeInTheDocument();
    expect(screen.getByText(/receipt emailed/)).toBeInTheDocument();
  });

  it("blocks the buttons once the booking has hit its message ceiling", () => {
    render(
      <BookingAttentionPanel
        attention={{
          ...withLink({
            state: "SENT",
            active: true,
            emailState: "SENT",
            expiresAt: iso(6 * HOUR),
            sentCount: 5,
            atTouchLimit: true,
            canResend: true,
          }),
          actions: [{ code: "RESEND_PAYMENT_LINK", label: "Resend link" }],
        }}
        onAction={vi.fn()}
      />
    );

    expect(screen.getByText(/reached its payment-message limit/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Resend link/i })).toBeDisabled();
  });

  it("still renders the countdown from an older API that sends no state", () => {
    render(
      <BookingAttentionPanel
        attention={attention({
          link: {
            active: true,
            expiresAt: iso(3 * HOUR),
            emailState: "SENT",
            lastEmailedAt: iso(-HOUR),
            canSend: false,
            canResend: true,
            canRegenerate: false,
            canSendInChat: false,
            customerEmailOnFile: true,
          },
        })}
        onAction={vi.fn()}
      />
    );

    expect(screen.getByText(/Payment link emailed/)).toBeInTheDocument();
    expect(screen.getByText(/expires in 3h 0m/)).toBeInTheDocument();
  });
});
