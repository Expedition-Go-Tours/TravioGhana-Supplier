import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { mapBackendNotification } from "../utils/notificationPresentation";
import { NOTIFICATION_TYPES } from "../constants";
import NotificationsPage from "../pages/NotificationsPage";

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
    expect(links[0].getAttribute("href")).toBe(
      "/bookings?bookingId=BK-2026-0001"
    );
  });
});
