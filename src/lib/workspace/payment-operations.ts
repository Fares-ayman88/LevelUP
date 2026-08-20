import "server-only";

import { and, eq, inArray, lt } from "drizzle-orm";

import {
  academicGroups,
  auditLogs,
  groupEnrollments,
  organizationMemberships,
  paymentChannels,
  paymentFollowUpTasks,
  paymentObligations,
  paymentRecords,
  studentProfiles,
  subjects,
} from "@/db/schema";
import { getDatabase } from "@/db/client";
import { requireActiveOrganization } from "@/lib/auth/dal";
import { hasPermission, type OrganizationPrincipal } from "@/lib/authorization/permissions";

import { liveEnrollmentStatuses } from "./student";
import { promoteWaitingStudentsForLockedGroup } from "./waitlist-operations";

const actionablePaymentStatuses = ["due", "overdue", "awaiting_review"] as const;
const activeTaskStatuses = ["open", "in_progress"] as const;
const queuePaymentStatuses = ["overdue", "awaiting_review"] as const;

export class PaymentOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentOperationError";
  }
}

export type PaymentOperationsContext = {
  actorMembershipId: string;
  organization: {
    id: string;
    name: string;
    roles: OrganizationPrincipal["roles"];
  };
  userId: string;
  userName: string;
};

export type PaymentFollowUpItem = {
  amountMinor: number;
  currencyCode: string;
  dueAt: Date;
  enrollmentStatus: string;
  groupName: string;
  holdNote: string | null;
  id: string;
  pendingTransferChannelLabel: string | null;
  pendingTransferReference: string | null;
  seatHoldUntil: Date | null;
  studentName: string;
  subjectName: string;
  taskStatus: string | null;
};

function toPrincipal(context: Awaited<ReturnType<typeof requireActiveOrganization>>): OrganizationPrincipal {
  return {
    organizationId: context.organization.id,
    roles: context.organization.roles,
    userId: context.session.userId,
  };
}

function isActionablePaymentStatus(status: string): status is (typeof actionablePaymentStatuses)[number] {
  return actionablePaymentStatuses.some((candidate) => candidate === status);
}

export async function getCurrentPaymentOperationsContext(): Promise<PaymentOperationsContext | null> {
  const activeOrganization = await requireActiveOrganization();
  const principal = toPrincipal(activeOrganization);

  if (!hasPermission(principal, "assistant.manage_payment_followups")) return null;

  const db = getDatabase();
  const [membership] = await db
    .select({ id: organizationMemberships.id })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.organizationId, activeOrganization.organization.id),
        eq(organizationMemberships.userId, activeOrganization.session.userId),
        inArray(organizationMemberships.role, ["assistant", "center_admin"]),
        eq(organizationMemberships.status, "active"),
      ),
    )
    .limit(1);

  if (!membership) return null;

  return {
    actorMembershipId: membership.id,
    organization: activeOrganization.organization,
    userId: activeOrganization.session.userId,
    userName: activeOrganization.session.userName,
  };
}

export type PaymentFollowUpSyncResult = {
  markedOverdue: number;
  openedTasks: number;
};

export async function syncOverduePaymentFollowUpsForOrganization(
  organizationId: string,
  now = new Date(),
): Promise<PaymentFollowUpSyncResult> {
  const db = getDatabase();

  return db.transaction(async (tx) => {
    const newlyOverdue = await tx
      .update(paymentObligations)
      .set({ status: "overdue" })
      .where(
        and(
          eq(paymentObligations.organizationId, organizationId),
          eq(paymentObligations.status, "due"),
          lt(paymentObligations.dueAt, now),
        ),
      )
      .returning({ id: paymentObligations.id });

    if (newlyOverdue.length) {
      await tx.insert(auditLogs).values(
        newlyOverdue.map((obligation) => ({
          organizationId,
          actorMembershipId: null,
          action: "payment.marked_overdue",
          entityType: "payment_obligation",
          entityId: obligation.id,
          metadata: { source: "payment_follow_up_queue" },
        })),
      );
    }

    const obligationsNeedingFollowUp = await tx
      .select({ id: paymentObligations.id, status: paymentObligations.status })
      .from(paymentObligations)
      .where(
        and(
          eq(paymentObligations.organizationId, organizationId),
          inArray(paymentObligations.status, queuePaymentStatuses),
        ),
      );

    const openedTasks = obligationsNeedingFollowUp.length
      ? await tx
        .insert(paymentFollowUpTasks)
        .values(
          obligationsNeedingFollowUp.map((obligation) => ({
            organizationId,
            obligationId: obligation.id,
            priority: obligation.status === "awaiting_review" ? 1 : 2,
            status: "open" as const,
          })),
        )
        .onConflictDoNothing()
        .returning({ id: paymentFollowUpTasks.id })
      : [];

    return {
      markedOverdue: newlyOverdue.length,
      openedTasks: openedTasks.length,
    };
  });
}

export async function getPaymentFollowUpQueue(context: PaymentOperationsContext): Promise<PaymentFollowUpItem[]> {
  await syncOverduePaymentFollowUpsForOrganization(context.organization.id);

  const db = getDatabase();
  return db
    .select({
      amountMinor: paymentObligations.amountMinor,
      currencyCode: paymentObligations.currencyCode,
      dueAt: paymentObligations.dueAt,
      enrollmentStatus: groupEnrollments.status,
      groupName: academicGroups.name,
      holdNote: paymentObligations.holdNote,
      id: paymentObligations.id,
      pendingTransferChannelLabel: paymentChannels.label,
      pendingTransferReference: paymentRecords.transferReference,
      seatHoldUntil: paymentObligations.seatHoldUntil,
      studentName: studentProfiles.fullName,
      subjectName: subjects.name,
      taskStatus: paymentFollowUpTasks.status,
    })
    .from(paymentObligations)
    .innerJoin(
      groupEnrollments,
      and(
        eq(paymentObligations.enrollmentId, groupEnrollments.id),
        eq(groupEnrollments.organizationId, context.organization.id),
      ),
    )
    .innerJoin(
      studentProfiles,
      and(
        eq(groupEnrollments.studentProfileId, studentProfiles.id),
        eq(studentProfiles.organizationId, context.organization.id),
      ),
    )
    .innerJoin(
      academicGroups,
      and(eq(groupEnrollments.groupId, academicGroups.id), eq(academicGroups.organizationId, context.organization.id)),
    )
    .innerJoin(
      subjects,
      and(eq(academicGroups.subjectId, subjects.id), eq(subjects.organizationId, context.organization.id)),
    )
    .leftJoin(
      paymentFollowUpTasks,
      and(
        eq(paymentFollowUpTasks.obligationId, paymentObligations.id),
        eq(paymentFollowUpTasks.organizationId, context.organization.id),
        inArray(paymentFollowUpTasks.status, activeTaskStatuses),
      ),
    )
    .leftJoin(
      paymentRecords,
      and(
        eq(paymentRecords.obligationId, paymentObligations.id),
        eq(paymentRecords.organizationId, context.organization.id),
        eq(paymentRecords.method, "online_transfer"),
        eq(paymentRecords.status, "submitted"),
      ),
    )
    .leftJoin(
      paymentChannels,
      and(
        eq(paymentRecords.paymentChannelId, paymentChannels.id),
        eq(paymentChannels.organizationId, context.organization.id),
      ),
    )
    .where(
      and(
        eq(paymentObligations.organizationId, context.organization.id),
        inArray(paymentObligations.status, queuePaymentStatuses),
        inArray(groupEnrollments.status, liveEnrollmentStatuses),
      ),
    )
    .orderBy(paymentObligations.dueAt, studentProfiles.fullName);
}

export async function recordCashPayment(obligationId: string): Promise<void> {
  const context = await getCurrentPaymentOperationsContext();
  if (!context) throw new PaymentOperationError("You do not have permission to review payments.");

  const db = getDatabase();
  const now = new Date();

  await db.transaction(async (tx) => {
    const [obligation] = await tx
      .select({
        amountMinor: paymentObligations.amountMinor,
        currencyCode: paymentObligations.currencyCode,
        enrollmentId: paymentObligations.enrollmentId,
        status: paymentObligations.status,
      })
      .from(paymentObligations)
      .where(and(eq(paymentObligations.id, obligationId), eq(paymentObligations.organizationId, context.organization.id)))
      .for("update")
      .limit(1);

    if (!obligation || !isActionablePaymentStatus(obligation.status)) {
      throw new PaymentOperationError("This payment can no longer be confirmed.");
    }

    const [enrollment] = await tx
      .select({ id: groupEnrollments.id })
      .from(groupEnrollments)
      .where(
        and(
          eq(groupEnrollments.id, obligation.enrollmentId),
          eq(groupEnrollments.organizationId, context.organization.id),
          inArray(groupEnrollments.status, liveEnrollmentStatuses),
        ),
      )
      .for("update")
      .limit(1);

    if (!enrollment) throw new PaymentOperationError("The seat is no longer active.");

    const [submittedTransfer] = await tx
      .select({ id: paymentRecords.id })
      .from(paymentRecords)
      .where(
        and(
          eq(paymentRecords.organizationId, context.organization.id),
          eq(paymentRecords.obligationId, obligationId),
          eq(paymentRecords.method, "online_transfer"),
          eq(paymentRecords.status, "submitted"),
        ),
      )
      .for("update")
      .limit(1);

    if (submittedTransfer) {
      throw new PaymentOperationError("A transfer is already waiting for review.");
    }

    await tx.insert(paymentRecords).values({
      organizationId: context.organization.id,
      obligationId,
      method: "cash",
      status: "confirmed",
      amountMinor: obligation.amountMinor,
      recordedByMembershipId: context.actorMembershipId,
      reviewedByMembershipId: context.actorMembershipId,
      reviewedAt: now,
    });
    await tx
      .update(paymentObligations)
      .set({ seatHoldUntil: null, status: "paid" })
      .where(eq(paymentObligations.id, obligationId));
    await tx
      .update(groupEnrollments)
      .set({ reservedUntil: null, status: "active" })
      .where(eq(groupEnrollments.id, enrollment.id));
    await tx
      .update(paymentFollowUpTasks)
      .set({
        resolutionNote: "Cash payment confirmed.",
        resolvedAt: now,
        resolvedByMembershipId: context.actorMembershipId,
        status: "resolved",
      })
      .where(
        and(
          eq(paymentFollowUpTasks.organizationId, context.organization.id),
          eq(paymentFollowUpTasks.obligationId, obligationId),
          inArray(paymentFollowUpTasks.status, activeTaskStatuses),
        ),
      );

    await tx.insert(auditLogs).values({
      organizationId: context.organization.id,
      actorMembershipId: context.actorMembershipId,
      action: "payment.cash_confirmed",
      entityType: "payment_obligation",
      entityId: obligationId,
      metadata: { amountMinor: obligation.amountMinor, currencyCode: obligation.currencyCode },
    });
  });
}

export async function confirmManualTransfer(obligationId: string): Promise<void> {
  const context = await getCurrentPaymentOperationsContext();
  if (!context) throw new PaymentOperationError("You do not have permission to review transfers.");

  const db = getDatabase();
  const now = new Date();
  await db.transaction(async (tx) => {
    const [obligation] = await tx
      .select({ enrollmentId: paymentObligations.enrollmentId, status: paymentObligations.status })
      .from(paymentObligations)
      .where(and(eq(paymentObligations.id, obligationId), eq(paymentObligations.organizationId, context.organization.id)))
      .for("update")
      .limit(1);

    if (!obligation || obligation.status !== "awaiting_review") {
      throw new PaymentOperationError("This transfer is no longer waiting for review.");
    }

    const [transfer] = await tx
      .select({ id: paymentRecords.id })
      .from(paymentRecords)
      .where(
        and(
          eq(paymentRecords.organizationId, context.organization.id),
          eq(paymentRecords.obligationId, obligationId),
          eq(paymentRecords.method, "online_transfer"),
          eq(paymentRecords.status, "submitted"),
        ),
      )
      .for("update")
      .limit(1);

    if (!transfer) throw new PaymentOperationError("The submitted transfer could not be found.");

    const [enrollment] = await tx
      .select({ id: groupEnrollments.id })
      .from(groupEnrollments)
      .where(
        and(
          eq(groupEnrollments.id, obligation.enrollmentId),
          eq(groupEnrollments.organizationId, context.organization.id),
          inArray(groupEnrollments.status, liveEnrollmentStatuses),
        ),
      )
      .for("update")
      .limit(1);

    if (!enrollment) throw new PaymentOperationError("The seat is no longer active.");

    await tx
      .update(paymentRecords)
      .set({ reviewedAt: now, reviewedByMembershipId: context.actorMembershipId, status: "confirmed" })
      .where(eq(paymentRecords.id, transfer.id));
    await tx
      .update(paymentObligations)
      .set({ seatHoldUntil: null, status: "paid" })
      .where(eq(paymentObligations.id, obligationId));
    await tx
      .update(groupEnrollments)
      .set({ reservedUntil: null, status: "active" })
      .where(eq(groupEnrollments.id, enrollment.id));
    await tx
      .update(paymentFollowUpTasks)
      .set({
        resolutionNote: "Manual transfer confirmed.",
        resolvedAt: now,
        resolvedByMembershipId: context.actorMembershipId,
        status: "resolved",
      })
      .where(
        and(
          eq(paymentFollowUpTasks.organizationId, context.organization.id),
          eq(paymentFollowUpTasks.obligationId, obligationId),
          inArray(paymentFollowUpTasks.status, activeTaskStatuses),
        ),
      );

    await tx.insert(auditLogs).values({
      organizationId: context.organization.id,
      actorMembershipId: context.actorMembershipId,
      action: "payment.transfer_confirmed",
      entityType: "payment_obligation",
      entityId: obligationId,
      metadata: {},
    });
  });
}

export async function rejectManualTransfer(obligationId: string, reason: string): Promise<void> {
  const context = await getCurrentPaymentOperationsContext();
  if (!context) throw new PaymentOperationError("You do not have permission to reject transfers.");

  const db = getDatabase();
  const now = new Date();
  await db.transaction(async (tx) => {
    const [obligation] = await tx
      .select({ status: paymentObligations.status })
      .from(paymentObligations)
      .where(and(eq(paymentObligations.id, obligationId), eq(paymentObligations.organizationId, context.organization.id)))
      .for("update")
      .limit(1);

    if (!obligation || obligation.status !== "awaiting_review") {
      throw new PaymentOperationError("This transfer is no longer waiting for review.");
    }

    const [transfer] = await tx
      .select({ id: paymentRecords.id })
      .from(paymentRecords)
      .where(
        and(
          eq(paymentRecords.organizationId, context.organization.id),
          eq(paymentRecords.obligationId, obligationId),
          eq(paymentRecords.method, "online_transfer"),
          eq(paymentRecords.status, "submitted"),
        ),
      )
      .for("update")
      .limit(1);

    if (!transfer) throw new PaymentOperationError("The submitted transfer could not be found.");

    await tx
      .update(paymentRecords)
      .set({
        rejectionReason: reason,
        reviewedAt: now,
        reviewedByMembershipId: context.actorMembershipId,
        status: "rejected",
      })
      .where(eq(paymentRecords.id, transfer.id));
    await tx
      .update(paymentObligations)
      .set({ status: "overdue" })
      .where(eq(paymentObligations.id, obligationId));
    await tx
      .update(paymentFollowUpTasks)
      .set({
        assigneeMembershipId: null,
        priority: 1,
        resolutionNote: `Transfer rejected: ${reason}`,
        resolvedAt: null,
        resolvedByMembershipId: null,
        status: "open",
      })
      .where(
        and(
          eq(paymentFollowUpTasks.organizationId, context.organization.id),
          eq(paymentFollowUpTasks.obligationId, obligationId),
          inArray(paymentFollowUpTasks.status, activeTaskStatuses),
        ),
      );
    await tx.insert(auditLogs).values({
      organizationId: context.organization.id,
      actorMembershipId: context.actorMembershipId,
      action: "payment.transfer_rejected",
      entityType: "payment_obligation",
      entityId: obligationId,
      metadata: { reason },
    });
  });
}

export async function extendPaymentSeatHold(obligationId: string, expiresAt: Date, reason: string): Promise<void> {
  const context = await getCurrentPaymentOperationsContext();
  if (!context) throw new PaymentOperationError("You do not have permission to keep this seat reserved.");

  const now = new Date();
  if (expiresAt <= now) throw new PaymentOperationError("Choose a future hold time.");

  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [obligation] = await tx
      .select({ enrollmentId: paymentObligations.enrollmentId, status: paymentObligations.status })
      .from(paymentObligations)
      .where(and(eq(paymentObligations.id, obligationId), eq(paymentObligations.organizationId, context.organization.id)))
      .for("update")
      .limit(1);

    if (!obligation || !isActionablePaymentStatus(obligation.status)) {
      throw new PaymentOperationError("This payment can no longer be held.");
    }

    const [enrollment] = await tx
      .select({ id: groupEnrollments.id })
      .from(groupEnrollments)
      .where(
        and(
          eq(groupEnrollments.id, obligation.enrollmentId),
          eq(groupEnrollments.organizationId, context.organization.id),
          inArray(groupEnrollments.status, liveEnrollmentStatuses),
        ),
      )
      .for("update")
      .limit(1);

    if (!enrollment) throw new PaymentOperationError("The seat is no longer active.");

    await tx
      .update(paymentObligations)
      .set({ holdNote: reason, seatHoldUntil: expiresAt })
      .where(eq(paymentObligations.id, obligationId));
    await tx
      .update(groupEnrollments)
      .set({ reservedUntil: expiresAt, status: "payment_follow_up" })
      .where(eq(groupEnrollments.id, enrollment.id));
    await tx
      .update(paymentFollowUpTasks)
      .set({ assigneeMembershipId: context.actorMembershipId, resolutionNote: reason, status: "in_progress" })
      .where(
        and(
          eq(paymentFollowUpTasks.organizationId, context.organization.id),
          eq(paymentFollowUpTasks.obligationId, obligationId),
          inArray(paymentFollowUpTasks.status, activeTaskStatuses),
        ),
      );
    await tx.insert(auditLogs).values({
      organizationId: context.organization.id,
      actorMembershipId: context.actorMembershipId,
      action: "payment.seat_hold_extended",
      entityType: "payment_obligation",
      entityId: obligationId,
      metadata: { expiresAt: expiresAt.toISOString(), reason },
    });
  });
}

export async function releaseUnpaidSeat(obligationId: string, reason: string): Promise<void> {
  const context = await getCurrentPaymentOperationsContext();
  if (!context) throw new PaymentOperationError("You do not have permission to release this seat.");

  const db = getDatabase();
  const now = new Date();
  await db.transaction(async (tx) => {
    const [obligation] = await tx
      .select({ enrollmentId: paymentObligations.enrollmentId, status: paymentObligations.status })
      .from(paymentObligations)
      .where(and(eq(paymentObligations.id, obligationId), eq(paymentObligations.organizationId, context.organization.id)))
      .for("update")
      .limit(1);

    if (!obligation || !isActionablePaymentStatus(obligation.status)) {
      throw new PaymentOperationError("This payment can no longer be released.");
    }

    const [enrollment] = await tx
      .select({ groupId: groupEnrollments.groupId, id: groupEnrollments.id })
      .from(groupEnrollments)
      .where(
        and(
          eq(groupEnrollments.id, obligation.enrollmentId),
          eq(groupEnrollments.organizationId, context.organization.id),
          inArray(groupEnrollments.status, liveEnrollmentStatuses),
        ),
      )
      .for("update")
      .limit(1);

    if (!enrollment) throw new PaymentOperationError("The seat is no longer active.");

    const [group] = await tx
      .select({ capacity: academicGroups.capacity, id: academicGroups.id })
      .from(academicGroups)
      .where(
        and(
          eq(academicGroups.id, enrollment.groupId),
          eq(academicGroups.organizationId, context.organization.id),
        ),
      )
      .for("update")
      .limit(1);

    if (!group) throw new PaymentOperationError("The group is no longer active.");

    await tx
      .update(groupEnrollments)
      .set({
        releasedAt: now,
        releaseReason: reason,
        reservedUntil: null,
        status: "seat_released",
      })
      .where(eq(groupEnrollments.id, enrollment.id));
    await tx
      .update(paymentObligations)
      .set({ holdNote: reason, seatHoldUntil: null, status: "void" })
      .where(eq(paymentObligations.id, obligationId));
    await tx
      .update(paymentFollowUpTasks)
      .set({
        resolutionNote: reason,
        resolvedAt: now,
        resolvedByMembershipId: context.actorMembershipId,
        status: "resolved",
      })
      .where(
        and(
          eq(paymentFollowUpTasks.organizationId, context.organization.id),
          eq(paymentFollowUpTasks.obligationId, obligationId),
          inArray(paymentFollowUpTasks.status, activeTaskStatuses),
        ),
      );
    await promoteWaitingStudentsForLockedGroup(
      tx,
      { actorMembershipId: context.actorMembershipId, now, organizationId: context.organization.id },
      group,
    );
    await tx.insert(auditLogs).values({
      organizationId: context.organization.id,
      actorMembershipId: context.actorMembershipId,
      action: "payment.seat_released",
      entityType: "payment_obligation",
      entityId: obligationId,
      metadata: { reason },
    });
  });
}
