import { describe, expect, it } from "vitest";
import {
  PROPERTY_GROUPS,
  PROPERTY_TYPES,
  propertyGroupForType,
} from "../constants";

describe("PROPERTY_GROUPS — the chooser's four category cards", () => {
  it("covers every canonical property type exactly once", () => {
    const grouped = PROPERTY_GROUPS.flatMap((group) => group.types);
    expect(new Set(grouped).size).toBe(grouped.length);
    expect(new Set(grouped)).toEqual(new Set(PROPERTY_TYPES));
  });

  it("keeps one quick-start group, and gives every group copy and a valid default", () => {
    const quickStart = PROPERTY_GROUPS.filter((group) => group.quickStart);
    expect(quickStart).toHaveLength(1);
    // The quick-start card detours through its intro screen.
    expect(quickStart[0].introPath).toBe("/stays/properties/build/quick-start");

    const ids = PROPERTY_GROUPS.map((group) => group.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const group of PROPERTY_GROUPS) {
      expect(group.label).toBeTruthy();
      expect(group.description).toBeTruthy();
      expect(group.scope?.singular).toBeTruthy();
      expect(group.scope?.plural).toBeTruthy();
      expect(group.types.length).toBeGreaterThan(0);
      expect(group.types).toContain(group.defaultType);
    }
  });

  it("resolves a type back to its group", () => {
    expect(propertyGroupForType("Villa")?.id).toBe("homes");
    expect(propertyGroupForType("Hotel")?.id).toBe("hotel");
    expect(propertyGroupForType("Serviced apartment")?.id).toBe("apartment");
    expect(propertyGroupForType("Unknown stay")).toBeNull();
  });
});
