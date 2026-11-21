/**
 * The header notification panel.
 *
 * Two things matter on a phone and one on a keyboard: the panel must fit the
 * viewport, a tap outside must close it, and focus must land inside it rather
 * than in the page behind. The row actions and the optimistic read state are
 * covered here too, because "looks unread after you read it" is the bug users
 * report most often.
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  useNotifications: vi.fn(),
  useUnreadCount: vi.fn(),
  markRead: vi.fn(),
  markAll: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("../hooks/useNotifications", () => ({
  useNotifications: mocks.useNotifications,
  useUnreadCount: mocks.useUnreadCount,
  useMarkNotificationRead: mocks.markRead,
  useMarkAllNotificationsRead: mocks.markAll,
}));

import NotificationBell from "../components/NotificationBell";

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);

const notification = (over = {}) => ({
  id: "n1",
  type: "booking",
  title: "Booking confirmed",
  message: "TRG-1 was confirmed",
  date: today.toISOString(),
  read: false,
  backendType: "BOOKING_CONFIRMED",
  action: "/bookings",
  data: {},
  ...over,
});

function renderBell() {
  return render(
    <MemoryRouter>
      <NotificationBell />
    </MemoryRouter>,
  );
}

const originalMatchMedia = window.matchMedia;

function mockIsMobile(matches) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

async function openPanel(user) {
  await user.click(screen.getByRole("button", { name: /notifications/i }));
  return screen.getByRole("dialog", { name: "Notifications" });
}

beforeEach(() => {
  vi.clearAllMocks();
  window.matchMedia = originalMatchMedia;
  mocks.useNotifications.mockReturnValue({
    data: {
      notifications: [
        notification(),
        notification({
          id: "n2",
          type: "payment",
          title: "Payout sent",
          message: "GHS 4,120 is on its way",
          date: yesterday.toISOString(),
          read: true,
          backendType: "PAYOUT_COMPLETED",
          action: "/finance",
        }),
      ],
      unreadCount: 1,
    },
    isLoading: false,
    isError: false,
    refetch: mocks.refetch,
  });
  mocks.useUnreadCount.mockReturnValue({ data: { count: 1 } });
  mocks.markRead.mockReturnValue({ mutate: vi.fn(), isPending: false });
  mocks.markAll.mockReturnValue({ mutate: vi.fn(), isPending: false });
});

describe("NotificationBell", () => {
  it("tells a screen reader how many are unread", () => {
    renderBell();
    const trigger = screen.getByRole("button", { name: "Notifications, 1 unread" });

    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-controls")).toBe("notification-panel");
  });

  it("opens a labelled dialog outside the header", async () => {
    const user = userEvent.setup();
    renderBell();
    const panel = await openPanel(user);

    expect(panel.getAttribute("role")).toBe("dialog");
    expect(panel.id).toBe("notification-panel");
    expect(panel.parentElement).toBe(document.body);
  });

  it("moves focus to the first notification", async () => {
    const user = userEvent.setup();
    renderBell();
    await openPanel(user);

    const rows = document.querySelectorAll("[data-notification-row]");
    await waitFor(() => expect(rows[0]).toHaveFocus());
  });

  it("walks the rows with the arrow keys", async () => {
    const user = userEvent.setup();
    renderBell();
    await openPanel(user);

    const rows = document.querySelectorAll("[data-notification-row]");
    await waitFor(() => expect(rows[0]).toHaveFocus());

    await user.keyboard("{ArrowDown}");
    expect(rows[1]).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(rows[1]).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(rows[0]).toHaveFocus();
  });

  it("closes on Escape and gives focus back to the bell", async () => {
    const user = userEvent.setup();
    renderBell();
    await openPanel(user);

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const trigger = screen.getByRole("button", { name: /notifications/i });
    expect(trigger).toHaveFocus();
  });

  it("closes when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    renderBell();
    await openPanel(user);

    await user.click(screen.getByTestId("notification-backdrop"));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("does not close when the panel itself is clicked", async () => {
    const user = userEvent.setup();
    renderBell();
    const panel = await openPanel(user);

    await user.click(within(panel).getByText("Today"));

    expect(screen.getByRole("dialog", { name: "Notifications" })).toBeTruthy();
  });

  it("groups rows by day and names the notification type", async () => {
    const user = userEvent.setup();
    renderBell();
    const panel = await openPanel(user);

    expect(within(panel).getByText("Today")).toBeTruthy();
    expect(within(panel).getByText("Yesterday")).toBeTruthy();
    expect(within(panel).getByText("Booking confirmed")).toBeTruthy();
    expect(within(panel).getByText(/Bookings/)).toBeTruthy();
    expect(within(panel).getByText(/Money/)).toBeTruthy();
  });

  it("marks a single row read from the row action", async () => {
    const mutate = vi.fn();
    mocks.markRead.mockReturnValue({ mutate, isPending: false });

    const user = userEvent.setup();
    renderBell();
    await openPanel(user);

    await user.click(
      screen.getByRole("button", { name: "Mark Booking confirmed as read" }),
    );

    expect(mutate).toHaveBeenCalledWith("n1");
  });

  it("offers a real retry when the feed fails", async () => {
    mocks.useNotifications.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mocks.refetch,
    });

    const user = userEvent.setup();
    renderBell();
    await openPanel(user);

    expect(screen.getByText(/didn't load/i)).toBeTruthy();
    expect(screen.queryByText(/pull down/i)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(mocks.refetch).toHaveBeenCalled();
  });

  it("says so when there is nothing to show", async () => {
    mocks.useUnreadCount.mockReturnValue({ data: { count: 0 } });
    mocks.useNotifications.mockReturnValue({
      data: { notifications: [], unreadCount: 0 },
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });

    const user = userEvent.setup();
    renderBell();
    await openPanel(user);

    expect(screen.getByText("You're all caught up")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /mark all read/i })).toBeNull();
  });

  it("keeps the list scrolling inside the panel", async () => {
    const user = userEvent.setup();
    renderBell();
    const panel = await openPanel(user);

    const list = panel.querySelector(".overflow-y-auto");
    expect(list).toBeTruthy();
    expect(list.className).toContain("overscroll-contain");
  });

  it("becomes a bottom sheet on a phone and locks the page behind it", async () => {
    mockIsMobile(true);

    const user = userEvent.setup();
    renderBell();
    const panel = await openPanel(user);

    expect(panel.className).toContain("inset-x-0");
    expect(panel.className).toContain("bottom-0");
    expect(panel.className).toContain("rounded-t-2xl");
    expect(panel.className).toContain("max-h-[85dvh]");
    expect(panel.getAttribute("aria-modal")).toBe("true");
    expect(document.body.style.overflow).toBe("hidden");

    await user.click(screen.getByRole("button", { name: "Close notifications" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.body.style.overflow).toBe("");
  });
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  document.body.style.overflow = "";
});
