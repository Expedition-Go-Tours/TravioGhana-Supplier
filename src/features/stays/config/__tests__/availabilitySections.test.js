import { describe, expect, it } from "vitest";
import {
  AVAILABILITY_SECTIONS,
  DEFAULT_AVAILABILITY_SECTION,
  availabilitySection,
  isAvailabilitySection,
} from "../availabilitySections";

describe("availability sections", () => {
  it("contains exactly the eight requested sections, in order", () => {
    expect(AVAILABILITY_SECTIONS.map((section) => section.label)).toEqual([
      "Calendar",
      "Open/close rooms",
      "Copy rates to future dates",
      "Dynamic restriction rules",
      "Rate plans",
      "Value adds",
      "Pricing per guest",
      "Child rates",
    ]);
  });

  it("uses unique ids and a calendar default", () => {
    const ids = AVAILABILITY_SECTIONS.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(DEFAULT_AVAILABILITY_SECTION).toBe("calendar");
    expect(isAvailabilitySection("copy-rates")).toBe(true);
    expect(availabilitySection("missing")).toBe(AVAILABILITY_SECTIONS[0]);
  });

  it("guards only Rate plans with stays.rates", () => {
    const guarded = AVAILABILITY_SECTIONS.filter((section) => section.permission);
    expect(guarded).toHaveLength(1);
    expect(guarded[0]).toMatchObject({ id: "rate-plans", permission: "stays.rates" });
  });
});
