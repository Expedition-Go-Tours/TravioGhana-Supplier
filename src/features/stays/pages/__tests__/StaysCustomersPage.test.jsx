/**
 * Customers — the Stays mirror of the Experiences chat page: the conversation
 * list with unread state, opening a thread, sending a reply and the customer
 * profile panel with the guest's stays bookings.
 *
 * The page renders both the desktop 3-pane layout and the mobile flow in the
 * DOM (CSS hides one), so the queries use getAll* and pick the first match.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import StaysCustomersPage from "../StaysCustomersPage";
import { staysMock } from "../../mock/store";
import { useAuthStore } from "@/stores/authStore";

beforeEach(() => {
  staysMock.reset();
  useAuthStore.setState({
    user: { id: "stays-supplier", name: "Akwaaba Coast Hotel", roles: ["supplier"] },
    isAuthenticated: true,
  });
});

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderPage(initialEntry = "/stays/customers") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationProbe />
      <Routes>
        <Route path="/stays/customers" element={<StaysCustomersPage />} />
        <Route path="/stays/bookings" element={<div>Bookings</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("StaysCustomersPage — experiences-parity customers chat", () => {
  it("lists the seeded guest conversations with their previews", async () => {
    renderPage();

    expect((await screen.findAllByText("Sarah Johnson")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Kwame Agyeman").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rebecca Smith").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "All Messages" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /Unread/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Great, please add it to my booking/).length).toBeGreaterThan(0);
  });

  it("opens a thread and sends a reply", async () => {
    const user = userEvent.setup();
    renderPage();

    const [sarah] = await screen.findAllByText("Sarah Johnson");
    await user.click(sarah);

    expect(
      (await screen.findAllByText("Is airport pickup available for my arrival?")).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Yes — airport pickup can be arranged for GHS 150.").length,
    ).toBeGreaterThan(0);

    const [composer] = screen.getAllByPlaceholderText("Type a message...");
    await user.type(composer, "Adding it now.");
    await user.keyboard("{Enter}");

    expect((await screen.findAllByText("Adding it now.")).length).toBeGreaterThan(0);
    const { messages } = await staysMock.listConversationMessages({ conversationId: "conv-1" });
    expect(messages.map((message) => message.content)).toContain("Adding it now.");
  });

  it("filters to unread conversations", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText("Sarah Johnson");

    const [unreadTab] = screen.getAllByRole("button", { name: /Unread/ });
    await user.click(unreadTab);

    await waitFor(() => {
      expect(screen.queryByText("Kwame Agyeman")).toBeNull();
    });
    expect(screen.getAllByText("Sarah Johnson").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rebecca Smith").length).toBeGreaterThan(0);
  });

  it("opens a thread from the ?conversation deep link", async () => {
    renderPage("/stays/customers?conversation=conv-2");

    expect((await screen.findAllByText("Could we check in a little earlier?")).length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getAllByText("Early check-in at 12:00 works — we'll have the room ready.").length,
    ).toBeGreaterThan(0);
  });

  it("opens the customer profile with the guest's bookings", async () => {
    const user = userEvent.setup();
    renderPage();

    const [sarah] = await screen.findAllByText("Sarah Johnson");
    await user.click(sarah);
    await screen.findAllByText("Is airport pickup available for my arrival?");

    const [details] = screen.getAllByRole("button", { name: "Details" });
    await user.click(details);

    expect((await screen.findAllByText("Customer Profile")).length).toBeGreaterThan(0);
    expect((await screen.findAllByText("Bookings")).length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.getAllByText("Akwaaba Coast Hotel").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("Deluxe King Room").length).toBeGreaterThan(0);
  });
});
