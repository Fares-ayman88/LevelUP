import { describe, expect, it } from "vitest";

import { availableGroupSeats, waitlistOfferExpiresAt, WAITLIST_OFFER_DURATION_MS } from "./waitlist-rules";

describe("waitlist capacity rules", () => {
  it("keeps a pending waitlist offer from being sold as a free seat", () => {
    expect(availableGroupSeats(12, 11, 1)).toBe(0);
  });

  it("allows every genuinely free seat without returning a negative number", () => {
    expect(availableGroupSeats(12, 8, 2)).toBe(2);
    expect(availableGroupSeats(12, 14, 0)).toBe(0);
  });

  it("sets a predictable 24-hour offer window", () => {
    const now = new Date("2026-08-17T10:00:00.000Z");
    expect(waitlistOfferExpiresAt(now).getTime() - now.getTime()).toBe(WAITLIST_OFFER_DURATION_MS);
  });
});
