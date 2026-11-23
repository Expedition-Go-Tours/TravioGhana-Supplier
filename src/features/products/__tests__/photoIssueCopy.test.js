import { describe, it, expect } from "vitest";
import {
  describePhotoIssue,
  findPhotoIssue,
  indexPhotoIssues,
} from "../photoIssueCopy";
import { IDEAL_PHOTO_WIDTH, MIN_PHOTO_WIDTH } from "../photoRules";

describe("describePhotoIssue", () => {
  it("names the real pixel size and the crop for a portrait photo", () => {
    const copy = describePhotoIssue({ problem: "portrait", width: 566, height: 755 });
    expect(copy.tone).toBe("urgent");
    expect(copy.size).toBe("566×755");
    expect(copy.body).toContain("566×755");
    expect(copy.body.toLowerCase()).toContain("landscape");
  });

  it("quotes the mobile floor for a photo under it", () => {
    const copy = describePhotoIssue({ problem: "too-small", width: 1210, height: 680 });
    expect(copy.tone).toBe("urgent");
    expect(copy.body).toContain(`${MIN_PHOTO_WIDTH}px`);
  });

  it("keeps soft-on-desktop quiet and quotes the ideal width", () => {
    const copy = describePhotoIssue({ problem: "soft-on-desktop", width: 1448, height: 1086 });
    expect(copy.tone).toBe("soft");
    expect(copy.label).toBe("Sharper?");
    expect(copy.body).toContain(`${IDEAL_PHOTO_WIDTH}px`);
  });

  it("still says something useful for an unknown problem code", () => {
    const copy = describePhotoIssue({ problem: "something-new", width: 0, height: 0 });
    expect(copy.size).toBeNull();
    expect(copy.body).toContain("1280px");
  });
});

describe("indexPhotoIssues / findPhotoIssue", () => {
  const issue = {
    url: "https://res.cloudinary.com/dfpagrtoy/image/upload/v1/tours/beach-day.jpg",
    problem: "portrait",
    width: 566,
    height: 755,
  };

  it("matches the stored URL exactly", () => {
    const index = indexPhotoIssues([issue]);
    expect(findPhotoIssue(index, issue.url)).toBe(issue);
  });

  it("matches the same asset behind a transform segment", () => {
    const index = indexPhotoIssues([issue]);
    const transformed =
      "https://res.cloudinary.com/dfpagrtoy/image/upload/w_800,q_auto/v1/tours/beach-day.jpg";
    expect(findPhotoIssue(index, transformed)).toBe(issue);
  });

  it("ignores query strings on either side", () => {
    const index = indexPhotoIssues([{ ...issue, url: `${issue.url}?v=2` }]);
    expect(findPhotoIssue(index, issue.url)).not.toBeNull();
  });

  it("returns null for a photo the audit did not flag", () => {
    const index = indexPhotoIssues([issue]);
    expect(findPhotoIssue(index, ".../tours/another.jpg")).toBeNull();
    expect(findPhotoIssue(null, issue.url)).toBeNull();
    expect(findPhotoIssue(index, "")).toBeNull();
  });

  it("tolerates a missing or malformed issue list", () => {
    expect(indexPhotoIssues(null).size).toBe(0);
    expect(indexPhotoIssues([{ problem: "portrait" }]).size).toBe(0);
  });
});
