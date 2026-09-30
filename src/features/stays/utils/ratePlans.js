/**
 * Rate-plan pricing — mirrors the prototype's `planPrice`:
 * a derived plan recalculates from the room's base price, a fixed plan uses
 * its own nightly price. Kept as a pure function so builder step 4, the Rates
 * page and the plan cards all quote the same number.
 */
export function planPrice(plan, room) {
  if (plan?.pricingModel === "Derived from room base rate") {
    return Math.round(Number(room?.price || 0) * (1 + Number(plan.adjustmentPct || 0) / 100));
  }
  return Number(plan?.price || 0);
}

/**
 * The default plan the workspace creates for a fresh room (the prototype's
 * `defaultPlan`). Lives here — not in the mock — so the builder, the mock
 * dataset and the API layer share one definition.
 */
export function defaultPlanForRoom(room) {
  return {
    id: `plan-${room.id}`,
    roomId: room.id,
    name: "Standard rate",
    pricingModel: "Fixed nightly rate",
    price: Number(room.price) || 0,
    weekend: Number(room.weekend || room.price) || 0,
    adjustmentPct: 0,
    meal: room.meal || "Room only",
    cancellation: "Free cancellation",
    freeCancellationHours: 24,
    penalty: "First night",
    noShow: "Full stay",
    bookingCutoffHours: 2,
    latestBookingTime: "18:00",
    maxAdvanceDays: 365,
    minStay: 1,
    maxStay: 30,
    baseGuests: Number(room.adults) || 2,
    singleGuestDiscount: 0,
    extraAdult: 0,
    extraChild: 0,
    closedArrival: false,
    closedDeparture: false,
    includesTaxes: "Yes",
  };
}

/** The chips under a plan title (prototype's `.plan-meta`). */
export function planMetaChips(plan) {
  const chips = [
    `Book ≥ ${plan.bookingCutoffHours ?? 0}h ahead`,
    `${plan.minStay || 1}–${plan.maxStay || 30} nights`,
  ];
  if (plan.freeCancellationHours && plan.cancellation === "Free cancellation") {
    chips.push(`Cancel ≥ ${plan.freeCancellationHours}h ahead`);
  } else {
    chips.push(plan.cancellation || "Free cancellation");
  }
  return chips;
}
