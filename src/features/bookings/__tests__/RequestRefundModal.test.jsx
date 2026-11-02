import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const fetchRefundQuote = vi.fn();
const createRefundRequest = vi.fn();

vi.mock("../api", async (importOriginal) => ({
  ...(await importOriginal()),
  fetchRefundQuote: (...args) => fetchRefundQuote(...args),
  createRefundRequest: (...args) => createRefundRequest(...args),
  newRefundRequestIdempotencyKey: () => "test-idempotency-key",
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import RequestRefundModal from "../components/RequestRefundModal";

const booking = {
  id: "b1",
  bookingNumber: "BK-1042",
  tourName: "Cape Coast Castle Heritage Walk",
  travelDate: "2026-10-30T00:00:00.000Z",
  grossAmount: 900,
  currency: "USD",
  leadTravelerName: "Ama Boateng",
};

const quote = (overrides = {}) => ({
  booking: {
    id: "b1",
    bookingNumber: "BK-1042",
    status: "COMPLETED",
    travelDate: "2026-10-30T00:00:00.000Z",
    currency: "USD",
    grossAmount: 900,
    refundAmount: 0,
    supplierPayout: 765,
  },
  eligible: true,
  reason: null,
  refundable: 900,
  supplierShareRaw: 765,
  payoutStatus: "ELIGIBLE",
  openRequest: null,
  supplierBalance: { earnings: 3025, openCharges: 0, available: 3025 },
  requestedByEmail: "owner@example.com",
  reasons: [
    { code: "SERVICE_QUALITY", label: "Service quality fell short" },
    { code: "OTHER", label: "Other (explain in the note)" },
  ],
  ...overrides,
});

function renderModal(props = {}) {
  return render(
    <MemoryRouter>
      <RequestRefundModal
        isOpen
        onClose={props.onClose || (() => {})}
        booking={props.booking || booking}
        onSubmitted={props.onSubmitted || (() => {})}
      />
    </MemoryRouter>,
  );
}

async function fillRequiredForm(user, amount = "20") {
  await user.click(screen.getByRole("radio", { name: "Yes" }));
  const attendance = screen.getByText("Did the customer go on this tour?").closest("fieldset");
  await user.click(within(attendance).getByRole("radio", { name: "Yes" }));
  await user.selectOptions(screen.getByLabelText(/Reason for refund/i), "SERVICE_QUALITY");
  await user.type(screen.getByLabelText(/Percentage of the booking/i), amount);
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchRefundQuote.mockResolvedValue(quote());
  createRefundRequest.mockResolvedValue({
    data: { data: { request: { requestNumber: "SR-1", status: "PENDING_APPROVAL", preview: { proposed: 111, charge: 45, currency: "USD" } } } },
  });
});

describe("RequestRefundModal", () => {
  it("shows the booking context and the server-provided balance", async () => {
    const user = userEvent.setup();
    renderModal();

    expect(await screen.findByText("Cape Coast Castle Heritage Walk")).toBeInTheDocument();
    expect(screen.getByText(/Travel 30 Oct 2026/)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Percentage of the booking/i), "20");
    expect(screen.getByText("$3,025.00")).toBeInTheDocument();
  });

  it("blocks a percentage above 100 before it reaches the API", async () => {
    const user = userEvent.setup();
    renderModal();

    await screen.findByText("Cape Coast Castle Heritage Walk");
    await fillRequiredForm(user, "120");

    expect(screen.getByText("A percentage cannot exceed 100.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit refund request" })).toBeDisabled();
    expect(createRefundRequest).not.toHaveBeenCalled();
  });

  it("asks the attendance question again after switching operated back to Yes", async () => {
    const user = userEvent.setup();
    renderModal();

    await screen.findByText("Cape Coast Castle Heritage Walk");
    await user.click(screen.getByRole("radio", { name: "No" }));
    expect(screen.queryByText("Did the customer go on this tour?")).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Yes" }));
    const attendance = screen.getByText("Did the customer go on this tour?").closest("fieldset");
    expect(within(attendance).getByRole("radio", { name: "Yes" })).not.toBeChecked();
    expect(within(attendance).getByRole("radio", { name: "No" })).not.toBeChecked();
  });

  it("does not offer a second form while a request is already in progress", async () => {
    fetchRefundQuote.mockResolvedValue(quote({
      eligible: false,
      reason: "A refund request is already in progress for this booking.",
      openRequest: { id: "r0", requestNumber: "SR-0", status: "PENDING_APPROVAL" },
    }));
    renderModal();

    expect(await screen.findByText("A request is already in progress")).toBeInTheDocument();
    expect(screen.getByText(/SR-0/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit refund request" })).not.toBeInTheDocument();
  });

  it("requires a note when the reason is Other", async () => {
    const user = userEvent.setup();
    renderModal();

    await screen.findByText("Cape Coast Castle Heritage Walk");
    await user.click(screen.getByRole("radio", { name: "Yes" }));
    const attendance = screen.getByText("Did the customer go on this tour?").closest("fieldset");
    await user.click(within(attendance).getByRole("radio", { name: "Yes" }));
    await user.selectOptions(screen.getByLabelText(/Reason for refund/i), "OTHER");
    await user.type(screen.getByLabelText(/Percentage of the booking/i), "20");

    expect(screen.getByText(/Add a note explaining the Other reason/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit refund request" })).toBeDisabled();

    await user.type(screen.getByLabelText(/Note for the reviewer/i), "The guide ended early.");
    expect(screen.getByRole("button", { name: "Submit refund request" })).toBeEnabled();
  });

  it("shows the server preview on success and sends one idempotency key", async () => {
    const user = userEvent.setup();
    const onSubmitted = vi.fn();
    renderModal({ onSubmitted });

    await screen.findByText("Cape Coast Castle Heritage Walk");
    await fillRequiredForm(user);
    await user.click(screen.getByRole("button", { name: "Submit refund request" }));

    expect(await screen.findByText("Request submitted")).toBeInTheDocument();
    expect(screen.getByText(/SR-1 is\s+waiting for Travio to review\./)).toBeInTheDocument();
    // Server preview, not the client estimate (which would be 180/153).
    expect(screen.getByText("$111.00")).toBeInTheDocument();
    expect(screen.getByText("$45.00")).toBeInTheDocument();
    expect(createRefundRequest).toHaveBeenCalledWith(
      "b1",
      expect.objectContaining({ reasonCode: "SERVICE_QUALITY", value: 20, refundType: "PERCENT" }),
      { idempotencyKey: "test-idempotency-key" },
    );
    expect(onSubmitted).toHaveBeenCalled();
  });

  it("offers a retry when the quote cannot be loaded", async () => {
    fetchRefundQuote.mockRejectedValueOnce(new Error("offline"));
    const user = userEvent.setup();
    renderModal();

    expect(await screen.findByText("Could not load this booking")).toBeInTheDocument();
    fetchRefundQuote.mockResolvedValueOnce(quote());
    await user.click(screen.getByRole("button", { name: /Try again/i }));
    expect(await screen.findByText("Cape Coast Castle Heritage Walk")).toBeInTheDocument();
  });
});
