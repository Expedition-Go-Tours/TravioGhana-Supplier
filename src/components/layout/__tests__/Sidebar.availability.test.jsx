/**
 * Availability is the one expandable Stays sidebar section. These tests pin the
 * three things the workspace requires: all eight sections render, Rate plans is
 * hidden from members without `stays.rates`, and a deep link opens the submenu
 * on the active section.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const teamRoleState = {
  isOwner: true,
  teamRoles: ["admin"],
  permissions: ["*"],
  hasPermission: (permission) =>
    teamRoleState.permissions.includes("*") || teamRoleState.permissions.includes(permission),
};

vi.mock("@/hooks/useTeamRole", () => ({
  useTeamRole: () => teamRoleState,
}));

vi.mock("@/features/auth/api", () => ({
  loadSupplierProfile: vi.fn(async () => null),
}));

vi.mock("@/lib/axios", () => ({
  default: { get: vi.fn(async () => ({ data: { data: {} } })) },
}));

import Sidebar from "../Sidebar";
import { useAuthStore } from "@/stores/authStore";
import { useStaysWorkspaceStore } from "@/stores/staysWorkspaceStore";
import { WORKSPACES } from "@/config/staysWorkspace";
import { useSidebarStore } from "@/stores/sidebarStore";

const SECTION_LABELS = [
  "Calendar",
  "Open/close rooms",
  "Copy rates to future dates",
  "Dynamic restriction rules",
  "Rate plans",
  "Value adds",
  "Pricing per guest",
  "Child rates",
];

const renderSidebar = (path = "/stays/availability") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar />
    </MemoryRouter>,
  );

beforeEach(() => {
  teamRoleState.isOwner = true;
  teamRoleState.teamRoles = ["admin"];
  teamRoleState.permissions = ["*"];
  useSidebarStore.setState({ isCollapsed: false, isMobileOpen: false });
  useStaysWorkspaceStore.setState({ workspace: WORKSPACES.STAYS, userOverride: true });
  useAuthStore.setState({
    user: { id: "u-1", name: "Owner", email: "owner@example.com", roles: ["supplier"] },
    token: "token",
    isAuthenticated: true,
    isLoading: false,
    supplierProfile: null,
  });
});

describe("Stays Availability sidebar submenu", () => {
  it("shows all eight sections on the active route", () => {
    renderSidebar();

    for (const label of SECTION_LABELS) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }

    expect(
      screen.getByRole("link", { name: "Copy rates to future dates" }),
    ).toHaveAttribute("href", "/stays/availability?section=copy-rates");
  });

  it("hides Rate plans when the member lacks stays.rates", () => {
    teamRoleState.isOwner = false;
    teamRoleState.teamRoles = ["editor"];
    teamRoleState.permissions = ["stays.view", "stays.availability"];

    renderSidebar();

    expect(screen.getByRole("link", { name: "Calendar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Value adds" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Rate plans" })).not.toBeInTheDocument();
  });

  it("opens on a deep section link and marks only that row current", () => {
    renderSidebar("/stays/availability?section=copy-rates");

    expect(
      screen.getByRole("link", { name: "Copy rates to future dates" }),
    ).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Calendar" })).not.toHaveAttribute("aria-current");
  });

  it("collapses and reopens from the chevron", async () => {
    const user = userEvent.setup();
    renderSidebar();

    const collapse = screen.getByRole("button", { name: "Collapse Availability sections" });
    await user.click(collapse);

    expect(screen.queryByRole("link", { name: "Open/close rooms" })).not.toBeInTheDocument();

    const expand = screen.getByRole("button", { name: "Expand Availability sections" });
    await user.click(expand);

    expect(screen.getByRole("link", { name: "Open/close rooms" })).toBeInTheDocument();
  });
});
