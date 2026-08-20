import { describe, expect, it } from "vitest";

import { calculateProgress, calculateProgressRank } from "./progress-rules";

describe("progress rules", () => {
  it("uses the approved weights and reweights only the evidence that exists", () => {
    expect(
      calculateProgress({
        attendance: { attended: 8, total: 10 },
        exams: { earned: 70, possible: 100 },
        homework: { earned: 27, possible: 30 },
      }),
    ).toEqual({ attendance: 80, exams: 70, homework: 90, overall: 79 });

    expect(
      calculateProgress({
        attendance: { attended: 8, total: 10 },
        exams: { earned: 0, possible: 0 },
        homework: { earned: 27, possible: 30 },
      }).overall,
    ).toBe(85);
  });

  it("uses competition ranking without exposing peer identities", () => {
    expect(calculateProgressRank(82, [92, 82, 82, 70])).toEqual({ comparableStudents: 4, percentile: 67, rank: 2 });
    expect(calculateProgressRank(null, [92, 82])).toEqual({ comparableStudents: 0, percentile: null, rank: null });
  });
});
