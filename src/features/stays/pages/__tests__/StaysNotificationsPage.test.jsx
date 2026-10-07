/**
 * Notifications — the Stays workspace's own inbox. Seeds six events, checks
 * the unread roll-up and filters, marks/removes through the mock, and replies
 * to a guest message through the Stays customers API.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import StaysNotificationsPage from "../StaysNotificationsPage";
import { staysMock } from "../../mock/store";

vi.mock("@/hooks/useTeamRole", () => ({
  useTeamRole: () => ({ hasPermission: () => true }),
}));

beforeEach(() => staysMock.reset());

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StaysNotificationsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("StaysNotificationsPage — the Stays account inbox", () => {
  it("lists the seeded events with the unread roll-up", async () => {
    renderPage();

    expect(await screen.findByText("New booking request")).toBeTruthy();
    expect(screen.getByText("New message from Sarah Johnson")).toBeTruthy();
    expect(screen.getByText("Payout processed")).toBeTruthy();
    expect(screen.getByText("New 5-star review")).toBeTruthy();
    expect(screen.getByText("Booking confirmed")).toBeTruthy();
    expect(screen.getByText("Listing submitted for review")).toBeTruthy();
    expect(screen.getByText("You have 3 unread notifications")).toBeTruthy();
    // The listing event uses the Stays "Property" label, not "Product".
    expect(screen.getByText("Property")).toBeTruthy();
  });

  it("routes each event at the matching Stays page", async () => {
    renderPage();

    await screen.findByText("New booking request");
    const bookingLink = screen.getAllByRole("link", { name: /View Booking/i })[0];
    expect(bookingLink.getAttribute("href")).toBe("/stays/bookings?bookingId=TG-S-20494");

    const messageLink = screen.getByRole("link", { name: /View Message/i });
    expect(messageLink.getAttribute("href")).toBe("/stays/customers?conversation=conv-1");

    const payoutLink = screen.getByRole("link", { name: /View Payout$/i });
    expect(payoutLink.getAttribute("href")).toBe("/stays/finance?tab=payouts&payoutId=payout-1");

    const propertyLink = screen.getByRole("link", { name: /View Property/i });
    expect(propertyLink.getAttribute("href")).toBe("/stays/properties/p1");
  });

  it("filters to unread notifications", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("New booking request");

    await user.click(screen.getByRole("button", { name: /Unread/ }));

    await waitFor(() => {
      expect(screen.getByText("New booking request")).toBeTruthy();
    });
    expect(screen.getByText("New message from Sarah Johnson")).toBeTruthy();
    expect(screen.getByText("Payout processed")).toBeTruthy();
    expect(screen.queryByText("New 5-star review")).toBeNull();
  });

  it("marks one read and deletes another, persisting both", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("New booking request");

    await user.click(screen.getAllByTitle("Mark as read")[0]);
    await waitFor(() => {
      expect(screen.getByText("You have 2 unread notifications")).toBeTruthy();
    });

    await user.click(screen.getAllByTitle("Delete")[0]);
    await waitFor(() => {
      expect(screen.queryByText("New message from Sarah Johnson")).toBeNull();
    });

    const stored = await staysMock.listNotifications();
    expect(stored.notifications.some((row) => row.id === "notif-2")).toBe(false);
    expect(stored.unreadCount).toBe(2);
  });

  it("quick-replies to a guest message through the Stays inbox", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("New message from Sarah Johnson");

    await user.click(screen.getByRole("button", { name: /Reply/ }));
    await user.type(screen.getByPlaceholderText("Quick reply..."), "Adding it right away!");
    await user.click(screen.getByTitle("Send reply"));

    expect(await screen.findByText("Message sent")).toBeTruthy();
    const { messages } = await staysMock.listConversationMessages({ conversationId: "conv-1" });
    expect(messages.map((message) => message.content)).toContain("Adding it right away!");
  });
});
