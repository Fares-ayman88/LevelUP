import "server-only";

import { and, eq, inArray, lt, lte, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import {
  academicGroups,
  auditLogs,
  groupSessions,
  makeupRequests,
  mediaAssets,
  paymentObligations,
  waitlistEntries,
} from "@/db/schema";
import { getDatabase } from "@/db/client";

import { syncOverduePaymentFollowUpsForOrganization } from "./payment-operations";
import { generateUpcomingGroupSessions } from "./session-generation";
import { expireWaitlistOffersForLockedGroup, promoteWaitingStudentsForLockedGroup } from "./waitlist-operations";

const MAINTENANCE_BATCH_SIZE = 100;
const PENDING_MEDIA_UPLOAD_MAX_AGE_MS = 30 * 60 * 1000;
const paymentQueueStatuses = ["overdue", "awaiting_review"] as const;

export type ScheduledMaintenanceResult = {
  expiredMakeupRequests: number;
  expiredPendingMediaUploads: number;
  expiredWaitlistOffers: number;
  generatedSessions: number;
  groupsScanned: number;
  markedOverdue: number;
  openedFollowUpTasks: number;
  offeredWaitlistSeats: number;
  paymentOrganizationsScanned: number;
};

export async function runScheduledMaintenance(now = new Date()): Promise<ScheduledMaintenanceResult> {
  const db = getDatabase();
  const generatedSessions = await generateUpcomingGroupSessions(now);
  const expiredMakeupRequests = await db.transaction(async (tx) => {
    const targetSession = alias(groupSessions, "expired_makeup_target_sessions");
    const staleRequests = await tx
      .select({ id: makeupRequests.id, organizationId: makeupRequests.organizationId })
      .from(makeupRequests)
      .innerJoin(
        targetSession,
        and(eq(makeupRequests.targetGroupSessionId, targetSession.id), eq(makeupRequests.organizationId, targetSession.organizationId)),
      )
      .where(and(eq(makeupRequests.status, "pending"), lte(targetSession.startsAt, now)))
      .limit(MAINTENANCE_BATCH_SIZE);
    const requestIds = staleRequests.map((request) => request.id);
    if (!requestIds.length) return 0;

    const cancelledRequests = await tx
      .update(makeupRequests)
      .set({
        reviewNote: "The alternative class is no longer available.",
        reviewedAt: now,
        status: "cancelled",
      })
      .where(and(inArray(makeupRequests.id, requestIds), eq(makeupRequests.status, "pending")))
      .returning({ id: makeupRequests.id, organizationId: makeupRequests.organizationId });

    if (cancelledRequests.length) {
      await tx.insert(auditLogs).values(
        cancelledRequests.map((request) => ({
          organizationId: request.organizationId,
          actorMembershipId: null,
          action: "makeup.expired",
          entityType: "makeup_request",
          entityId: request.id,
          metadata: {},
        })),
      );
    }

    return cancelledRequests.length;
  });
  const staleMediaCutoff = new Date(now.getTime() - PENDING_MEDIA_UPLOAD_MAX_AGE_MS);
  const expiredPendingMediaUploads = await db.transaction(async (tx) => {
    const staleAssets = await tx
      .update(mediaAssets)
      .set({ rejectionReason: "Upload window expired", status: "rejected" })
      .where(
        and(
          eq(mediaAssets.status, "pending_upload"),
          lt(mediaAssets.createdAt, staleMediaCutoff),
        ),
      )
      .returning({ id: mediaAssets.id, organizationId: mediaAssets.organizationId });

    if (staleAssets.length) {
      await tx.insert(auditLogs).values(
        staleAssets.map((asset) => ({
          organizationId: asset.organizationId,
          actorMembershipId: null,
          action: "media.upload_expired",
          entityType: "media_asset",
          entityId: asset.id,
          metadata: {},
        })),
      );
    }

    return staleAssets.length;
  });
  const paymentOrganizations = await db
    .select({ organizationId: paymentObligations.organizationId })
    .from(paymentObligations)
    .where(
      or(
        and(eq(paymentObligations.status, "due"), lt(paymentObligations.dueAt, now)),
        inArray(paymentObligations.status, paymentQueueStatuses),
      ),
    )
    .groupBy(paymentObligations.organizationId)
    .limit(MAINTENANCE_BATCH_SIZE);

  let markedOverdue = 0;
  let openedFollowUpTasks = 0;
  for (const organization of paymentOrganizations) {
    const result = await syncOverduePaymentFollowUpsForOrganization(organization.organizationId, now);
    markedOverdue += result.markedOverdue;
    openedFollowUpTasks += result.openedTasks;
  }

  const expiredOfferRows = await db
    .select({ groupId: waitlistEntries.groupId })
    .from(waitlistEntries)
    .where(and(eq(waitlistEntries.status, "offered"), lte(waitlistEntries.offeredUntil, now)))
    .groupBy(waitlistEntries.groupId)
    .limit(MAINTENANCE_BATCH_SIZE);

  let expiredWaitlistOffers = 0;
  let offeredWaitlistSeats = 0;
  for (const { groupId } of expiredOfferRows) {
    const result = await db.transaction(async (tx) => {
      const [group] = await tx
        .select({ capacity: academicGroups.capacity, id: academicGroups.id, organizationId: academicGroups.organizationId, status: academicGroups.status })
        .from(academicGroups)
        .where(eq(academicGroups.id, groupId))
        .for("update")
        .limit(1);

      if (!group) return { expired: 0, offered: 0 };

      const context = { actorMembershipId: null, now, organizationId: group.organizationId };
      const expired = await expireWaitlistOffersForLockedGroup(tx, context, group.id);
      const offered = group.status === "active"
        ? await promoteWaitingStudentsForLockedGroup(tx, context, group)
        : 0;

      return { expired, offered };
    });

    expiredWaitlistOffers += result.expired;
    offeredWaitlistSeats += result.offered;
  }

  return {
    expiredMakeupRequests,
    expiredPendingMediaUploads,
    expiredWaitlistOffers,
    generatedSessions,
    groupsScanned: expiredOfferRows.length,
    markedOverdue,
    openedFollowUpTasks,
    offeredWaitlistSeats,
    paymentOrganizationsScanned: paymentOrganizations.length,
  };
}
