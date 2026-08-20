import { describe, expect, it } from "vitest";

import { isWithinMakeupWindow, sessionsOverlap } from "./makeup-rules";

describe("makeup rules", () => {
  it("limits alternatives to a two-week window", () => {
    const source = new Date("2026-08-01T15:00:00.000Z");

    expect(isWithinMakeupWindow(source, new Date("2026-08-15T15:00:00.000Z"))).toBe(true);
    expect(isWithinMakeupWindow(source, new Date("2026-08-15T15:00:00.001Z"))).toBe(false);
  });

  it("allows adjacent sessions but blocks overlapping commitments", () => {
    const classSession = {
      endsAt: new Date("2026-08-10T17:00:00.000Z"),
      startsAt: new Date("2026-08-10T15:00:00.000Z"),
    };

    expect(sessionsOverlap(classSession, {
      endsAt: new Date("2026-08-10T19:00:00.000Z"),
      startsAt: new Date("2026-08-10T17:00:00.000Z"),
    })).toBe(false);
    expect(sessionsOverlap(classSession, {
      endsAt: new Date("2026-08-10T18:00:00.000Z"),
      startsAt: new Date("2026-08-10T16:00:00.000Z"),
    })).toBe(true);
  });
});
