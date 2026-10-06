/**
 * Special Offers — the create/edit form renders inline on the page (never a
 * dialog), saves through the offers API, prefills when editing, validates
 * inline, and honours the `?create=1&property=` deep link from the Properties
 * page with the property preselected.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import StaysOffersPage from "../StaysOffersPage";
import { staysMock } from "../../mock/store";

beforeEach(() => staysMock.reset());

function renderPage(initialEntry = "/stays/special-offers") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/stays/special-offers" element={<StaysOffersPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("StaysOffersPage — inline offer form", () => {
  it("opens the create form inline on the page, not as a dialog", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.queryByText("Create an offer")).toBeNull();
    await user.click(screen.getByRole("button", { name: "+ Create offer" }));

    expect(await screen.findByText("Create an offer")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByLabelText("Offer name")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Property" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Offer type" })).toBeTruthy();
    expect(screen.getByLabelText("Discount (%)")).toBeTruthy();
    expect(screen.getByLabelText("Start date")).toBeTruthy();
    expect(screen.getByLabelText("End date")).toBeTruthy();
    expect(screen.getByLabelText("Booking limit (optional)")).toBeTruthy();
    expect(screen.getByText(/Guests see/)).toBeTruthy();
  });

  it("creates an offer from the inline form and closes it", async () => {
    const user = userEvent.setup();
    const [property] = await staysMock.listProperties();
    renderPage();

    await user.click(screen.getByRole("button", { name: "+ Create offer" }));
    const nameInput = await screen.findByLabelText("Offer name");
    await user.clear(nameInput);
    await user.type(nameInput, "Easter special");
    await user.click(screen.getByRole("combobox", { name: "Property" }));
    await user.click(await screen.findByRole("option", { name: property.name }));
    await user.click(screen.getByRole("button", { name: "Create offer" }));

    await waitFor(() => {
      expect(screen.queryByText("Create an offer")).toBeNull();
    });
    expect(await screen.findByText("Easter special")).toBeTruthy();

    const offers = await staysMock.listOffers();
    expect(offers).toHaveLength(1);
    expect(offers[0]).toMatchObject({
      name: "Easter special",
      propertyId: property.id,
      discount: 10,
    });
  });

  it("shows inline validation instead of saving invalid input", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "+ Create offer" }));
    const nameInput = await screen.findByLabelText("Offer name");
    await user.clear(nameInput);
    await user.click(screen.getByRole("button", { name: "Create offer" }));

    expect(await screen.findByText("Enter an offer name")).toBeTruthy();
    expect(screen.getByText("Create an offer")).toBeTruthy();
    expect(await staysMock.listOffers()).toHaveLength(0);
  });

  it("prefills the form when editing an existing offer", async () => {
    const user = userEvent.setup();
    const [property] = await staysMock.listProperties();
    await staysMock.saveOffer({
      propertyId: property.id,
      name: "Seeded deal",
      kind: "Last-minute",
      discount: 25,
      from: "2026-10-10",
      to: "2026-10-20",
    });
    renderPage();

    const card = (await screen.findByText("Seeded deal")).closest("[data-offer-card]");
    await user.click(within(card).getByRole("button", { name: "Edit" }));

    expect(await screen.findByText("Edit offer")).toBeTruthy();
    expect(screen.getByLabelText("Offer name").value).toBe("Seeded deal");

    const discount = screen.getByLabelText("Discount (%)");
    await user.clear(discount);
    await user.type(discount, "30");
    await user.click(screen.getByRole("button", { name: "Save offer" }));

    await waitFor(() => {
      expect(screen.queryByText("Edit offer")).toBeNull();
    });
    expect(await screen.findByText("30% OFF")).toBeTruthy();
    const offers = await staysMock.listOffers();
    expect(offers[0]).toMatchObject({ name: "Seeded deal", discount: 30 });
  });

  it("opens from the Properties deep link with the property preselected", async () => {
    const user = userEvent.setup();
    const [property] = await staysMock.listProperties();
    renderPage(`/stays/special-offers?create=1&property=${property.id}`);

    expect(await screen.findByText("Create an offer")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Create offer" }));

    await waitFor(() => {
      expect(screen.queryByText("Create an offer")).toBeNull();
    });
    const offers = await staysMock.listOffers();
    expect(offers[0]).toMatchObject({ propertyId: property.id });
  });

  it("closes the inline form from Cancel", async () => {
    const user = userEvent.setup();
    renderPage("/stays/special-offers?create=1");

    await screen.findByText("Create an offer");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByText("Create an offer")).toBeNull();
    });
  });
});
