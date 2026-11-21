import { describe, expect, it } from "vitest";
import {
  groupByDate,
  isRecent,
  notificationTypeConfig,
  timeAgo,
} from "../utils/notificationPresentation";
import { NOTIFICATION_TYPES } from "../constants";

const at = (offsetMs) => new Date(Date.now() - offsetMs).toISOString();

describe("timeAgo", () => {
  it("scales from seconds to a date", () => {
    expect(timeAgo(new Date().toISOString())).toBe("Just now");
    expect(timeAgo(at(5 * 60_000))).toBe("5m ago");
    expect(timeAgo(at(3 * 3_600_000))).toBe("3h ago");
    expect(timeAgo(at(2 * 86_400_000))).toBe("2d ago");
    // Past a week a date beats "12d ago".
    expect(timeAgo(at(30 * 86_400_000))).not.toMatch(/ago$/);
  });

  it("returns nothing for a missing or unparseable date", () => {
    expect(timeAgo(undefined)).toBe("");
    expect(timeAgo("not a date")).toBe("");
  });

  it("treats a server clock running ahead as just now", () => {
    expect(timeAgo(at(-60_000))).toBe("Just now");
  });
});

describe("isRecent", () => {
  it("is true inside the relative-time window and false outside it", () => {
    expect(isRecent(new Date().toISOString())).toBe(true);
    expect(isRecent(at(6 * 86_400_000))).toBe(true);
    expect(isRecent(at(10 * 86_400_000))).toBe(false);
    expect(isRecent("not a date")).toBe(false);
  });
});

describe("groupByDate", () => {
  it("orders Today, Yesterday, then dated groups even from an unsorted feed", () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = groupByDate([
      { id: "old", date: "2026-01-02T10:00:00.000Z" },
      { id: "yesterday", date: yesterday.toISOString() },
      { id: "today", date: today.toISOString() },
    ]);

    expect(groups[0][0]).toBe("Today");
    expect(groups[1][0]).toBe("Yesterday");
    expect(groups[0][1].map((n) => n.id)).toEqual(["today"]);
    expect(groups[1][1].map((n) => n.id)).toEqual(["yesterday"]);
  });

  it("returns an empty array for an empty feed", () => {
    expect(groupByDate([])).toEqual([]);
    expect(groupByDate()).toEqual([]);
  });
});

describe("notificationTypeConfig", () => {
  it("gives every type a chip, a label and a group", () => {
    for (const [type, config] of Object.entries(NOTIFICATION_TYPES)) {
      expect(config.icon, type).toBeTruthy();
      expect(config.chip, type).toMatch(/bg-/);
      expect(config.chip, type).toMatch(/text-/);
      expect(config.label, type).toBeTruthy();
      expect(config.group, type).toBeTruthy();
    }
  });

  it("falls back to the system style for an unknown type", () => {
    expect(notificationTypeConfig("nope")).toBe(NOTIFICATION_TYPES.system);
  });
});
