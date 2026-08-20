import "server-only";

import { and, asc, count, eq, inArray } from "drizzle-orm";

import {
  academicGroups,
  auditLogs,
  groupEnrollments,
  organizationMemberships,
  paymentChannels,
  paymentObligations,
  waitlistEntries,
} from "@/db/schema";
import { getDatabase } from "@/db/client";
import { requireActiveOrganization } from "@/lib/auth/dal";
import { hasPermission, type OrganizationPrincipal } from "@/lib/authorization/permissions";
import type { PaymentChannelKind } from "@/lib/payments/payment-channel-rules";

import { liveEnrollmentStatuses } from "./student";

const paymentDecisionStatuses = ["overdue", "awaiting_review"] as const;
const activeWaitlistStatuses = ["waiting", "offered"] as const;

export class PaymentChannelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentChannelError";
  }
}

export type CenterAdminWorkspaceContext = {
  actorMembershipId: string;
  organization: {
    id: string;
    name: string;
    roles: OrganizationPrincipal["roles"];
  };
  userId: string;
  userName: string;
};

export type PaymentChannelSettings = {
  accountHolder: string | null;
  accountIdentifier: string | null;
  displayOrder: number;
  id: string;
  instructions: string | null;
  isActive: boolean;
  kind: PaymentChannelKind;
  label: string;
};

export type PaymentChannelSettingsInput = {
  accountHolder: string | null;
  accountIdentifier: string | null;
  instructions: string | null;
  isActive: boolean;
  kind: PaymentChannelKind;
  label: string;
};

export type CenterAdminDashboard = {
  activeGroups: number;
  activeStudents: number;
  paymentDecisions: number;
  waitlistEntries: number;
};

function toPrincipal(context: Awaited<ReturnType<typeof requireActiveOrganization>>): OrganizationPrincipal {
  return {
    organizationId: context.organization.id,
    roles: context.organization.roles,
    userId: context.session.userId,
  };
}

function displayOrderFor(kind: PaymentChannelKind): number {
  return {
    instapay: 10,
    vodafone_cash: 20,
    bank_transfer: 30,
    cash: 40,
  }[kind];
}

function asSettings(row: {
  accountHolder: string | null;
  accountIdentifier: string | null;
  displayOrder: number;
  id: string;
  instructions: string | null;
  isActive: boolean;
  kind: PaymentChannelKind;
  label: string;
}): PaymentChannelSettings {
  return row;
}

export async function getCurrentCenterAdminWorkspace(): Promise<CenterAdminWorkspaceContext | null> {
  const activeOrganization = await requireActiveOrganization();
  const principal = toPrincipal(activeOrganization);
  if (!hasPermission(principal, "organization.manage_settings")) return null;

  const db = getDatabase();
  const [membership] = await db
    .select({ id: organizationMemberships.id })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.organizationId, activeOrganization.organization.id),
        eq(organizationMemberships.userId, activeOrganization.session.userId),
        eq(organizationMemberships.role, "center_admin"),
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

export async function getPaymentChannelSettings(
  context: Pick<CenterAdminWorkspaceContext, "organization">,
): Promise<PaymentChannelSettings[]> {
  const db = getDatabase();
  const rows = await db
    .select({
      accountHolder: paymentChannels.accountHolder,
      accountIdentifier: paymentChannels.accountIdentifier,
      displayOrder: paymentChannels.displayOrder,
      id: paymentChannels.id,
      instructions: paymentChannels.instructions,
      isActive: paymentChannels.isActive,
      kind: paymentChannels.kind,
      label: paymentChannels.label,
    })
    .from(paymentChannels)
    .where(eq(paymentChannels.organizationId, context.organization.id))
    .orderBy(asc(paymentChannels.displayOrder), asc(paymentChannels.label));

  return rows.map((row) => asSettings({ ...row, kind: row.kind as PaymentChannelKind }));
}

export async function getCenterAdminDashboard(
  context: Pick<CenterAdminWorkspaceContext, "organization">,
): Promise<CenterAdminDashboard> {
  const db = getDatabase();
  const [[groupCount], [studentCount], [paymentCount], [waitlistCount]] = await Promise.all([
    db
      .select({ value: count() })
      .from(academicGroups)
      .where(and(eq(academicGroups.organizationId, context.organization.id), eq(academicGroups.status, "active"))),
    db
      .select({ value: count() })
      .from(groupEnrollments)
      .where(
        and(
          eq(groupEnrollments.organizationId, context.organization.id),
          inArray(groupEnrollments.status, liveEnrollmentStatuses),
        ),
      ),
    db
      .select({ value: count() })
      .from(paymentObligations)
      .where(
        and(
          eq(paymentObligations.organizationId, context.organization.id),
          inArray(paymentObligations.status, paymentDecisionStatuses),
        ),
      ),
    db
      .select({ value: count() })
      .from(waitlistEntries)
      .where(
        and(
          eq(waitlistEntries.organizationId, context.organization.id),
          inArray(waitlistEntries.status, activeWaitlistStatuses),
        ),
      ),
  ]);

  return {
    activeGroups: Number(groupCount?.value ?? 0),
    activeStudents: Number(studentCount?.value ?? 0),
    paymentDecisions: Number(paymentCount?.value ?? 0),
    waitlistEntries: Number(waitlistCount?.value ?? 0),
  };
}

export async function savePaymentChannel(input: PaymentChannelSettingsInput): Promise<void> {
  const context = await getCurrentCenterAdminWorkspace();
  if (!context) throw new PaymentChannelError("Only a center administrator can change payment instructions.");

  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [channel] = await tx
      .insert(paymentChannels)
      .values({
        accountHolder: input.accountHolder,
        accountIdentifier: input.accountIdentifier,
        displayOrder: displayOrderFor(input.kind),
        instructions: input.instructions,
        isActive: input.isActive,
        kind: input.kind,
        label: input.label,
        organizationId: context.organization.id,
      })
      .onConflictDoUpdate({
        set: {
          accountHolder: input.accountHolder,
          accountIdentifier: input.accountIdentifier,
          displayOrder: displayOrderFor(input.kind),
          instructions: input.instructions,
          isActive: input.isActive,
          label: input.label,
        },
        target: [paymentChannels.organizationId, paymentChannels.kind],
      })
      .returning({ id: paymentChannels.id });

    if (!channel) throw new PaymentChannelError("The payment channel could not be saved.");

    await tx.insert(auditLogs).values({
      action: "organization.payment_channel_saved",
      actorMembershipId: context.actorMembershipId,
      entityId: channel.id,
      entityType: "payment_channel",
      metadata: { isActive: input.isActive, kind: input.kind },
      organizationId: context.organization.id,
    });
  });
}
