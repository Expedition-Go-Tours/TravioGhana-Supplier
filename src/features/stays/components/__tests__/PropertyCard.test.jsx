import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PropertyCard from "../PropertyCard";

const property = {
  id: "p1",
  name: "Akwaaba Coast Hotel",
  type: "Hotel",
  city: "Accra",
  region: "Greater Accra",
  status: "Live",
  step: 17,
  bookings: 3,
  shortDescription: "A quiet base near the coast",
  photos: ["https://example.com/cover.jpg"],
  rooms: [{ id: "r1", name: "Deluxe King Room", count: 6 }],
};

function renderCard({ overrides = {}, layout = "Grid", ...props } = {}) {
  const callbacks = {
    onEdit: vi.fn(),
    onPreview: vi.fn(),
    onCreateOffer: vi.fn(),
    onDelete: vi.fn(),
  };
  render(
    <PropertyCard
      property={{ ...property, ...overrides }}
      layout={layout}
      {...callbacks}
      {...props}
    />,
  );
  return callbacks;
}

describe("PropertyCard", () => {
  it("renders the cover image, white body content and actions inside the body", () => {
    renderCard();

    expect(screen.getByTestId("property-card-cover")).toHaveAttribute(
      "src",
      "https://example.com/cover.jpg",
    );
    const body = screen.getByTestId("property-card-body");
    expect(within(body).getByText("Akwaaba Coast Hotel")).toBeTruthy();
    expect(within(body).getByText("Hotel · Accra, Greater Accra")).toBeTruthy();
    expect(within(body).getByText("A quiet base near the coast")).toBeTruthy();
    expect(within(body).getByText("3 bookings")).toBeTruthy();
    expect(within(body).getByText("1 room type")).toBeTruthy();
    expect(within(body).getByText("6 units")).toBeTruthy();
    expect(within(body).getByRole("button", { name: "Edit property" })).toBeTruthy();
    expect(within(body).getByRole("button", { name: "Preview property" })).toBeTruthy();
    expect(within(body).getByRole("button", { name: "Create special offer" })).toBeTruthy();
    expect(within(body).getByRole("button", { name: "Delete property" })).toBeTruthy();
  });

  it("uses a placeholder when the property has no photo", () => {
    renderCard({ overrides: { photos: [] } });

    expect(screen.getByTestId("property-card-placeholder")).toBeTruthy();
    expect(screen.queryByTestId("property-card-cover")).toBeNull();
  });

  it("shows the draft setup action and hides the offer action", () => {
    renderCard({ overrides: { status: "Draft" } });

    expect(screen.getByRole("button", { name: "Continue property setup" })).toBeTruthy();
    expect(screen.getByText("Continue setup")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Create special offer" })).toBeNull();
  });

  it("routes every action", async () => {
    const user = userEvent.setup();
    const { onEdit, onPreview, onCreateOffer, onDelete } = renderCard();

    await user.click(screen.getByRole("button", { name: "Edit property" }));
    await user.click(screen.getByRole("button", { name: "Preview property" }));
    await user.click(screen.getByRole("button", { name: "Create special offer" }));
    await user.click(screen.getByRole("button", { name: "Delete property" }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(onCreateOffer).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("renders the list layout with the same body and actions", () => {
    renderCard({ layout: "List" });

    expect(screen.getByTestId("property-card-cover")).toBeTruthy();
    const body = screen.getByTestId("property-card-body");
    expect(within(body).getByRole("button", { name: "Preview property" })).toBeTruthy();
    expect(within(body).getByRole("button", { name: "Edit property" })).toBeTruthy();
  });
});
