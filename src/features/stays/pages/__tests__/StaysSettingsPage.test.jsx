/**
 * Settings — the Stays workspace's own account pages: the six tabs render
 * from the Stays mock (profile, notification preferences/recipients, payout
 * methods in USD, tax info and team), and the team flows write back to it.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const authState = {
  user: {
    name: "Ama Mensah",
    email: "ama@akwaabacoast.com",
    phone: "+233 24 000 0000",
    language: "en",
    timezone: "Africa/Accra",
    logoUrl: null,
    photoURL: "",
  },
  supplierProfile: null,
  updateUser: vi.fn(),
  setSupplierProfile: vi.fn(),
};

vi.mock("@/stores/authStore", () => {
  const useAuthStore = (selector) => selector(authState);
  useAuthStore.getState = () => authState;
  return { useAuthStore, getAuthToken: () => "test-token" };
});

vi.mock("@/hooks/useTeamRole", () => ({
  useTeamRole: () => ({ hasPermission: () => true, isOwner: true, teamRoles: [] }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

import StaysSettingsPage from "../StaysSettingsPage";
import { staysMock } from "../../mock/store";

beforeEach(() => staysMock.reset());

function renderPage(entry = "/stays/settings?tab=profile") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <StaysSettingsPage />
    </MemoryRouter>,
  );
}

const openTab = async (user, name) => {
  await user.click(screen.getByRole("button", { name }));
};

describe("StaysSettingsPage — the Stays account settings", () => {
  it("offers all six tabs", async () => {
    renderPage();

    await screen.findByText("Settings");
    for (const label of ["Profile", "Notifications", "Payout Settings", "Security", "Tax Information", "Team"]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
  });

  it("loads the business profile from the Stays account", async () => {
    renderPage();

    expect((await screen.findAllByDisplayValue("Akwaaba Coast Ltd")).length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue("Akwaaba Coast Hotel").length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue("CS-123456789").length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue("C0012345678").length).toBeGreaterThan(0);
  });

  it("shows the notification preferences and additional emails", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Settings");
    await openTab(user, "Notifications");

    expect(await screen.findByText("Notification Preferences")).toBeTruthy();
    expect(await screen.findByText("frontdesk@akwaabacoast.com")).toBeTruthy();
    expect(screen.getByText("accounts@akwaabacoast.com")).toBeTruthy();
    // The reference email types speak Stays: check-in updates, property reviews.
    expect(screen.getAllByText("Bookings & operations").length).toBeGreaterThan(0);
  });

  it("renders payout methods and recent payouts in USD", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Settings");
    await openTab(user, "Payout Settings");

    expect((await screen.findAllByText("Payout Methods")).length).toBeGreaterThan(0);
    expect(await screen.findByText("Ecobank Ghana")).toBeTruthy();
    expect(screen.getAllByText(/USD/).length).toBeGreaterThan(0);
    expect(await screen.findByText("PR-2026-001")).toBeTruthy();
    expect(screen.getByText("1–15 Oct")).toBeTruthy();
    expect(screen.getByText("$1,530.00")).toBeTruthy();
  });

  it("shows the seeded team with roles and statuses, and invites a member", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Settings");
    await openTab(user, "Team");

    expect(await screen.findByText("kwesi@akwaabacoast.com")).toBeTruthy();
    expect(screen.getByText("adjoa@akwaabacoast.com")).toBeTruthy();
    expect(screen.getByText("finance@akwaabacoast.com")).toBeTruthy();
    expect(screen.getByText("Editor")).toBeTruthy();
    expect(screen.getByText("Support")).toBeTruthy();
    expect(screen.getByText("Pending")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Invite Member/ }));
    // The invite picker describes the roles in property terms.
    expect(screen.getByText(/Manage properties, bookings and rates/)).toBeTruthy();

    await user.type(screen.getByPlaceholderText("colleague@example.com"), "newhost@akwaabacoast.com");
    await user.click(screen.getByRole("button", { name: "Send Invitation" }));

    expect(await screen.findByText("newhost@akwaabacoast.com")).toBeTruthy();
    const stored = await staysMock.listTeamMembers();
    expect(stored.some((member) => member.email === "newhost@akwaabacoast.com")).toBe(true);
  });

  it("loads the tax information and changes a password through the mock", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Settings");
    await openTab(user, "Tax Information");
    expect(await screen.findByDisplayValue("C0012345678")).toBeTruthy();

    await openTab(user, "Security");
    expect(await screen.findByText("Change Password")).toBeTruthy();
    // The password labels are not tied to their inputs (shared with the
    // Experiences page), so the three controls are addressed in order.
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    expect(passwordInputs.length).toBe(3);
    await user.type(passwordInputs[0], "old-password");
    await user.type(passwordInputs[1], "new-password-1");
    await user.type(passwordInputs[2], "new-password-1");
    await user.click(screen.getByRole("button", { name: /Update Password/ }));

    await waitFor(() => {
      expect(document.querySelectorAll('input[type="password"]')[0].value).toBe("");
    });
  });
});
