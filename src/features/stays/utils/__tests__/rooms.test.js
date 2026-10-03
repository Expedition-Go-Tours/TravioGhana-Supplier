import { describe, expect, it } from "vitest";
import { peopleLabel, roomPeople } from "../rooms";

describe("roomPeople", () => {
  it("sums adults and children for legacy rooms", () => {
    expect(roomPeople({ adults: 2, children: 1 })).toBe(3);
  });

  it("handles string numbers and missing values", () => {
    expect(roomPeople({ adults: "2", children: "1" })).toBe(3);
    expect(roomPeople({ adults: 2 })).toBe(2);
    expect(roomPeople({})).toBe(0);
    expect(roomPeople(null)).toBe(0);
  });
});

describe("peopleLabel", () => {
  it("pluralises the headcount", () => {
    expect(peopleLabel({ adults: 1 })).toBe("1 person");
    expect(peopleLabel({ adults: 2, children: 1 })).toBe("3 people");
  });
});
