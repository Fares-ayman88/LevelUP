import { describe, expect, it } from "vitest";

import { hasCompleteUniqueRoster, isScoreWithinRange } from "./academic-record-rules";

describe("academic record rules", () => {
  it("requires every active enrollment exactly once", () => {
    expect(hasCompleteUniqueRoster(["a", "b", "c"], ["a", "b", "c"])).toBe(true);
    expect(hasCompleteUniqueRoster(["a", "b"], ["a", "b", "c"])).toBe(false);
    expect(hasCompleteUniqueRoster(["a", "b", "b"], ["a", "b", "c"])).toBe(false);
    expect(hasCompleteUniqueRoster(["a", "b", "c"], ["a", "b", "d"])).toBe(false);
  });

  it("accepts only whole scores inside the assessment range", () => {
    expect(isScoreWithinRange(null, 20)).toBe(true);
    expect(isScoreWithinRange(0, 20)).toBe(true);
    expect(isScoreWithinRange(20, 20)).toBe(true);
    expect(isScoreWithinRange(-1, 20)).toBe(false);
    expect(isScoreWithinRange(21, 20)).toBe(false);
    expect(isScoreWithinRange(12.5, 20)).toBe(false);
  });
});
