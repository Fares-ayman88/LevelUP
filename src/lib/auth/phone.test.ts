import { describe, expect, it } from "vitest";

import { InvalidPhoneNumberError, normalizeEgyptianMobile } from "./phone";

describe("normalizeEgyptianMobile", () => {
  it.each([
    ["01012345678", "+201012345678"],
    ["+20 10 1234 5678", "+201012345678"],
    ["00201112345678", "+201112345678"],
    ["201512345678", "+201512345678"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeEgyptianMobile(input)).toBe(expected);
  });

  it("rejects invalid or unsupported numbers", () => {
    expect(() => normalizeEgyptianMobile("0123456789")).toThrow(InvalidPhoneNumberError);
    expect(() => normalizeEgyptianMobile("+201312345678")).toThrow(InvalidPhoneNumberError);
    expect(() => normalizeEgyptianMobile("not a phone")).toThrow(InvalidPhoneNumberError);
  });
});
