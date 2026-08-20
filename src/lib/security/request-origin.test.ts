import { describe, expect, it } from "vitest";

import { hasTrustedMutationOrigin } from "./request-origin";

describe("mutation origin validation", () => {
  it("accepts the origin of the current application request", () => {
    const request = new Request("https://app.example.com/api/upload", { headers: { origin: "https://app.example.com" } });
    expect(hasTrustedMutationOrigin(request)).toBe(true);
  });

  it("rejects missing, malformed, and cross-site origins", () => {
    expect(hasTrustedMutationOrigin(new Request("https://app.example.com/api/upload"))).toBe(false);
    expect(hasTrustedMutationOrigin(new Request("https://app.example.com/api/upload", { headers: { origin: "https://evil.example" } }))).toBe(false);
    expect(hasTrustedMutationOrigin(new Request("https://app.example.com/api/upload", { headers: { origin: "not-a-url" } }))).toBe(false);
  });
});
