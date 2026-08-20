import { describe, expect, it } from "vitest";

import { InvalidEmailAddressError, normalizeEmailAddress } from "./email";

describe("normalizeEmailAddress", () => {
  it("trims and lowercases email addresses", () => {
    expect(normalizeEmailAddress("  Student@LevelUp.Demo ")).toBe("student@levelup.demo");
  });

  it("rejects malformed email addresses", () => {
    expect(() => normalizeEmailAddress("not-an-email")).toThrow(InvalidEmailAddressError);
  });
});
