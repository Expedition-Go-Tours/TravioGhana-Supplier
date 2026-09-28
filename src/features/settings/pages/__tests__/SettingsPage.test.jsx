/**
 * The settings profile tab must be driven by the supplier application, never
 * by hard-coded labels: operating regions the supplier selected must render
 * (and be editable), individual tour guides must get a "Public profile"
 * without business-only fields, and the identity details from the application
 * must be shown read-only.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const apiState = vi.hoisted(() => ({
  user: null,
  biz: null,
  updateBusinessProfile: vi.fn().mockResolvedValue({}),
}));

const authState = vi.hoisted(() => ({
  user: {
    name: "Test User", email: "test@example.com", phone: "",
    language: "en", timezone: "UTC", logoUrl: null, photoURL: "",
  },
  supplierProfile: null,
  updateUser: vi.fn(),
  setSupplierProfile: vi.fn(),
}));

vi.mock("@/features/settings/api", () => ({
  fetchCurrentUser: vi.fn(() => Promise.resolve(apiState.user)),
  fetchBusinessProfile: vi.fn(() => Promise.resolve(apiState.biz)),
  updateBusinessProfile: (...args) => apiState.updateBusinessProfile(...args),
  updateCurrentUser: vi.fn(() => Promise.resolve({})),
  uploadSupplierLogo: vi.fn(() => Promise.resolve({ logoUrl: null })),
  fetchNotificationPreferences: vi.fn(() => Promise.resolve(null)),
  updateNotificationPreferences: vi.fn(() => Promise.resolve({})),
  fetchNotificationRecipients: vi.fn(() => Promise.resolve([])),
  addNotificationRecipient: vi.fn(() => Promise.resolve(null)),
  updateNotificationRecipient: vi.fn(() => Promise.resolve(null)),
  resendNotificationRecipient: vi.fn(() => Promise.resolve(null)),
  removeNotificationRecipient: vi.fn(() => Promise.resolve(null)),
  fetchTaxInfo: vi.fn(() => Promise.resolve(null)),
  updateTaxInfo: vi.fn(() => Promise.resolve({})),
  fetchBookingRules: vi.fn(() => Promise.resolve(null)),
  updateBookingRules: vi.fn(() => Promise.resolve({})),
  fetchTeamMembers: vi.fn(() => Promise.resolve([])),
  inviteTeamMember: vi.fn(() => Promise.resolve({ member: null, emailSent: false })),
  removeTeamMember: vi.fn(() => Promise.resolve({})),
  updateTeamMemberRole: vi.fn(() => Promise.resolve({})),
  directAddTeamMember: vi.fn(() => Promise.resolve(null)),
  resendInvite: vi.fn(() => Promise.resolve({ emailSent: false })),
  revokeTeamInvite: vi.fn(() => Promise.resolve({})),
  fetchPayoutMethods: vi.fn(() => Promise.resolve([])),
  createPayoutMethod: vi.fn(() => Promise.resolve(null)),
  deletePayoutMethod: vi.fn(() => Promise.resolve({})),
  fetchPayouts: vi.fn(() => Promise.resolve({})),
  fetchPayoutSettings: vi.fn(() => Promise.resolve(null)),
  fetchFinanceSummary: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@/stores/authStore", () => {
  const useAuthStore = (selector) => selector(authState);
  useAuthStore.getState = () => authState;
  return { useAuthStore, getAuthToken: () => "test-token" };
});

vi.mock("@/hooks/useTeamRole", () => ({
  useTeamRole: () => ({ hasPermission: () => true, isOwner: true, teamRoles: [] }),
}));

const toastMock = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast: toastMock }));

import SettingsPage from "../SettingsPage";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/settings?tab=profile"]}>
      <SettingsPage />
    </MemoryRouter>,
  );
}

const individualGuideApplication = {
  businessInfo: {
    displayName: "Kofi Solo",
    supplierChoice: "individual_guide",
    businessType: "individual",
    address: { line1: "12 Liberation Rd", line2: "", city: "Accra", state: "Greater Accra", postalCode: "GA-123" },
    country: "GH",
    description: "Walking tours of Accra",
  },
  operatingInfo: { regions: ["Greater Accra", "Central"], services: ["tours"], tourCategories: ["Cultural"] },
  representativeInfo: {
    fullName: "Kofi Mensah",
    email: "kofi@example.com",
    phoneNumber: "+233501234567",
    dateOfBirth: "1990-01-01",
    idType: "national_id",
    idNumber: "GA-123456789",
  },
  supplierType: "TOUR_GUIDE",
  status: "ACTIVE",
};

const companyApplication = {
  businessInfo: {
    displayName: "Gideon Expeditions",
    legalBusinessName: "Gideon Expeditions Ltd",
    businessType: "company",
    registrationNumber: "CS1234567890",
    tin: "C0012345678",
    yearEstablished: 2018,
    address: { line1: "42 Liberation Road", line2: "", city: "Accra", state: "Greater Accra", postalCode: "" },
    country: "GH",
  },
  operatingInfo: { regions: ["Ashanti"], services: ["tours"] },
  representativeInfo: { fullName: "Gideon Wilson" },
  supplierType: "TOUR_COMPANY",
  status: "ACTIVE",
};

const baseUser = {
  name: "Test User", email: "test@example.com", phone: "+233501234567",
  language: "en", timezone: "UTC", logoUrl: null, photoURL: "",
};

beforeEach(() => {
  apiState.user = baseUser;
  apiState.biz = null;
  apiState.updateBusinessProfile.mockClear();
  toastMock.error.mockClear();
  toastMock.success.mockClear();
});

describe("SettingsPage profile tab — driven by the supplier application", () => {
  it("renders a Public Profile (no business fields) for an individual tour guide", async () => {
    apiState.biz = individualGuideApplication;
    renderPage();

    expect(await screen.findByText("Public Profile")).toBeInTheDocument();

    // Business-only fields are hidden for individuals.
    expect(screen.queryByText("Legal Business Name")).not.toBeInTheDocument();
    expect(screen.queryByText("Registration Number")).not.toBeInTheDocument();
    expect(screen.queryByText("Tax Identification Number (TIN)")).not.toBeInTheDocument();
    expect(screen.queryByText("Year Established")).not.toBeInTheDocument();
    expect(screen.queryByText("Business Type")).not.toBeInTheDocument();

    // Brand name comes from the application's displayName.
    expect(screen.getByDisplayValue("Kofi Solo")).toBeInTheDocument();

    // Address is un-nested back into the form inputs.
    expect(screen.getByDisplayValue("12 Liberation Rd")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Accra")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Greater Accra")).toBeInTheDocument();

    // Operating regions from the application render as selected pills.
    expect(screen.getByRole("button", { name: "Greater Accra" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Central" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Ashanti" })).toHaveAttribute("aria-pressed", "false");
  });

  it("shows the full Business Profile for a registered company", async () => {
    apiState.biz = companyApplication;
    renderPage();

    expect(await screen.findByText("Business Profile")).toBeInTheDocument();
    expect(screen.getByText("Legal Business Name")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Gideon Expeditions Ltd")).toBeInTheDocument();
    expect(screen.getByDisplayValue("CS1234567890")).toBeInTheDocument();
    expect(screen.getByText("Registration Number")).toBeInTheDocument();
    expect(screen.getByText("Year Established")).toBeInTheDocument();
  });

  it("shows the application identity read-only, masking the ID number", async () => {
    apiState.biz = individualGuideApplication;
    renderPage();

    expect(await screen.findByText("Verification Identity")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Kofi Mensah")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1990-01-01")).toBeInTheDocument();
    expect(screen.getByDisplayValue("national_id")).toBeInTheDocument();
    expect(screen.getByDisplayValue("••••••••6789")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("GA-123456789")).not.toBeInTheDocument();
  });

  it("saves the brand name, nested address and operating regions together", async () => {
    apiState.biz = individualGuideApplication;
    renderPage();
    await screen.findByText("Public Profile");

    // Make an edit so the save button enables (it is disabled until the form
    // differs from what was loaded).
    fireEvent.change(screen.getByDisplayValue("Walking tours of Accra"), {
      target: { value: "Walking tours of Greater Accra" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));

    await waitFor(() => expect(apiState.updateBusinessProfile).toHaveBeenCalledTimes(1));
    const payload = apiState.updateBusinessProfile.mock.calls[0][0];
    expect(payload.businessInfo.displayName).toBe("Kofi Solo");
    expect(payload.businessInfo.description).toBe("Walking tours of Greater Accra");
    expect(payload.businessInfo.address).toEqual({
      line1: "12 Liberation Rd", line2: "", city: "Accra", state: "Greater Accra", postalCode: "",
    });
    expect(payload.operatingInfo).toEqual({
      regions: ["Greater Accra", "Central"],
      services: ["tours"],
      tourCategories: ["Cultural"],
    });
  });

  it("blocks saving when no operating region is selected", async () => {
    apiState.biz = {
      ...individualGuideApplication,
      operatingInfo: { regions: [], services: ["tours"] },
    };
    renderPage();
    await screen.findByText("Public Profile");

    // Edit the brand name so the save button enables — regions are still
    // empty, which must block the save.
    fireEvent.change(screen.getByDisplayValue("Kofi Solo"), {
      target: { value: "Kofi Solo Tours" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));

    await waitFor(() => expect(apiState.updateBusinessProfile).not.toHaveBeenCalled());
    expect(toastMock.error).toHaveBeenCalledWith("Select at least one region you operate in");
  });
});