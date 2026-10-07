/**
 * Verification — the Stays workspace's own document dashboard. Seeds the
 * accommodation requirements (supplier documents + one property with its own
 * documents), checks the checklist/summary/property sections, and exercises
 * the document repair paths against the mock.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import StaysVerificationPage from "../StaysVerificationPage";
import { staysMock } from "../../mock/store";

beforeEach(() => staysMock.reset());

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StaysVerificationPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const rowFor = (label) => screen.getByText(label).closest("div");

const fileInputIn = (row) => row.querySelector('input[type="file"]');

describe("StaysVerificationPage — accommodation documents and properties", () => {
  it("renders the seeded checklist, summary and property documents", async () => {
    renderPage();

    await screen.findByText("Verification checklist");
    expect(screen.getByText("Accommodation")).toBeTruthy();

    // Checklist, split into the registration set and the advisory set.
    expect(screen.getByText("Provided during registration")).toBeTruthy();
    expect(screen.getByText("Still to provide")).toBeTruthy();
    expect(screen.getByText("Ghana Card")).toBeTruthy();
    expect(screen.getByText("Business registration certificate")).toBeTruthy();
    expect(screen.getByText("Ghana Tourism Authority certificate")).toBeTruthy();
    expect(screen.getByText("Proof of address")).toBeTruthy();

    // Summary strip.
    expect(screen.getByText("Documents approved")).toBeTruthy();
    expect(screen.getByText("Documents pending review")).toBeTruthy();
    expect(screen.getByText("Properties pending")).toBeTruthy();

    // The property section carries the seeded property and its documents.
    expect(screen.getByText("Properties")).toBeTruthy();
    expect(screen.getByText("Akwaaba Coast Hotel")).toBeTruthy();
    expect(screen.getByText("Accra, Greater Accra")).toBeTruthy();
    expect(screen.getByText("Ownership or lease")).toBeTruthy();
    expect(screen.getByText("Property GTA certificate")).toBeTruthy();
    expect(screen.getByText("Utility bill")).toBeTruthy();
    expect(
      screen.getByText("The certificate photo is blurry — upload a clearer copy."),
    ).toBeTruthy();
  });

  it("re-uploads a flagged property document and returns it to review", async () => {
    renderPage();
    await screen.findByText("Property GTA certificate");

    const row = rowFor("Property GTA certificate");
    expect(within(row).getByText("Replacement requested")).toBeTruthy();

    const file = new File(["certificate"], "property-gta.pdf", { type: "application/pdf" });
    fireEvent.change(fileInputIn(row), { target: { files: [file] } });

    await waitFor(() => {
      expect(within(row).getByText("Pending review")).toBeTruthy();
    });

    const { profile } = await staysMock.getVerification();
    const stored = profile.documents.find((doc) => doc.id === "pd-2");
    expect(stored.status).toBe("PENDING");
    expect(stored.fileName).toBe("property-gta.pdf");
    expect(stored.reviewNote).toBeNull();
  });

  it("attaches a missing property document in place", async () => {
    renderPage();
    await screen.findByText("Utility bill");

    const row = rowFor("Utility bill");
    expect(within(row).getByText("Not uploaded")).toBeTruthy();

    const file = new File(["bill"], "utility-bill.pdf", { type: "application/pdf" });
    fireEvent.change(fileInputIn(row), { target: { files: [file] } });

    await waitFor(() => {
      expect(within(row).getByText("Pending review")).toBeTruthy();
    });

    const { profile } = await staysMock.getVerification();
    const stored = profile.documents.find((doc) => doc.type === "UTILITY_BILL");
    expect(stored).toBeTruthy();
    expect(stored.ownerType).toBe("PROPERTY");
    expect(stored.ownerId).toBe("p1");
    expect(stored.status).toBe("PENDING");
  });
});
