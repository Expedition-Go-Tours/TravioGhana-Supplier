/**
 * Rate plans open inline inside their room's card (no modal), save through
 * `onSavePlan` (new plans must not carry the default factory's seeded id),
 * and expose delete for existing plans.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RatePlanCards from "../RatePlanCards";

const ROOM = {
  id: "r1",
  name: "Deluxe King Room",
  count: 6,
  adults: 2,
  beds: "1 king bed",
  price: 750,
};

const PLAN = {
  id: "plan1",
  roomId: "r1",
  name: "Standard rate",
  pricingModel: "Fixed nightly rate",
  price: 750,
  weekend: 850,
  adjustmentPct: 0,
  meal: "Breakfast included",
  cancellation: "Free cancellation",
  freeCancellationHours: 24,
  penalty: "First night",
  noShow: "Full stay",
  bookingCutoffHours: 2,
  latestBookingTime: "18:00",
  maxAdvanceDays: 365,
  minStay: 1,
  maxStay: 30,
  baseGuests: 2,
  singleGuestDiscount: 0,
  extraAdult: 0,
  extraChild: 0,
  closedArrival: false,
  closedDeparture: false,
  includesTaxes: "Yes",
};

function renderCards(plans = [PLAN]) {
  const onSavePlan = vi.fn().mockResolvedValue({});
  const onDeletePlan = vi.fn().mockResolvedValue({});
  render(
    <RatePlanCards
      property={{ rooms: [ROOM], ratePlans: plans }}
      onSavePlan={onSavePlan}
      onDeletePlan={onDeletePlan}
    />,
  );
  return { onSavePlan, onDeletePlan };
}

describe("RatePlanCards — inline plan form", () => {
  it("opens the form inside the room card without a modal", async () => {
    const user = userEvent.setup();
    renderCards();

    await user.click(screen.getByRole("button", { name: /add rate plan/i }));

    expect(screen.getByRole("heading", { name: "Create rate plan" })).toBeTruthy();
    expect(screen.getByLabelText("Rate plan name *")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("creates a new plan without the seeded default id", async () => {
    const user = userEvent.setup();
    const { onSavePlan } = renderCards();

    await user.click(screen.getByRole("button", { name: /add rate plan/i }));
    await user.clear(screen.getByLabelText("Rate plan name *"));
    await user.type(screen.getByLabelText("Rate plan name *"), "Flex Rate");
    await user.click(screen.getByRole("button", { name: "Save rate plan" }));

    await waitFor(() => expect(onSavePlan).toHaveBeenCalledTimes(1));
    const payload = onSavePlan.mock.calls[0][0];
    expect(payload).toMatchObject({ roomId: "r1", name: "Flex Rate" });
    expect(payload.id).toBeUndefined();
  });

  it("edits an existing plan and can delete it", async () => {
    const user = userEvent.setup();
    const { onDeletePlan } = renderCards();

    await user.click(screen.getByRole("button", { name: "Edit plan" }));

    expect(screen.getByRole("heading", { name: "Edit rate plan" })).toBeTruthy();
    expect(screen.getByLabelText("Rate plan name *").value).toBe("Standard rate");

    await user.click(screen.getByRole("button", { name: /delete plan/i }));
    await waitFor(() => expect(onDeletePlan).toHaveBeenCalledTimes(1));
    expect(onDeletePlan.mock.calls[0][0]).toMatchObject({ id: "plan1" });
  });
});
