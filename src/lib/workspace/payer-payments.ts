import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import {
  academicGroups,
  auditLogs,
  groupEnrollments,
  guardianStudentLinks,
  organizationMemberships,
  paymentFollowUpTasks,
  paymentChannels,
  paymentObligations,
  paymentRecords,
  studentProfiles,
  subjects,
} from "@/db/schema";
import { getDatabase } from "@/db/client";
import { requireActiveOrganization } from "@/lib/auth/dal";
import { hasPermission, type OrganizationPrincipal } from "@/lib/authorization/permissions";
import { isTransferPaymentChannel, type PaymentChannelKind } from "@/lib/payments/payment-channel-rules";

import { liveEnrollmentStatuses } from "./student";

const openPaymentStatuses = ["due", "overdue", "awaiting_review"] as const;
const activeTaskStatuses = ["open", "in_progress"] as const;

export class ManualTransferError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ManualTransferError";
  }
}

export type PayerWorkspaceContext = {
  actorMembershipId: string;
  organization: {
    id: string;
    name: string;
    roles: OrganizationPrincipal["roles"];
  };
  studentProfileIds: string[];
  userId: string;
};

export type PayableObligation = {
  amountMinor: number;
  currencyCode: string;
  dueAt: Date;
  groupName: string;
  id: string;
  status: string;
  studentName: string;
  studentProfileId: string;
  subjectName: string;
};

export type PayerPaymentChannel = {
  accountHolder: string | null;
  accountIdentifier: string | null;
  id: string;
  instructions: string | null;
  kind: PaymentChannelKind;
  label: string;
};

function toPrincipal(context: Awaited<ReturnType<typeof requireActiveOrganization>>): OrganizationPrincipal {
  return {
    organizationId: context.organization.id,
    roles: context.organization.roles,
    userId: context.session.userId,
  };
}

function normalizeTransferReference(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export async function getCurrentPayerWorkspace(): Promise<PayerWorkspaceContext | null> {
  const activeOrganization = await requireActiveOrganization();
  const principal = toPrincipal(activeOrganization);
  const canPayOwnAccount = hasPermission(principal, "student.read_own_payment_status");
  const canPayForLinkedStudents = hasPermission(principal, "guardian.read_linked_payment_status");

  if (!canPayOwnAccount && !canPayForLinkedStudents) return null;

  const db = getDatabase();
  const memberships = await db
    .select({ id: organizationMemberships.id, role: organizationMemberships.role })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.organizationId, activeOrganization.organization.id),
        eq(organizationMemberships.userId, activeOrganization.session.userId),
        inArray(organizationMemberships.role, ["student", "guardian"]),
        eq(organizationMemberships.status, "active"),
      ),
    );

  const studentMembership = memberships.find((membership) => membership.role === "student");
  const guardianMembership = memberships.find((membership) => membership.role === "guardian");
  const studentProfileIds = new Set<string>();

  if (studentMembership && canPayOwnAccount) {
    const [student] = await db
      .select({ id: studentProfiles.id })
      .from(studentProfiles)
      .where(
        and(
          eq(studentProfiles.organizationId, activeOrganization.organization.id),
          eq(studentProfiles.userId, activeOrganization.session.userId),
          eq(studentProfiles.status, "active"),
        ),
      )
      .limit(1);

    if (student) studentProfileIds.add(student.id);
  }

  if (guardianMembership && canPayForLinkedStudents) {
    const linkedStudents = await db
      .select({ studentProfileId: guardianStudentLinks.studentProfileId })
      .from(guardianStudentLinks)
      .innerJoin(
        studentProfiles,
        and(
          eq(guardianStudentLinks.studentProfileId, studentProfiles.id),
          eq(studentProfiles.organizationId, activeOrganization.organization.id),
        ),
      )
      .where(
        and(
          eq(guardianStudentLinks.organizationId, activeOrganization.organization.id),
          eq(guardianStudentLinks.guardianMembershipId, guardianMembership.id),
          eq(studentProfiles.status, "active"),
        ),
      );

    for (const linkedStudent of linkedStudents) studentProfileIds.add(linkedStudent.studentProfileId);
  }

  const actorMembershipId = studentMembership?.id ?? guardianMembership?.id;
  if (!actorMembershipId || !studentProfileIds.size) return null;

  return {
    actorMembershipId,
    organization: activeOrganization.organization,
    studentProfileIds: [...studentProfileIds],
    userId: activeOrganization.session.userId,
  };
}

export async function getPayableObligations(
  context: PayerWorkspaceContext,
  requestedStudentProfileIds = context.studentProfileIds,
): Promise<PayableObligation[]> {
  const allowedStudentProfileIds = new Set(context.studentProfileIds);
  const studentProfileIds = requestedStudentProfileIds.filter((studentProfileId) => allowedStudentProfileIds.has(studentProfileId));
  if (!studentProfileIds.length) return [];

  const db = getDatabase();
  return db
    .select({
      amountMinor: paymentObligations.amountMinor,
      currencyCode: paymentObligations.currencyCode,
      dueAt: paymentObligations.dueAt,
      groupName: academicGroups.name,
      id: paymentObligations.id,
      status: paymentObligations.status,
      studentName: studentProfiles.fullName,
      studentProfileId: studentProfiles.id,
      subjectName: subjects.name,
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
    .where(
      and(
        eq(paymentObligations.organizationId, context.organization.id),
        inArray(groupEnrollments.studentProfileId, studentProfileIds),
        inArray(groupEnrollments.status, liveEnrollmentStatuses),
        inArray(paymentObligations.status, openPaymentStatuses),
      ),
    )
    .orderBy(paymentObligations.dueAt, studentProfiles.fullName);
}

export async function getAvailablePayerPaymentChannels(
  context: Pick<PayerWorkspaceContext, "organization">,
): Promise<PayerPaymentChannel[]> {
  const db = getDatabase();
  const rows = await db
    .select({
      accountHolder: paymentChannels.accountHolder,
      accountIdentifier: paymentChannels.accountIdentifier,
      id: paymentChannels.id,
      instructions: paymentChannels.instructions,
      kind: paymentChannels.kind,
      label: paymentChannels.label,
    })
    .from(paymentChannels)
    .where(and(eq(paymentChannels.organizationId, context.organization.id), eq(paymentChannels.isActive, true)))
    .orderBy(paymentChannels.displayOrder, paymentChannels.label);

  return rows.map((row) => ({ ...row, kind: row.kind as PaymentChannelKind }));
}

export async function submitManualTransfer(
  obligationId: string,
  paymentChannelId: string,
  transferReferenceInput: string,
): Promise<void> {
  const context = await getCurrentPayerWorkspace();
  if (!context) throw new ManualTransferError("You do not have permission to submit this payment.");

  const transferReference = normalizeTransferReference(transferReferenceInput);
  if (transferReference.length < 3 || transferReference.length > 160) {
    throw new ManualTransferError("Enter a valid transfer reference.");
  }

  const db = getDatabase();
  try {
    await db.transaction(async (tx) => {
      const [obligation] = await tx
        .select({
          amountMinor: paymentObligations.amountMinor,
          enrollmentId: paymentObligations.enrollmentId,
          status: paymentObligations.status,
        })
        .from(paymentObligations)
        .where(and(eq(paymentObligations.id, obligationId), eq(paymentObligations.organizationId, context.organization.id)))
        .for("update")
        .limit(1);

      if (!obligation) throw new ManualTransferError("That payment is no longer available.");
      if (obligation.status === "awaiting_review") throw new ManualTransferError("This transfer is already waiting for review.");
      if (obligation.status !== "due" && obligation.status !== "overdue") {
        throw new ManualTransferError("This payment can no longer accept a transfer reference.");
      }

      const [enrollment] = await tx
        .select({ id: groupEnrollments.id, studentProfileId: groupEnrollments.studentProfileId })
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

      if (!enrollment || !context.studentProfileIds.includes(enrollment.studentProfileId)) {
        throw new ManualTransferError("You do not have access to this payment.");
      }

      const [paymentChannel] = await tx
        .select({ id: paymentChannels.id, kind: paymentChannels.kind })
        .from(paymentChannels)
        .where(
          and(
            eq(paymentChannels.id, paymentChannelId),
            eq(paymentChannels.organizationId, context.organization.id),
            eq(paymentChannels.isActive, true),
          ),
        )
        .for("update")
        .limit(1);

      if (!paymentChannel || !isTransferPaymentChannel(paymentChannel.kind as PaymentChannelKind)) {
        throw new ManualTransferError("Choose an active online payment method from your center.");
      }

      const [pendingRecord] = await tx
        .select({ id: paymentRecords.id })
        .from(paymentRecords)
        .where(
          and(
            eq(paymentRecords.organizationId, context.organization.id),
            eq(paymentRecords.obligationId, obligationId),
            eq(paymentRecords.status, "submitted"),
          ),
        )
        .for("update")
        .limit(1);

      if (pendingRecord) throw new ManualTransferError("This transfer is already waiting for review.");

      const [existingReference] = await tx
        .select({ id: paymentRecords.id })
        .from(paymentRecords)
        .where(
          and(
            eq(paymentRecords.organizationId, context.organization.id),
            eq(paymentRecords.transferReference, transferReference),
            inArray(paymentRecords.status, ["submitted", "confirmed"]),
          ),
        )
        .limit(1);

      if (existingReference) throw new ManualTransferError("This transfer reference has already been submitted.");

      await tx.insert(paymentRecords).values({
        organizationId: context.organization.id,
        obligationId,
        paymentChannelId: paymentChannel.id,
        method: "online_transfer",
        status: "submitted",
        amountMinor: obligation.amountMinor,
        submittedByUserId: context.userId,
        transferReference,
      });
      await tx
        .update(paymentObligations)
        .set({ status: "awaiting_review" })
        .where(eq(paymentObligations.id, obligationId));
      await tx
        .update(paymentFollowUpTasks)
        .set({ priority: 1, status: "open" })
        .where(
          and(
            eq(paymentFollowUpTasks.organizationId, context.organization.id),
            eq(paymentFollowUpTasks.obligationId, obligationId),
            inArray(paymentFollowUpTasks.status, activeTaskStatuses),
          ),
        );
      await tx
        .insert(paymentFollowUpTasks)
        .values({
          organizationId: context.organization.id,
          obligationId,
          priority: 1,
          status: "open",
        })
        .onConflictDoNothing();
      await tx.insert(auditLogs).values({
        organizationId: context.organization.id,
        actorMembershipId: context.actorMembershipId,
        action: "payment.transfer_submitted",
        entityType: "payment_obligation",
        entityId: obligationId,
        metadata: { paymentChannelKind: paymentChannel.kind, transferReferenceRecorded: true },
      });
    });
  } catch (error) {
    if ((error as { code?: string } | undefined)?.code === "23505") {
      throw new ManualTransferError("This transfer reference has already been submitted.");
    }

    throw error;
  }
}
