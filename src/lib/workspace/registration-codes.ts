import "server-only";

import { and, desc, eq, gt, isNull } from "drizzle-orm";

import {
  auditLogs,
  authSessions,
  guardianStudentLinks,
  organizationMemberships,
  organizationRegistrationCodes,
  organizations,
  studentProfiles,
  users,
} from "@/db/schema";
import { getDatabase } from "@/db/client";
import {
  createRegistrationCode,
  hashRegistrationCode,
  normalizeRegistrationCode,
} from "@/lib/auth/crypto";
import { AuthenticationError, RegistrationCodeError } from "@/lib/auth/errors";
import { getCurrentSession } from "@/lib/auth/service";

import { getCurrentCenterAdminWorkspace, type CenterAdminWorkspaceContext } from "./payment-channels";

export type RegistrationRole = "student" | "guardian";

export type RegistrationCodeSummary = {
  createdAt: Date;
  expiresAt: Date | null;
  id: string;
  isActive: boolean;
  label: string | null;
  maxUses: number;
  role: RegistrationRole;
  usedCount: number;
};

export type CreateRegistrationCodeInput = {
  expiresAt: Date;
  label: string | null;
  maxUses: number;
  role: RegistrationRole;
};

export type CreatedRegistrationCode = RegistrationCodeSummary & {
  code: string;
};

export type CompleteOnboardingInput = {
  gradeLevel: string;
  registrationCode: string;
  relationship: string;
  role: RegistrationRole;
  studentCode: string;
};

export class RegistrationCodeManagementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistrationCodeManagementError";
  }
}

function asRole(value: string): RegistrationRole {
  if (value === "student" || value === "guardian") return value;
  throw new RegistrationCodeManagementError("This registration code has an unsupported role.");
}

function toSummary(row: {
  createdAt: Date;
  expiresAt: Date | null;
  id: string;
  isActive: boolean;
  label: string | null;
  maxUses: number;
  role: string;
  usedCount: number;
}): RegistrationCodeSummary {
  return {
    ...row,
    role: asRole(row.role),
  };
}

async function createMembership(
  transaction: Parameters<ReturnType<typeof getDatabase>["transaction"]>[0] extends (tx: infer Transaction) => unknown ? Transaction : never,
  input: { organizationId: string; role: RegistrationRole; userId: string },
): Promise<string> {
  const [membership] = await transaction
    .insert(organizationMemberships)
    .values({
      organizationId: input.organizationId,
      role: input.role,
      status: "active",
      userId: input.userId,
    })
    .onConflictDoUpdate({
      set: { status: "active" },
      target: [organizationMemberships.organizationId, organizationMemberships.userId, organizationMemberships.role],
    })
    .returning({ id: organizationMemberships.id });

  if (!membership) throw new RegistrationCodeError("We could not activate your center access. Try again.");
  return membership.id;
}

export async function getRegistrationCodes(
  context: Pick<CenterAdminWorkspaceContext, "organization">,
): Promise<RegistrationCodeSummary[]> {
  const db = getDatabase();
  const rows = await db
    .select({
      createdAt: organizationRegistrationCodes.createdAt,
      expiresAt: organizationRegistrationCodes.expiresAt,
      id: organizationRegistrationCodes.id,
      isActive: organizationRegistrationCodes.isActive,
      label: organizationRegistrationCodes.label,
      maxUses: organizationRegistrationCodes.maxUses,
      role: organizationRegistrationCodes.role,
      usedCount: organizationRegistrationCodes.usedCount,
    })
    .from(organizationRegistrationCodes)
    .where(eq(organizationRegistrationCodes.organizationId, context.organization.id))
    .orderBy(desc(organizationRegistrationCodes.createdAt));

  return rows.map(toSummary);
}

export async function createOrganizationRegistrationCode(
  input: CreateRegistrationCodeInput,
): Promise<CreatedRegistrationCode> {
  const context = await getCurrentCenterAdminWorkspace();
  if (!context) throw new RegistrationCodeManagementError("Only a center administrator can create access codes.");
  if (input.maxUses < 1 || input.maxUses > 500) {
    throw new RegistrationCodeManagementError("Choose between 1 and 500 uses for an access code.");
  }
  if (input.expiresAt <= new Date()) {
    throw new RegistrationCodeManagementError("Choose an expiry date in the future.");
  }

  const db = getDatabase();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const code = createRegistrationCode();
    const created = await db.transaction(async (tx) => {
      const [record] = await tx
        .insert(organizationRegistrationCodes)
        .values({
          codeHash: hashRegistrationCode(code),
          createdByMembershipId: context.actorMembershipId,
          expiresAt: input.expiresAt,
          isActive: true,
          label: input.label,
          maxUses: input.maxUses,
          organizationId: context.organization.id,
          role: input.role,
          usedCount: 0,
        })
        .onConflictDoNothing()
        .returning({
          createdAt: organizationRegistrationCodes.createdAt,
          expiresAt: organizationRegistrationCodes.expiresAt,
          id: organizationRegistrationCodes.id,
          isActive: organizationRegistrationCodes.isActive,
          label: organizationRegistrationCodes.label,
          maxUses: organizationRegistrationCodes.maxUses,
          role: organizationRegistrationCodes.role,
          usedCount: organizationRegistrationCodes.usedCount,
        });

      if (!record) return null;

      await tx.insert(auditLogs).values({
        action: "registration_code.created",
        actorMembershipId: context.actorMembershipId,
        entityId: record.id,
        entityType: "organization_registration_code",
        metadata: { maxUses: input.maxUses, role: input.role },
        organizationId: context.organization.id,
      });

      return record;
    });

    if (created) return { ...toSummary(created), code };
  }

  throw new RegistrationCodeManagementError("We could not generate a unique access code. Try again.");
}

export async function deactivateOrganizationRegistrationCode(codeId: string): Promise<void> {
  const context = await getCurrentCenterAdminWorkspace();
  if (!context) throw new RegistrationCodeManagementError("Only a center administrator can deactivate access codes.");

  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [code] = await tx
      .update(organizationRegistrationCodes)
      .set({ isActive: false })
      .where(
        and(
          eq(organizationRegistrationCodes.id, codeId),
          eq(organizationRegistrationCodes.organizationId, context.organization.id),
        ),
      )
      .returning({ id: organizationRegistrationCodes.id });

    if (!code) throw new RegistrationCodeManagementError("That access code is no longer available.");

    await tx.insert(auditLogs).values({
      action: "registration_code.deactivated",
      actorMembershipId: context.actorMembershipId,
      entityId: code.id,
      entityType: "organization_registration_code",
      metadata: {},
      organizationId: context.organization.id,
    });
  });
}

export async function completeOnboardingWithRegistrationCode(input: CompleteOnboardingInput): Promise<void> {
  const session = await getCurrentSession();
  if (!session) throw new AuthenticationError("Your session has expired. Sign in again.");

  const registrationCode = input.registrationCode ? normalizeRegistrationCode(input.registrationCode) : "";
  const relationship = input.relationship ? input.relationship.trim() : "Parent";
  const gradeLevel = input.gradeLevel ? input.gradeLevel.trim() : "1st Secondary";
  const now = new Date();
  const db = getDatabase();

  await db.transaction(async (tx) => {
    const [activeSession] = await tx
      .select({ id: authSessions.id, userId: authSessions.userId })
      .from(authSessions)
      .where(
        and(
          eq(authSessions.id, session.id),
          eq(authSessions.userId, session.userId),
          gt(authSessions.expiresAt, now),
          isNull(authSessions.revokedAt),
        ),
      )
      .for("update")
      .limit(1);

    if (!activeSession) throw new AuthenticationError("Your session has expired. Sign in again.");

    let targetOrganizationId = "";
    let matchedCode: typeof organizationRegistrationCodes.$inferSelect | null = null;

    if (registrationCode) {
      const [code] = await tx
        .select()
        .from(organizationRegistrationCodes)
        .where(eq(organizationRegistrationCodes.codeHash, hashRegistrationCode(registrationCode)))
        .for("update")
        .limit(1);

      if (
        !code
        || !code.isActive
        || code.usedCount >= code.maxUses
        || (code.expiresAt !== null && code.expiresAt <= now)
      ) {
        throw new RegistrationCodeError();
      }
      if (code.role !== input.role) {
        throw new RegistrationCodeError("This center access code is for a different account type.");
      }

      matchedCode = code;
      targetOrganizationId = code.organizationId;
    } else {
      const [defaultOrg] = await tx.select({ id: organizations.id }).from(organizations).limit(1);
      if (!defaultOrg) throw new RegistrationCodeError("No active center found. Please contact support.");
      targetOrganizationId = defaultOrg.id;
    }

    const [user] = await tx
      .select({ fullName: users.fullName, id: users.id, status: users.status })
      .from(users)
      .where(eq(users.id, activeSession.userId))
      .for("update")
      .limit(1);

    if (!user || user.status !== "active") throw new AuthenticationError("Your account is unavailable.");

    let membershipId: string;
    let entityId: string;
    let entityType: "guardian_student_link" | "student_profile";

    const effectiveStudentCode = input.studentCode
      ? input.studentCode.trim().toUpperCase()
      : `ST-${Math.floor(1000 + Math.random() * 9000)}`;

    if (input.role === "student") {
      const [profileForUser] = await tx
        .select({ id: studentProfiles.id, studentCode: studentProfiles.studentCode })
        .from(studentProfiles)
        .where(
          and(
            eq(studentProfiles.organizationId, targetOrganizationId),
            eq(studentProfiles.userId, activeSession.userId),
          ),
        )
        .for("update")
        .limit(1);

      if (profileForUser) {
        throw new RegistrationCodeError("This student account is already connected to this center.");
      }

      const [profileForCode] = await tx
        .select({ id: studentProfiles.id, userId: studentProfiles.userId })
        .from(studentProfiles)
        .where(
          and(
            eq(studentProfiles.organizationId, targetOrganizationId),
            eq(studentProfiles.studentCode, effectiveStudentCode),
          ),
        )
        .for("update")
        .limit(1);

      if (profileForCode?.userId && profileForCode.userId !== activeSession.userId) {
        throw new RegistrationCodeError("That student code is already linked to another account.");
      }

      membershipId = await createMembership(tx, {
        organizationId: targetOrganizationId,
        role: "student",
        userId: activeSession.userId,
      });

      if (profileForCode) {
        if (!profileForCode.userId) {
          await tx
            .update(studentProfiles)
            .set({ gradeLevel, userId: activeSession.userId })
            .where(eq(studentProfiles.id, profileForCode.id));
        }
        entityId = profileForCode.id;
      } else {
        const [createdProfile] = await tx
          .insert(studentProfiles)
          .values({
            createdByMembershipId: membershipId,
            fullName: user.fullName,
            gradeLevel,
            organizationId: targetOrganizationId,
            status: "active",
            studentCode: effectiveStudentCode,
            userId: activeSession.userId,
          })
          .returning({ id: studentProfiles.id });

        if (!createdProfile) throw new RegistrationCodeError("We could not create the student profile. Try again.");
        entityId = createdProfile.id;
      }
      entityType = "student_profile";
    } else {
      const [student] = await tx
        .select({ id: studentProfiles.id })
        .from(studentProfiles)
        .where(
          and(
            eq(studentProfiles.organizationId, targetOrganizationId),
            eq(studentProfiles.studentCode, effectiveStudentCode),
          ),
        )
        .for("update")
        .limit(1);

      if (!student) {
        throw new RegistrationCodeError("We could not find that student in this center. Check the student code with the center.");
      }

      membershipId = await createMembership(tx, {
        organizationId: targetOrganizationId,
        role: "guardian",
        userId: activeSession.userId,
      });

      const [link] = await tx
        .insert(guardianStudentLinks)
        .values({
          guardianMembershipId: membershipId,
          organizationId: targetOrganizationId,
          relationship,
          studentProfileId: student.id,
        })
        .onConflictDoUpdate({
          set: { relationship },
          target: [
            guardianStudentLinks.organizationId,
            guardianStudentLinks.guardianMembershipId,
            guardianStudentLinks.studentProfileId,
          ],
        })
        .returning({ id: guardianStudentLinks.id });

      if (!link) throw new RegistrationCodeError("We could not link the guardian account. Try again.");
      entityId = link.id;
      entityType = "guardian_student_link";
    }

    if (matchedCode) {
      const nextUsedCount = matchedCode.usedCount + 1;
      await tx
        .update(organizationRegistrationCodes)
        .set({
          isActive: nextUsedCount < matchedCode.maxUses,
          usedCount: nextUsedCount,
        })
        .where(eq(organizationRegistrationCodes.id, matchedCode.id));
    }

    await tx.update(authSessions).set({ organizationId: targetOrganizationId }).where(eq(authSessions.id, activeSession.id));

    await tx.insert(auditLogs).values({
      action: "registration_code.redeemed",
      actorMembershipId: membershipId,
      entityId,
      entityType,
      metadata: { registrationCodeId: matchedCode?.id ?? "auto_enrolled", role: input.role },
      organizationId: targetOrganizationId,
    });
  });
}
