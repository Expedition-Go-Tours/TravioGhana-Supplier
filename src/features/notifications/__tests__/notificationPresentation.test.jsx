import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { mapBackendNotification } from "../utils/notificationPresentation";
import { NOTIFICATION_TYPES } from "../constants";
import NotificationsPage from "../pages/NotificationsPage";

vi.mock("@/hooks/useTeamRole", () => ({
  useTeamRole: () => ({
    notificationCategories: ["bookings", "payments", "payouts", "reviews", "messages", "cancellations", "documents", "team", "system"],
    hasPermission: () => true,
  }),
}));

// Feed the page real mapped backend payloads; keep the rest of the hook
// surface inert. Async factory so we can import the mapper after hoisting.
vi.mock("../hooks/useNotifications", async () => {
  const { mapBackendNotification: map } = await import(
    "../utils/notificationPresentation"
  );
  return {
    useNotifications: () => ({
      data: {
        notifications: [
          map({
            id: "n-approved",
            type: "CANCELLATION_REQUEST_APPROVED",
            createdAt: "2026-05-21T09:00:00.000Z",
            read: false,
            data: {
              bookingId: "BK-2026-0001",
              bookingNumber: "TGA-78234",
              tourTitle: "Serengeti Safari Adventure",
              decision: "APPROVED",
              note: "Verified with the customer.",
            },
          }),
          map({
            id: "n-rejected",
            type: "CANCELLATION_REQUEST_REJECTED",
            createdAt: "2026-05-21T10:00:00.000Z",
            read: true,
            data: {
              bookingId: "BK-2026-0002",
              bookingNumber: "TGA-99999",
              tourTitle: "Ngorongoro Crater Day Trip",
              decision: "REJECTED",
              note: "Insufficient evidence supplied.",
            },
          }),
        ],
        unreadCount: 1,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      isFetching: false,
    }),
    useMarkNotificationRead: () => ({ mutate: vi.fn(), isPending: false }),
    useMarkAllNotificationsRead: () => ({ mutate: vi.fn(), isPending: false }),
    useDeleteNotification: () => ({ mutate: vi.fn(), isPending: false }),
    useDeleteAllNotifications: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

describe("notificationPresentation — cancellation decisions", () => {
  it("maps approved/rejected to dedicated UI types with a booking link and fallback copy", () => {
    const approved = mapBackendNotification({
      id: "n1",
      type: "CANCELLATION_REQUEST_APPROVED",
      createdAt: "2026-05-21T09:00:00.000Z",
      data: { bookingId: "BK-1", bookingNumber: "TGA-1" },
    });
    expect(approved.type).toBe("cancellation_approved");
    expect(approved.action).toBe("/bookings?bookingId=BK-1");
    expect(approved.actionLabel).toBe("View booking");
    expect(approved.title).toBe("Cancellation approved");
    expect(approved.message).toMatch(/TGA-1/);

    const rejected = mapBackendNotification({
      id: "n2",
      type: "CANCELLATION_REQUEST_REJECTED",
      createdAt: "2026-05-21T09:00:00.000Z",
      data: { bookingId: "BK-2", bookingNumber: "TGA-2", note: "No proof." },
    });
    expect(rejected.type).toBe("cancellation_rejected");
    expect(rejected.action).toBe("/bookings?bookingId=BK-2");
    expect(rejected.message).toMatch(/No proof\./);

    // Backend-provided copy always wins.
    const custom = mapBackendNotification({
      id: "n3",
      type: "CANCELLATION_REQUEST_APPROVED",
      title: "Custom title",
      message: "Custom message",
      data: { bookingId: "BK-3" },
    });
    expect(custom.title).toBe("Custom title");
    expect(custom.message).toBe("Custom message");

    expect(NOTIFICATION_TYPES.cancellation_approved.icon).toBeTruthy();
    expect(NOTIFICATION_TYPES.cancellation_rejected.icon).toBeTruthy();
  });

  it("renders both decision types with icons, labels and booking links", () => {
    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    );

    // Approved row
    expect(
      screen.getAllByText("Cancellation approved").length
    ).toBeGreaterThan(0);
    expect(screen.getByText(/TGA-78234/)).toBeTruthy();
    expect(
      screen.getByText(/was approved\. The booking is now cancelled/i)
    ).toBeTruthy();

    // Rejected row + decision note surfaced
    expect(
      screen.getAllByText("Cancellation rejected").length
    ).toBeGreaterThan(0);
    expect(screen.getByText(/TGA-99999/)).toBeTruthy();
    expect(screen.getByText(/Insufficient evidence supplied\./)).toBeTruthy();

    const links = screen.getAllByRole("link", { name: /View booking/i });
    expect(links).toHaveLength(2);
    expect(within(links[0]).getByText(/View booking/i)).toBeTruthy();
    // Newest first: the rejected decision is 10:00, the approved one 09:00.
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/bookings?bookingId=BK-2026-0002",
      "/bookings?bookingId=BK-2026-0001",
    ]);
  });
});

describe("notificationPresentation — supplier-recorded bookings", () => {
  it("maps a booking the supplier recorded to the booking type and its booking", () => {
    const mapped = mapBackendNotification({
      id: "n-scb",
      type: "BOOKING_CREATED_BY_SUPPLIER",
      title: "Booking recorded",
      message: "Booking TGA-3 for Ama was recorded. $150.00 recorded as collected.",
      createdAt: "2026-05-21T09:00:00.000Z",
      data: { bookingId: "BK-3", origin: "SUPPLIER_CREATED" },
    });

    // Unknown types fall back to the system icon; this one is a booking.
    expect(mapped.type).toBe("booking");
    expect(NOTIFICATION_TYPES.booking.icon).toBeTruthy();
    expect(mapped.action).toBe("/bookings?bookingId=BK-3");
    expect(mapped.actionLabel).toBe("View Booking");
    expect(mapped.message).toMatch(/recorded as collected/);
  });
});

describe("notificationPresentation — payout request deep links", () => {
  it("maps PAYOUT_REQUEST_APPROVED with a payoutRequestId to the Payouts tab", () => {
    const mapped = mapBackendNotification({
      id: "n-pr1",
      type: "PAYOUT_REQUEST_APPROVED",
      createdAt: "2026-05-21T09:00:00.000Z",
      data: { payoutRequestId: "pr-1" },
    });
    // The old link went to ?tab=requests, which no longer exists since payout
    // requests moved into the Payouts tab — landing on it blanked the page.
    // The id goes with it so the tab opens the request the bell is about.
    expect(mapped.action).toBe("/finance?tab=payouts&payoutRequestId=pr-1");
    expect(mapped.actionLabel).toBe("View Payout Request");
  });

  it("maps submitted/approved/rejected payout requests to the Payouts tab too", () => {
    for (const type of [
      "PAYOUT_REQUEST_SUBMITTED",
      "PAYOUT_REQUEST_APPROVED",
      "PAYOUT_REQUEST_REJECTED",
    ]) {
      const mapped = mapBackendNotification({
        id: `n-${type}`,
        type,
        createdAt: "2026-05-21T09:00:00.000Z",
      });
      expect(mapped.action).toBe("/finance?tab=payouts");
      expect(mapped.actionLabel).toBe("View Payout Requests");
      expect(mapped.action).not.toContain("tab=requests");
    }
  });
});

describe("notificationPresentation — every link names the thing it is about", () => {
  const route = (type, data = {}) =>
    mapBackendNotification({ id: "n", type, createdAt: "2026-05-21T09:00:00.000Z", data });

  it("opens the exact booking from a booking notification", () => {
    expect(route("BOOKING_CONFIRMED", { bookingId: "BK-1" }).action).toBe(
      "/bookings?bookingId=BK-1",
    );
    expect(route("PICKUP_UPDATED", { bookingId: "BK-2" }).action).toBe(
      "/bookings?bookingId=BK-2",
    );
  });

  it("keeps the payout id on the payout history deep link", () => {
    const mapped = route("PAYOUT_PROCESSED", { payoutId: "po-1" });
    // Legacy Payout rows live in Settings; the Finance payouts tab lists
    // payout *requests*, which the payout id does not name.
    expect(mapped.action).toBe("/settings?tab=payouts&payoutId=po-1");
    expect(mapped.actionLabel).toBe("View Payout");
  });

  it("keeps the dispute id on the refunds tab", () => {
    const mapped = route("DISPUTE_RESOLVED", { disputeId: "dp-1" });
    expect(mapped.action).toBe("/finance?tab=refunds&disputeId=dp-1");
  });

  it("opens the invoice a money notice is about", () => {
    expect(route("INVOICE_APPROVED", { invoiceId: "inv-1" }).action).toBe(
      "/finance?tab=invoices&invoiceId=inv-1",
    );
    expect(route("INVOICE_PAID", { invoiceId: "inv-2" }).action).toBe(
      "/finance?tab=invoices&invoiceId=inv-2",
    );
  });

  it("routes the types that used to fall through to the notifications list", () => {
    expect(route("INVOICE_GENERATED", { invoices: ["INV-1"] }).action).toBe(
      "/finance?tab=invoices",
    );
    expect(route("PAYOUT_REQUEST_WINDOW_OPEN").action).toBe("/finance?tab=payouts");
    expect(route("CANCELLATION_RATE_ALERT", { rate: 2.4 }).action).toBe("/cancellation-rate");
    expect(route("TEAM_INVITE_ACCEPTED", { memberId: "m-1" }).action).toBe("/settings?tab=team");
    expect(route("DOCUMENTATION_WINDOW_REMINDER", { daysLeft: 3 }).action).toBe(
      "/supplier/status",
    );
  });

  it("gives money notices the payment icon instead of the generic system one", () => {
    for (const type of ["INVOICE_GENERATED", "INVOICE_APPROVED", "INVOICE_PAID", "PAYOUT_REQUEST_WINDOW_OPEN"]) {
      expect(route(type).type).toBe("payment");
      expect(NOTIFICATION_TYPES.payment.icon).toBeTruthy();
    }
    expect(route("CANCELLATION_RATE_ALERT").type).toBe("alert");
    expect(route("DOCUMENTATION_WINDOW_REMINDER").type).toBe("alert");
  });

  it("sends an unknown type to its own inbox, never to a wrong page", () => {
    const mapped = route("SOMETHING_NEW_AND_UNMAPPED");
    expect(mapped.action).toBe("/notifications");
    expect(mapped.type).toBe("system");
  });
});

describe("notificationPresentation — supplier refund decisions", () => {
  const map = (type) =>
    mapBackendNotification({
      id: `n-${type}`,
      type,
      createdAt: "2026-11-05T13:20:00.000Z",
      data: {
        bookingId: "BK-9",
        refundRequestId: "SR-1",
        requestNumber: "SR-20261105-E2AD",
        amount: 35,
        charge: 29.75,
        currency: "USD",
      },
    });

  it("opens the refunds tab on the request each decision is about", () => {
    for (const type of ["SUPPLIER_REFUND_APPROVED", "SUPPLIER_REFUND_REJECTED", "SUPPLIER_REFUND_FAILED"]) {
      expect(map(type).action).toBe("/finance?tab=refunds&refundRequestId=SR-1");
      expect(map(type).actionLabel).toBe("View refund request");
    }
  });

  it("uses the money icon for an approval and the alert icon for a refusal or failure", () => {
    expect(map("SUPPLIER_REFUND_APPROVED").type).toBe("payment");
    expect(map("SUPPLIER_REFUND_REJECTED").type).toBe("alert");
    expect(map("SUPPLIER_REFUND_FAILED").type).toBe("alert");
  });
});
