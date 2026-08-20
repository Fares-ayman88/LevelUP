import "server-only";

import { and, count, eq, gt, inArray, lte, ne } from "drizzle-orm";

import { auditLogs, groupEnrollments, waitlistEntries } from "@/db/schema";
import type { Database } from "@/db/client";

import { liveEnrollmentStatuses } from "./student";
import { availableGroupSeats, waitlistOfferExpiresAt } from "./waitlist-rules";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

type WaitlistGroup = {
  capacity: number;
  id: string;
};

type WaitlistMutationContext = {
  actorMembershipId: string | null;
  now: Date;
  organizationId: string;
};

export async function getAvailableSeatsForLockedGroup(
  tx: Transaction,
  context: WaitlistMutationContext,
  group: WaitlistGroup,
  excludedOfferId?: string,
): Promise<number> {
  const offerConditions = [
    eq(waitlistEntries.organizationId, context.organizationId),
    eq(waitlistEntries.groupId, group.id),
    eq(waitlistEntries.status, "offered"),
    gt(waitlistEntries.offeredUntil, context.now),
  ];

  if (excludedOfferId) {
    offerConditions.push(ne(waitlistEntries.id, excludedOfferId));
  }

  const [occupancyRows, offerRows] = await Promise.all([
    tx
      .select({ occupied: count() })
      .from(groupEnrollments)
      .where(
        and(
          eq(groupEnrollments.organizationId, context.organizationId),
          eq(groupEnrollments.groupId, group.id),
          inArray(groupEnrollments.status, liveEnrollmentStatuses),
        ),
      ),
    tx.select({ activeOffers: count() }).from(waitlistEntries).where(and(...offerConditions)),
  ]);

  return availableGroupSeats(
    group.capacity,
    Number(occupancyRows[0]?.occupied ?? 0),
    Number(offerRows[0]?.activeOffers ?? 0),
  );
}

export async function expireWaitlistOffersForLockedGroup(
  tx: Transaction,
  context: WaitlistMutationContext,
  groupId: string,
): Promise<number> {
  const expiredEntries = await tx
    .select({ id: waitlistEntries.id })
    .from(waitlistEntries)
    .where(
      and(
        eq(waitlistEntries.organizationId, context.organizationId),
        eq(waitlistEntries.groupId, groupId),
        eq(waitlistEntries.status, "offered"),
        lte(waitlistEntries.offeredUntil, context.now),
      ),
    )
    .for("update");

  if (!expiredEntries.length) return 0;

  const expiredEntryIds = expiredEntries.map((entry) => entry.id);
  await tx
    .update(waitlistEntries)
    .set({ offeredUntil: null, status: "expired" })
    .where(inArray(waitlistEntries.id, expiredEntryIds));
  await tx.insert(auditLogs).values(
    expiredEntryIds.map((entryId) => ({
      organizationId: context.organizationId,
      actorMembershipId: context.actorMembershipId,
      action: "waitlist.offer_expired",
      entityType: "waitlist_entry",
      entityId: entryId,
      metadata: {},
    })),
  );

  return expiredEntryIds.length;
}

export async function promoteWaitingStudentsForLockedGroup(
  tx: Transaction,
  context: WaitlistMutationContext,
  group: WaitlistGroup,
): Promise<number> {
  const seatsAvailable = await getAvailableSeatsForLockedGroup(tx, context, group);
  if (!seatsAvailable) return 0;

  const candidates = await tx
    .select({ id: waitlistEntries.id, studentProfileId: waitlistEntries.studentProfileId })
    .from(waitlistEntries)
    .where(
      and(
        eq(waitlistEntries.organizationId, context.organizationId),
        eq(waitlistEntries.groupId, group.id),
        eq(waitlistEntries.status, "waiting"),
      ),
    )
    .orderBy(waitlistEntries.createdAt)
    .limit(100)
    .for("update");

  if (!candidates.length) return 0;

  const candidateStudentIds = candidates.map((candidate) => candidate.studentProfileId);
  const enrolledCandidates = await tx
    .select({ studentProfileId: groupEnrollments.studentProfileId })
    .from(groupEnrollments)
    .where(
      and(
        eq(groupEnrollments.organizationId, context.organizationId),
        eq(groupEnrollments.groupId, group.id),
        inArray(groupEnrollments.studentProfileId, candidateStudentIds),
        inArray(groupEnrollments.status, liveEnrollmentStatuses),
      ),
    );
  const enrolledStudentIds = new Set(enrolledCandidates.map((entry) => entry.studentProfileId));
  const staleEntryIds = candidates
    .filter((candidate) => enrolledStudentIds.has(candidate.studentProfileId))
    .map((candidate) => candidate.id);

  if (staleEntryIds.length) {
    await tx
      .update(waitlistEntries)
      .set({ offeredUntil: null, status: "accepted" })
      .where(inArray(waitlistEntries.id, staleEntryIds));
    await tx.insert(auditLogs).values(
      staleEntryIds.map((entryId) => ({
        organizationId: context.organizationId,
        actorMembershipId: context.actorMembershipId,
        action: "waitlist.closed_as_enrolled",
        entityType: "waitlist_entry",
        entityId: entryId,
        metadata: {},
      })),
    );
  }

  const offerEntryIds = candidates
    .filter((candidate) => !enrolledStudentIds.has(candidate.studentProfileId))
    .slice(0, seatsAvailable)
    .map((candidate) => candidate.id);
  if (!offerEntryIds.length) return 0;

  const offeredUntil = waitlistOfferExpiresAt(context.now);
  await tx
    .update(waitlistEntries)
    .set({ offeredUntil, status: "offered" })
    .where(inArray(waitlistEntries.id, offerEntryIds));
  await tx.insert(auditLogs).values(
    offerEntryIds.map((entryId) => ({
      organizationId: context.organizationId,
      actorMembershipId: context.actorMembershipId,
      action: "waitlist.offered",
      entityType: "waitlist_entry",
      entityId: entryId,
      metadata: { offeredUntil: offeredUntil.toISOString() },
    })),
  );

  return offerEntryIds.length;
}
