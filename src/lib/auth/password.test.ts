import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies the original password and rejects another password", async () => {
    const hash = await hashPassword("A development password with enough length");

    await expect(verifyPassword("A development password with enough length", hash)).resolves.toBe(true);
    await expect(verifyPassword("A different development password", hash)).resolves.toBe(false);
  });

  it("fails closed for malformed or missing password hashes", async () => {
    await expect(verifyPassword("A development password with enough length", null)).resolves.toBe(false);
    await expect(verifyPassword("A development password with enough length", "not-a-password-hash")).resolves.toBe(false);
  });
});
