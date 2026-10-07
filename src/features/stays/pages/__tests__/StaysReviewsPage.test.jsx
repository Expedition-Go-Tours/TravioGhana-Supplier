/**
 * Reviews — the Stays workspace's own review list. Seeds two reviews, replies
 * in place through the supplier reviews endpoint, and filters by replied state.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import StaysReviewsPage from "../StaysReviewsPage";
import { staysMock } from "../../mock/store";

beforeEach(() => staysMock.reset());

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StaysReviewsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("StaysReviewsPage — guest reviews", () => {
  it("lists the seeded reviews with ratings and reply state", async () => {
    renderPage();

    expect(await screen.findByText("Ama B.")).toBeTruthy();
    expect(screen.getByText("David R.")).toBeTruthy();
    expect(screen.getByText("Helpful staff and a lovely breakfast.")).toBeTruthy();
    expect(screen.getByLabelText("5 out of 5")).toBeTruthy();
    expect(screen.getByLabelText("4 out of 5")).toBeTruthy();
    expect(screen.getAllByText("Needs reply")).toHaveLength(2);
  });

  it("publishes a reply in place", async () => {
    const user = userEvent.setup();
    renderPage();

    const card = (await screen.findByText("Ama B.")).closest("[data-review-card]");
    await user.click(within(card).getByRole("button", { name: "Reply" }));
    await user.type(
      within(card).getByLabelText("Reply to Ama B."),
      "Thank you for the kind words!",
    );
    await user.click(within(card).getByRole("button", { name: "Publish reply" }));

    await waitFor(() => {
      expect(within(card).getByText("Replied")).toBeTruthy();
    });
    const stored = (await staysMock.listReviews()).find((review) => review.id === "v1");
    expect(stored.reply).toBe("Thank you for the kind words!");
  });

  it("filters to reviews still needing a reply", async () => {
    const user = userEvent.setup();
    renderPage();

    const card = (await screen.findByText("Ama B.")).closest("[data-review-card]");
    await user.click(within(card).getByRole("button", { name: "Reply" }));
    await user.type(within(card).getByLabelText("Reply to Ama B."), "Thanks!");
    await user.click(within(card).getByRole("button", { name: "Publish reply" }));
    await waitFor(() => {
      expect(within(card).getByText("Replied")).toBeTruthy();
    });

    await user.click(screen.getByRole("tab", { name: "Unreplied" }));

    await waitFor(() => {
      expect(screen.getByText("David R.")).toBeTruthy();
      expect(screen.queryByText("Ama B.")).toBeNull();
    });
  });
});
