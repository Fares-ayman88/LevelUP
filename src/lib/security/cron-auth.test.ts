import { describe, expect, it } from "vitest";

import { hasValidCronAuthorization } from "./cron-auth";

describe("cron authorization", () => {
  const secret = "a-development-secret-with-more-than-thirty-two-characters";

  it("accepts only the configured bearer token", () => {
    expect(hasValidCronAuthorization(`Bearer ${secret}`, secret)).toBe(true);
    expect(hasValidCronAuthorization("Bearer not-the-secret", secret)).toBe(false);
  });

  it("rejects absent, malformed, and unconfigured credentials", () => {
    expect(hasValidCronAuthorization(null, secret)).toBe(false);
    expect(hasValidCronAuthorization(secret, secret)).toBe(false);
    expect(hasValidCronAuthorization(`Bearer ${secret}`, undefined)).toBe(false);
  });
});
