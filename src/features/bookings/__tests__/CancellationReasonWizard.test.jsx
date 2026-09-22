import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CancellationReasonWizard from "../components/CancellationReasonWizard";

/**
 * The REAL shape returned by GET /bookings/cancellation-reasons: the backend
 * sends plain category KEYS, not display objects. Regression guard for the
 * blank "Why are you cancelling?" cards (title/description rendered from
 * undefined on strings).
 */
const taxonomy = {
  categories: ["OPERATIONAL", "FORCE_MAJEURE", "CUSTOMER_REQUESTED"],
  byCategory: {
    OPERATIONAL: [
      {
        code: "GUIDE_UNAVAILABLE",
        category: "OPERATIONAL",
        label: "Guide or staff unavailable",
      },
    ],
    FORCE_MAJEURE: [],
    CUSTOMER_REQUESTED: [],
  },
  feePct: 25,
  choiceWindowHours: 48,
};

describe("CancellationReasonWizard", () => {
  it("renders the plain-language category cards from string keys", () => {
    render(<CancellationReasonWizard taxonomy={taxonomy} onSubmit={() => {}} />);
    expect(screen.getByText("Operational issue")).toBeTruthy();
    expect(
      screen.getByText(/Something on your side stopped the experience/)
    ).toBeTruthy();
    expect(screen.getByText("Force majeure")).toBeTruthy();
    expect(screen.getByText("Customer requested")).toBeTruthy();
  });

  it("advances to labelled reasons when a category is chosen", () => {
    render(<CancellationReasonWizard taxonomy={taxonomy} onSubmit={() => {}} />);
    fireEvent.click(screen.getByRole("radio", { name: /Operational issue/i }));
    expect(screen.getByText("Guide or staff unavailable")).toBeTruthy();
    expect(
      screen.getByRole("radio", { name: /Guide or staff unavailable/i })
    ).toBeTruthy();
  });

  it("keeps object-shaped categories (offline fallback) rendering", () => {
    const objectTaxonomy = {
      ...taxonomy,
      categories: [
        {
          key: "OPERATIONAL",
          title: "Operational issue",
          description: "Local fallback copy.",
        },
      ],
    };
    render(
      <CancellationReasonWizard taxonomy={objectTaxonomy} onSubmit={() => {}} />
    );
    expect(screen.getByText("Operational issue")).toBeTruthy();
    expect(screen.getByText("Local fallback copy.")).toBeTruthy();
  });
});
