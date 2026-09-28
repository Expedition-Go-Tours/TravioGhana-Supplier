/**
 * The product-builder category step must be driven by the supplier's
 * application services: tours-only accounts see Tour + Activity, transport-only
 * accounts see Transport, and anything else keeps all three. A draft whose
 * category is no longer offered is cleared instead of silently stuck.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const builderState = vi.hoisted(() => ({
  category: "",
  subcategory: "",
  activitiesIncluded: [],
  transportModes: [],
  transportServices: [],
  difficulty: "",
  duration: null,
  durationUnit: "hours",
  accommodationIncluded: false,
  stepErrors: {},
  setField: vi.fn(),
  clearStepErrors: vi.fn(),
  normalizeDayLogistics: vi.fn(),
}));

const authState = vi.hoisted(() => ({
  supplierProfile: null,
}));

vi.mock("@/stores/authStore", () => {
  const useAuthStore = (selector) => selector(authState);
  useAuthStore.getState = () => authState;
  return { useAuthStore, getAuthToken: () => "test-token" };
});

vi.mock("@/features/products/productBuilderStore", () => {
  const useProductBuilderStore = (selector) => selector(builderState);
  useProductBuilderStore.getState = () => builderState;
  return { useProductBuilderStore };
});

import Step02Category from "../Step02Category";

function renderStep() {
  return render(<Step02Category />);
}

function withServices(services) {
  authState.supplierProfile = { operatingInfo: { services } };
}

describe("Step02Category — dynamic categories from selected services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.supplierProfile = null;
    Object.assign(builderState, {
      category: "",
      subcategory: "",
      activitiesIncluded: [],
      transportModes: [],
      transportServices: [],
      difficulty: "",
      duration: null,
      durationUnit: "hours",
      accommodationIncluded: false,
      stepErrors: {},
    });
  });

  it("tours-only services render only Tour and Activity", () => {
    withServices(["Tours & Activities"]);
    renderStep();

    expect(screen.getByText("Tour", { exact: true })).toBeTruthy();
    expect(screen.getByText("Activity", { exact: true })).toBeTruthy();
    expect(screen.queryByText("Transport", { exact: true })).toBeNull();
    expect(
      screen.getByText("Based on the services you selected, you can create tours and activities."),
    ).toBeTruthy();
  });

  it("transport-only services render only Transport", () => {
    withServices(["Airport Transfers", "Private Transport"]);
    renderStep();

    expect(screen.getByText("Transport", { exact: true })).toBeTruthy();
    expect(screen.queryByText("Tour", { exact: true })).toBeNull();
    expect(screen.queryByText("Activity", { exact: true })).toBeNull();
    expect(
      screen.getByText("Based on the services you selected, you can create transport products."),
    ).toBeTruthy();
  });

  it("a mixed selection renders all three categories", () => {
    withServices(["Tours & Activities", "Airport Transfers"]);
    renderStep();

    expect(screen.getByText("Tour", { exact: true })).toBeTruthy();
    expect(screen.getByText("Activity", { exact: true })).toBeTruthy();
    expect(screen.getByText("Transport", { exact: true })).toBeTruthy();
    expect(screen.queryByText(/Based on the services you selected/)).toBeNull();
  });

  it("Other Experience alone renders all three categories", () => {
    withServices(["Other Experience"]);
    renderStep();

    expect(screen.getByText("Tour", { exact: true })).toBeTruthy();
    expect(screen.getByText("Activity", { exact: true })).toBeTruthy();
    expect(screen.getByText("Transport", { exact: true })).toBeTruthy();
  });

  it("falls back to all three when no profile/services are available", () => {
    authState.supplierProfile = null;
    renderStep();

    expect(screen.getByText("Tour", { exact: true })).toBeTruthy();
    expect(screen.getByText("Activity", { exact: true })).toBeTruthy();
    expect(screen.getByText("Transport", { exact: true })).toBeTruthy();
  });

  it("legacy id services are gated the same way as labels", () => {
    withServices(["tours"]);
    renderStep();

    expect(screen.getByText("Tour", { exact: true })).toBeTruthy();
    expect(screen.queryByText("Transport", { exact: true })).toBeNull();
  });

  it("clears a draft category that is no longer offered", () => {
    withServices(["Airport Transfers"]);
    Object.assign(builderState, { category: "tour", subcategory: "guided" });
    renderStep();

    expect(builderState.setField).toHaveBeenCalledWith("category", "");
    expect(builderState.setField).toHaveBeenCalledWith("subcategory", "");
    expect(builderState.clearStepErrors).toHaveBeenCalledWith(3);
  });

  it("does not clear a category that is still offered", () => {
    withServices(["Tours & Activities"]);
    Object.assign(builderState, { category: "activity" });
    renderStep();

    expect(builderState.setField).not.toHaveBeenCalledWith("category", "");
    expect(builderState.clearStepErrors).not.toHaveBeenCalled();
  });
});