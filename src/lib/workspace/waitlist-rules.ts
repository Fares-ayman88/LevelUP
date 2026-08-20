export const WAITLIST_OFFER_DURATION_MS = 24 * 60 * 60 * 1000;

export function availableGroupSeats(capacity: number, occupiedSeats: number, activeOffers: number): number {
  return Math.max(0, capacity - occupiedSeats - activeOffers);
}

export function waitlistOfferExpiresAt(now: Date): Date {
  return new Date(now.getTime() + WAITLIST_OFFER_DURATION_MS);
}
