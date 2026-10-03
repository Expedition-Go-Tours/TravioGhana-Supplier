import { describe, expect, it } from "vitest";
import { parseCoordinateInput } from "../coordinates";

describe("parseCoordinateInput", () => {
  it("accepts valid in-range pairs", () => {
    expect(parseCoordinateInput("5.6037", "-0.1870")).toEqual({ lat: 5.6037, lng: -0.187 });
  });

  it("accepts zero coordinates", () => {
    expect(parseCoordinateInput("0", "0")).toEqual({ lat: 0, lng: 0 });
  });

  it("rejects blanks, non-numbers and out-of-range values", () => {
    expect(parseCoordinateInput("", "0")).toBeNull();
    expect(parseCoordinateInput("5", "")).toBeNull();
    expect(parseCoordinateInput("abc", "0")).toBeNull();
    expect(parseCoordinateInput("91", "0")).toBeNull();
    expect(parseCoordinateInput("-90.1", "0")).toBeNull();
    expect(parseCoordinateInput("0", "-181")).toBeNull();
  });
});
