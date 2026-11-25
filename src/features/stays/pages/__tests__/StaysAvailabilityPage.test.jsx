import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const teamRoleState = {
  hasPermission: () => true,
};

vi.mock("@/hooks/useTeamRole", () => ({
  useTeamRole: () => teamRoleState,
}));

vi.mock("../../hooks/usePropertyContext", () => ({
  usePropertyContext: () => ({ property: null, properties: [], isLoading: false, selectProperty: vi.fn() }),
}));

vi.mock("@/features/stays/components/availability/AvailabilitySectionTabs", () => ({
  default: ({ activeSection }) => <div data-testid="tabs">{activeSection}</div>,
}));
vi.mock("@/features/stays/components/availability/CalendarSection", () => ({
  default: () => <div>calendar-section</div>,
}));
vi.mock("@/features/stays/components/availability/OpenCloseSection", () => ({
  default: () => <div>open-close-section</div>,
}));
vi.mock("@/features/stays/components/availability/CopyRatesSection", () => ({
  default: () => <div>copy-rates-section</div>,
}));
vi.mock("@/features/stays/components/availability/RestrictionRulesSection", () => ({
  default: () => <div>restrictions-section</div>,
}));
vi.mock("@/features/stays/components/availability/RatePlansSection", () => ({
  default: () => <div>rate-plans-section</div>,
}));
vi.mock("@/features/stays/components/availability/ValueAddsSection", () => ({
  default: () => <div>value-adds-section</div>,
}));
vi.mock("@/features/stays/components/availability/PricingPerGuestSection", () => ({
  default: () => <div>guest-pricing-section</div>,
}));
vi.mock("@/features/stays/components/availability/ChildRatesSection", () => ({
  default: () => <div>child-rates-section</div>,
}));

import StaysAvailabilityPage from "../StaysAvailabilityPage";

const renderPage = (url = "/stays/availability") =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <StaysAvailabilityPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  teamRoleState.hasPermission = () => true;
});

describe("StaysAvailabilityPage section routing", () => {
  it("renders the calendar when no section is requested", () => {
    renderPage();
    expect(screen.getByText("calendar-section")).toBeInTheDocument();
    expect(screen.getByTestId("tabs")).toHaveTextContent("calendar");
  });

  it.each([
    ["open-close", "open-close-section"],
    ["copy-rates", "copy-rates-section"],
    ["restrictions", "restrictions-section"],
    ["rate-plans", "rate-plans-section"],
    ["value-adds", "value-adds-section"],
    ["guest-pricing", "guest-pricing-section"],
    ["child-rates", "child-rates-section"],
  ])("renders the %s section from the query string", (section, marker) => {
    renderPage(`/stays/availability?section=${section}`);
    expect(screen.getByText(marker)).toBeInTheDocument();
    expect(screen.getByTestId("tabs")).toHaveTextContent(section);
  });

  it("falls back to the calendar without stays.rates for Rate plans", () => {
    teamRoleState.hasPermission = (permission) => permission !== "stays.rates";
    renderPage("/stays/availability?section=rate-plans");

    expect(screen.getByText("calendar-section")).toBeInTheDocument();
    expect(screen.getByTestId("tabs")).toHaveTextContent("calendar");
  });
});
