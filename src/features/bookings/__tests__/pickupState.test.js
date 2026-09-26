import { describe, expect, it } from "vitest";

import { resolvePickupState, pickupStateMeta } from "../lib/pickupState";

describe("resolvePickupState", () => {
  it("prefers the server-derived state", () => {
    expect(resolvePickupState({ pickupState: "incomplete" })).toBe("incomplete");
    expect(resolvePickupState({ pickupState: "deferred", pickupDeferred: false })).toBe("deferred");
  });

  it("falls back to the booking flags", () => {
    expect(resolvePickupState({ pickupDeferred: true })).toBe("deferred");
    expect(resolvePickupState({ isIncomplete: true })).toBe("incomplete");
    expect(resolvePickupState({})).toBe("confirmed");
    expect(resolvePickupState(null)).toBe("deferred");
  });

  it("has no yellow in its tokens", () => {
    for (const state of ["confirmed", "deferred", "incomplete"]) {
      const meta = pickupStateMeta(state);
      expect(meta.label).toBeTruthy();
      expect(`${meta.chip} ${meta.dot} ${meta.accent}`).not.toMatch(/amber|yellow|#fcd34d|#ffc400/);
    }
    // Unknown states degrade to the informational sky treatment, never yellow.
    expect(pickupStateMeta("nope").chip).toMatch(/sky/);
  });
});
