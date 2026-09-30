/**
 * The "Group Type" row read `content.isPrivateActivity`, a field with no
 * control anywhere in the supplier app, so it rendered "Group" for every
 * product no matter what the Step 12 private pill said.
 */
import { describe, expect, it } from "vitest";
import { groupTypeLabel } from "../groupTypeLabel";

describe("groupTypeLabel", () => {
  it("follows the Step 12 private pill on a single-option product", () => {
    expect(groupTypeLabel({ options: [{ id: "a", isPrivate: false }] })).toBe("Group");
    expect(groupTypeLabel({ options: [{ id: "a", isPrivate: true }] })).toBe("Private");
  });

  it("reports Mixed when only some options are private", () => {
    expect(
      groupTypeLabel({
        options: [
          { id: "a", isPrivate: false },
          { id: "b", isPrivate: true },
        ],
      })
    ).toBe("Mixed");
  });

  it("reports Private when every option is private", () => {
    expect(
      groupTypeLabel({
        options: [
          { id: "a", isPrivate: true },
          { id: "b", isPrivate: true },
        ],
      })
    ).toBe("Private");
  });

  it("ignores options that never had the flag written", () => {
    expect(groupTypeLabel({ options: [{ id: "a" }], isPrivateActivity: true })).toBe("Private");
    expect(groupTypeLabel({ options: [{ id: "a" }] })).toBe("Group");
  });

  it("falls back to the product-level flag when there are no options", () => {
    expect(groupTypeLabel({ isPrivateActivity: true })).toBe("Private");
    expect(groupTypeLabel({ isPrivateActivity: false })).toBe("Group");
  });

  it("keeps the old behaviour for an empty or missing payload", () => {
    expect(groupTypeLabel()).toBe("Group");
    expect(groupTypeLabel({})).toBe("Group");
    expect(groupTypeLabel({ options: [] })).toBe("Group");
  });
});
