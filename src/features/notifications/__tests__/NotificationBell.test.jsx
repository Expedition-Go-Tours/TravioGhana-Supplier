/**
 * The header notification dropdown.
 *
 * Two things matter on a phone: the panel must not run off the left edge of
 * the screen (the bell sits ~40px from the right edge, so a 320px panel
 * anchored to it overflows a 360–375px viewport), and a tap outside must
 * actually close it.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  useNotifications: vi.fn(),
  markRead: vi.fn(),
  markAll: vi.fn(),
}));

vi.mock("../hooks/useNotifications", () => ({
  useNotifications: mocks.useNotifications,
  useMarkNotificationRead: mocks.markRead,
  useMarkAllNotificationsRead: mocks.markAll,
}));

import NotificationBell from "../components/NotificationBell";

const notification = (over = {}) => ({
  id: "n1",
  type: "BOOKING_CONFIRMED",
  title: "Booking confirmed",
  message: "TRG-1 was confirmed",
  date: new Date().toISOString(),
  read: false,
  backendType: "BOOKING_CONFIRMED",
  action: "/bookings",
  ...over,
});

function renderBell() {
  return render(
    <MemoryRouter>
      <NotificationBell />
    </MemoryRouter>,
  );
}

async function openPanel(user) {
  await user.click(screen.getByRole("button", { name: "Notifications" }));
  return screen.getByRole("heading", { name: "Notifications" });
}

const panelOf = (heading) => heading.closest("div.fixed");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useNotifications.mockReturnValue({
    data: { notifications: [notification()], unreadCount: 1 },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  mocks.markRead.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({}) });
  mocks.markAll.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({}) });
});

describe("NotificationBell", () => {
  it("anchors to the viewport gutters on mobile, and to the bell from sm up", async () => {
    const user = userEvent.setup();
    renderBell();
    const heading = await openPanel(user);
    const panel = panelOf(heading);

    expect(panel).toBeTruthy();
    // Mobile: fixed between the screen edges, so it can never overflow left.
    expect(panel.className).toContain("fixed");
    expect(panel.className).toContain("left-4");
    expect(panel.className).toContain("right-4");
    // sm+: back to a dropdown aligned with the bell.
    expect(panel.className).toContain("sm:absolute");
    expect(panel.className).toContain("sm:right-0");
    expect(panel.className).toContain("sm:left-auto");
  });

  it("fits inside the viewport instead of overflowing", async () => {
    const user = userEvent.setup();
    renderBell();
    const panel = panelOf(await openPanel(user));

    // No fixed pixel width on mobile — the gutters define it.
    expect(panel.className).not.toMatch(/(^|\s)w-80(\s|$)/);
    expect(panel.className).toContain("max-h-[calc(100dvh_-_var(--preview-banner-height)_-_6rem)]");
  });

  it("closes on a tap outside", async () => {
    const user = userEvent.setup();
    renderBell();
    await openPanel(user);

    await user.click(document.body);

    expect(screen.queryByRole("heading", { name: "Notifications" })).toBeNull();
  });

  it("does not treat a tap inside the panel as an outside tap", async () => {
    const user = userEvent.setup();
    renderBell();
    const heading = await openPanel(user);

    // Clicking a non-interactive part of the panel must not dismiss it.
    await user.click(heading);

    expect(screen.getByRole("heading", { name: "Notifications" })).toBeTruthy();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    renderBell();
    await openPanel(user);

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("heading", { name: "Notifications" })).toBeNull();
  });

  it("registers the outside-tap listener only while open, and removes it on close", async () => {
    const user = userEvent.setup();
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");

    renderBell();
    expect(addSpy).not.toHaveBeenCalledWith("pointerdown", expect.any(Function));

    await openPanel(user);
    expect(addSpy).toHaveBeenCalledWith("pointerdown", expect.any(Function));

    await user.click(document.body);
    expect(removeSpy).toHaveBeenCalledWith("pointerdown", expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("keeps the list scrolling inside the panel", async () => {
    const user = userEvent.setup();
    renderBell();
    const heading = await openPanel(user);

    const list = heading.closest("div.fixed").querySelector(".overflow-y-auto");
    expect(list).toBeTruthy();
    expect(list.className).toContain("overscroll-contain");
  });
});
