import { describe, expect, it } from "vitest";

import { dateForScheduleWeekday, zonedDateTimeToUtc } from "./schedule-time";

describe("schedule time helpers", () => {
  it("keeps the LevelUp weekday convention where zero is Saturday", () => {
    const saturday = dateForScheduleWeekday(new Date("2026-08-16T08:00:00.000Z"), 0, 0, "UTC");
    expect(saturday).toEqual({ day: 22, month: 8, year: 2026 });
  });

  it("converts a local calendar date to UTC without relying on the server timezone", () => {
    expect(zonedDateTimeToUtc({ day: 22, month: 8, year: 2026 }, "17:30:00", "UTC").toISOString()).toBe("2026-08-22T17:30:00.000Z");
  });
});
