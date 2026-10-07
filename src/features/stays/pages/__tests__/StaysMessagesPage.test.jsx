/**
 * Guest messages — the Stays workspace's own inbox. Lists the seeded guest
 * messages, replies in place through the supplier messages endpoint, and
 * filters by replied state.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import StaysMessagesPage from "../StaysMessagesPage";
import { staysMock } from "../../mock/store";

beforeEach(() => staysMock.reset());

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StaysMessagesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("StaysMessagesPage — guest messages", () => {
  it("lists the seeded guest messages with their unread state", async () => {
    renderPage();

    expect(await screen.findByText("Sarah Johnson")).toBeTruthy();
    expect(screen.getByText("Kwame Agyeman")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Unread" })).toBeTruthy();
    const sarah = screen.getByText("Sarah Johnson").closest("[data-message-card]");
    expect(within(sarah).getByText("Unread")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Reply" })).toHaveLength(2);
  });

  it("replies to a message in place and marks it replied", async () => {
    const user = userEvent.setup();
    renderPage();

    const card = (await screen.findByText("Sarah Johnson")).closest("[data-message-card]");
    await user.click(within(card).getByRole("button", { name: "Reply" }));
    await user.type(
      within(card).getByLabelText("Reply to Sarah Johnson"),
      "Yes, airport pickup can be arranged.",
    );
    await user.click(within(card).getByRole("button", { name: "Send reply" }));

    await waitFor(() => {
      expect(within(card).getByText("Replied")).toBeTruthy();
    });
    const stored = (await staysMock.listMessages()).find((message) => message.id === "m1");
    expect(stored.reply).toBe("Yes, airport pickup can be arranged.");
  });

  it("filters the list to replied messages", async () => {
    const user = userEvent.setup();
    renderPage();

    const card = (await screen.findByText("Sarah Johnson")).closest("[data-message-card]");
    await user.click(within(card).getByRole("button", { name: "Reply" }));
    await user.type(within(card).getByLabelText("Reply to Sarah Johnson"), "On it!");
    await user.click(within(card).getByRole("button", { name: "Send reply" }));
    await waitFor(() => {
      expect(within(card).getByText("Replied")).toBeTruthy();
    });

    await user.click(screen.getByRole("tab", { name: "Replied" }));

    await waitFor(() => {
      expect(screen.getByText("Sarah Johnson")).toBeTruthy();
      expect(screen.queryByText("Kwame Agyeman")).toBeNull();
    });
  });
});
