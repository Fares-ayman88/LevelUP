export const progressWeights = {
  attendance: 30,
  exams: 40,
  homework: 30,
} as const;

export type ProgressMetrics = {
  attendance: { attended: number; total: number };
  exams: { earned: number; possible: number };
  homework: { earned: number; possible: number };
};

export type ProgressBreakdown = {
  attendance: number | null;
  exams: number | null;
  homework: number | null;
  overall: number | null;
};

function percentage(earned: number, possible: number): number | null {
  if (possible <= 0) return null;
  return Math.round((Math.max(0, Math.min(earned, possible)) / possible) * 100);
}

export function calculateProgress(metrics: ProgressMetrics): ProgressBreakdown {
  const attendance = percentage(metrics.attendance.attended, metrics.attendance.total);
  const homework = percentage(metrics.homework.earned, metrics.homework.possible);
  const exams = percentage(metrics.exams.earned, metrics.exams.possible);
  const components: Array<{ score: number | null; weight: number }> = [
    { score: attendance, weight: progressWeights.attendance },
    { score: homework, weight: progressWeights.homework },
    { score: exams, weight: progressWeights.exams },
  ];
  let weightedScore = 0;
  let availableWeight = 0;

  for (const component of components) {
    if (component.score === null) continue;
    weightedScore += component.score * component.weight;
    availableWeight += component.weight;
  }

  const overall = availableWeight ? Math.round(weightedScore / availableWeight) : null;

  return { attendance, exams, homework, overall };
}

export function calculateProgressRank(studentScore: number | null, peerScores: Array<number | null>): {
  comparableStudents: number;
  percentile: number | null;
  rank: number | null;
} {
  if (studentScore === null) return { comparableStudents: 0, percentile: null, rank: null };

  const comparableScores = peerScores.filter((score): score is number => score !== null);
  if (!comparableScores.length) return { comparableStudents: 0, percentile: null, rank: null };

  const rank = 1 + comparableScores.filter((score) => score > studentScore).length;
  const percentile = comparableScores.length === 1
    ? 100
    : Math.round(((comparableScores.length - rank) / (comparableScores.length - 1)) * 100);

  return { comparableStudents: comparableScores.length, percentile, rank };
}
