export function hasCompleteUniqueRoster(providedEnrollmentIds: string[], rosterEnrollmentIds: string[]): boolean {
  const providedIds = new Set(providedEnrollmentIds);
  const rosterIds = new Set(rosterEnrollmentIds);

  return (
    providedIds.size === providedEnrollmentIds.length
    && providedIds.size === rosterIds.size
    && [...providedIds].every((id) => rosterIds.has(id))
  );
}

export function isScoreWithinRange(score: number | null, maximum: number): boolean {
  return score === null || (Number.isInteger(score) && score >= 0 && score <= maximum);
}
