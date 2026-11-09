import { describe, expect, it } from "vitest";
import { activityCutoff, isCancellationClosed } from "../lib/cancellationWindow";

const day = (offset) => new Date(Date.UTC(2026, 10, 9 + offset));
const at = (hour, minute = 0) => new Date(Date.UTC(2026, 10, 9, hour, minute));

describe("supplier cancellation window", () => {
  it("stays open on the activity morning", () => {
    expect(isCancellationClosed({ travelDate: day(0), selectedTime: "12:00" }, at(9))).toBe(false);
  });

  it("closes once the activity start time has passed", () => {
    expect(isCancellationClosed({ travelDate: day(0), selectedTime: "12:00" }, at(13))).toBe(true);
  });

  it("closes a past activity", () => {
    expect(isCancellationClosed({ travelDate: day(-1), selectedTime: "12:00" }, at(9))).toBe(true);
  });

  it("stays open the day before", () => {
    expect(isCancellationClosed({ travelDate: day(1), selectedTime: "12:00" }, at(9))).toBe(false);
  });

  it("treats a missing time slot as the end of the travel day", () => {
    expect(isCancellationClosed({ travelDate: day(0) }, at(23, 30))).toBe(false);
    expect(isCancellationClosed({ travelDate: day(0) }, day(1))).toBe(true);
  });

  it("reports the cutoff", () => {
    expect(activityCutoff({ travelDate: day(0), selectedTime: "12:00" }).toISOString())
      .toBe("2026-11-09T12:00:00.000Z");
    expect(activityCutoff({ travelDate: day(0) }).toISOString())
      .toBe("2026-11-09T23:59:59.999Z");
  });
});
