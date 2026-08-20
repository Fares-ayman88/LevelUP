export const MAX_MAKEUP_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export function isWithinMakeupWindow(sourceStartsAt: Date, targetStartsAt: Date): boolean {
  return Math.abs(targetStartsAt.getTime() - sourceStartsAt.getTime()) <= MAX_MAKEUP_WINDOW_MS;
}

export function sessionsOverlap(
  first: { endsAt: Date; startsAt: Date },
  second: { endsAt: Date; startsAt: Date },
): boolean {
  return first.startsAt < second.endsAt && first.endsAt > second.startsAt;
}
