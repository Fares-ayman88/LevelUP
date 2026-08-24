import "server-only";

import { and, count, eq } from "drizzle-orm";

import {
  auditLogs,
  guardianStudentLinks,
  organizationMemberships,
  studentAccessCodes,
  studentProfiles,
  teacherProfiles,
  users,
} from "@/db/schema";
import { getDatabase, type Database } from "@/db/client";
import { createStudentAccessCode, hashStudentAccessCode } from "@/lib/auth/crypto";
import { requireActiveOrganization } from "@/lib/auth/dal";
import { normalizeEmailAddress } from "@/lib/auth/email";
import { hashPassword, MINIMUM_PASSWORD_LENGTH } from "@/lib/auth/password";

import { getCurrentCenterAdminWorkspace, type CenterAdminWorkspaceContext } from "./payment-channels";

export type StaffAccountRole = "assistant" | "center_admin" | "teacher";

export class CenterPeopleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CenterPeopleError";
  }
}

export type CenterStudentDirectoryItem = {
  email: string | null;
  fullName: string;
  gradeLevel: string;
  hasEmailSignIn: boolean;
  hasStudentAccessCode: boolean;
  id: string;
  linkedGuardianCount: number;
  studentCode: string;
};

export type CreateStudentInput = {
  email: string | null;
  fullName: string;
  gradeLevel: string;
  password: string | null;
  studentCode: string;
};

export type CreateStudentResult = {
  studentAccessCode: string | null;
  studentId: string;
};

export type CreateGuardianInput = {
  email: string;
  fullName: string;
  password: string;
  relationship: string;
  studentProfileId: string;
};

export type CreateStaffAccountInput = {
  email: string;
  fullName: string;
  password: string;
  role: StaffAccountRole;
};

type DatabaseTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

type AccountProvisioningInput = {
  email: string;
  fullName: string;
  passwordHash: string;
};

type MembershipInput = {
  organizationId: string;
  role: "guardian" | "student";
  userId: string;
};

function databaseMessage(error: unknown): string | null {
  if ((error as { code?: string } | undefined)?.code === "23505") {
    return "That student ID or account relationship already exists in this center.";
  }

  return null;
}

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | undefined)?.code === "23505";
}

function assertPasswordLength(password: string): void {
  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    throw new CenterPeopleError(`Use at least ${MINIMUM_PASSWORD_LENGTH} characters for the initial password.`);
  }
}

async function prepareActiveAccount(tx: DatabaseTransaction, input: AccountProvisioningInput): Promise<string> {
  const [existingAccount] = await tx
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
      status: users.status,
    })
    .from(users)
    .where(eq(users.email, input.email))
    .for("update")
    .limit(1);

  if (!existingAccount) {
    const [createdAccount] = await tx
      .insert(users)
      .values({
        email: input.email,
        fullName: input.fullName,
        passwordHash: input.passwordHash,
        status: "active",
      })
      .returning({ id: users.id });

    if (!createdAccount) throw new CenterPeopleError("The account could not be prepared.");
    return createdAccount.id;
  }

  if (existingAccount.status !== "active") {
    throw new CenterPeopleError("This email belongs to a suspended account.");
  }

  if (!existingAccount.passwordHash) {
    await tx.update(users).set({ passwordHash: input.passwordHash }).where(eq(users.id, existingAccount.id));
  }

  return existingAccount.id;
}

async function createAccessOnlyAccount(tx: DatabaseTransaction, fullName: string): Promise<string> {
  const [user] = await tx
    .insert(users)
    .values({ fullName, status: "active" })
    .returning({ id: users.id });

  if (!user) throw new CenterPeopleError("The student access account could not be prepared.");
  return user.id;
}

async function ensureMembership(tx: DatabaseTransaction, input: MembershipInput): Promise<string> {
  const [membership] = await tx
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

  if (!membership) throw new CenterPeopleError("The student membership could not be prepared.");
  return membership.id;
}

async function issueStudentAccessCode(
  tx: DatabaseTransaction,
  input: {
    actorMembershipId: string;
    organizationId: string;
    studentProfileId: string;
    userId: string;
  },
): Promise<string> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const code = createStudentAccessCode();
    const codeHash = hashStudentAccessCode(code);

    try {
      await tx
        .insert(studentAccessCodes)
        .values({
          codeHash,
          createdByMembershipId: input.actorMembershipId,
          organizationId: input.organizationId,
          studentProfileId: input.studentProfileId,
          userId: input.userId,
        })
        .onConflictDoUpdate({
          set: {
            codeHash,
            createdByMembershipId: input.actorMembershipId,
            isActive: true,
            lastUsedAt: null,
          },
          target: studentAccessCodes.studentProfileId,
        });

      return code;
    } catch (error) {
      if (isUniqueViolation(error) && attempt < 3) continue;
      throw error;
    }
  }

  throw new CenterPeopleError("We could not generate a unique student access code. Try again.");
}

export async function getCurrentCenterPeopleWorkspace(): Promise<CenterAdminWorkspaceContext | null> {
  const adminContext = await getCurrentCenterAdminWorkspace();
  if (adminContext) return adminContext;

  const activeOrganization = await requireActiveOrganization();
  if (!activeOrganization.organization.roles.includes("assistant")) return null;

  const db = getDatabase();
  const [membership] = await db
    .select({ id: organizationMemberships.id })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.organizationId, activeOrganization.organization.id),
        eq(organizationMemberships.userId, activeOrganization.session.userId),
        eq(organizationMemberships.role, "assistant"),
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

export async function getCenterStudentDirectory(): Promise<CenterStudentDirectoryItem[]> {
  const context = await getCurrentCenterPeopleWorkspace();
  if (!context) throw new CenterPeopleError("Only a center administrator or assistant can view this directory.");

  const db = getDatabase();
  const [students, guardianCounts] = await Promise.all([
    db
      .select({
        accessCodeId: studentAccessCodes.id,
        accessCodeIsActive: studentAccessCodes.isActive,
        email: users.email,
        fullName: studentProfiles.fullName,
        gradeLevel: studentProfiles.gradeLevel,
        id: studentProfiles.id,
        studentCode: studentProfiles.studentCode,
      })
      .from(studentProfiles)
      .leftJoin(users, eq(studentProfiles.userId, users.id))
      .leftJoin(studentAccessCodes, eq(studentProfiles.id, studentAccessCodes.studentProfileId))
      .where(eq(studentProfiles.organizationId, context.organization.id))
      .orderBy(studentProfiles.fullName),
    db
      .select({ linkedGuardianCount: count(), studentProfileId: guardianStudentLinks.studentProfileId })
      .from(guardianStudentLinks)
      .where(eq(guardianStudentLinks.organizationId, context.organization.id))
      .groupBy(guardianStudentLinks.studentProfileId),
  ]);

  const guardianCountByStudentId = new Map(
    guardianCounts.map((row) => [row.studentProfileId, Number(row.linkedGuardianCount)]),
  );

  return students.map((student) => ({
    email: student.email,
    fullName: student.fullName,
    gradeLevel: student.gradeLevel,
    hasEmailSignIn: Boolean(student.email),
    hasStudentAccessCode: Boolean(student.accessCodeId && student.accessCodeIsActive),
    id: student.id,
    linkedGuardianCount: guardianCountByStudentId.get(student.id) ?? 0,
    studentCode: student.studentCode,
  }));
}

export async function createStudent(input: CreateStudentInput): Promise<CreateStudentResult> {
  const context = await getCurrentCenterPeopleWorkspace();
  if (!context) throw new CenterPeopleError("Only a center administrator or assistant can create students.");

  const email = input.email ? normalizeEmailAddress(input.email) : null;
  if (Boolean(email) !== Boolean(input.password)) {
    throw new CenterPeopleError("Add both an email and an initial password, or leave both blank for a student access code.");
  }

  if (input.password) assertPasswordLength(input.password);
  const passwordHash = input.password ? await hashPassword(input.password) : null;
  const db = getDatabase();

  try {
    return await db.transaction(async (tx) => {
      const userId = email && passwordHash
        ? await prepareActiveAccount(tx, { email, fullName: input.fullName, passwordHash })
        : await createAccessOnlyAccount(tx, input.fullName);

      const [existingStudent] = await tx
        .select({ id: studentProfiles.id })
        .from(studentProfiles)
        .where(
          and(
            eq(studentProfiles.organizationId, context.organization.id),
            eq(studentProfiles.userId, userId),
          ),
        )
        .for("update")
        .limit(1);

      if (existingStudent) throw new CenterPeopleError("This account already belongs to a student in this center.");

      await ensureMembership(tx, {
        organizationId: context.organization.id,
        role: "student",
        userId,
      });

      const [student] = await tx
        .insert(studentProfiles)
        .values({
          createdByMembershipId: context.actorMembershipId,
          fullName: input.fullName,
          gradeLevel: input.gradeLevel,
          organizationId: context.organization.id,
          status: "active",
          studentCode: input.studentCode,
          userId,
        })
        .returning({ id: studentProfiles.id });

      if (!student) throw new CenterPeopleError("The student record could not be created.");

      const studentAccessCode = email
        ? null
        : await issueStudentAccessCode(tx, {
          actorMembershipId: context.actorMembershipId,
          organizationId: context.organization.id,
          studentProfileId: student.id,
          userId,
        });

      await tx.insert(auditLogs).values({
        action: "student.created",
        actorMembershipId: context.actorMembershipId,
        entityId: student.id,
        entityType: "student_profile",
        metadata: { accountMode: email ? "email_password" : "student_access_code", studentCode: input.studentCode },
        organizationId: context.organization.id,
      });

      return { studentAccessCode, studentId: student.id };
    });
  } catch (error) {
    const message = databaseMessage(error);
    if (message) throw new CenterPeopleError(message);
    throw error;
  }
}

export async function resetStudentAccessCode(studentProfileId: string): Promise<string> {
  const context = await getCurrentCenterPeopleWorkspace();
  if (!context) throw new CenterPeopleError("Only a center administrator or assistant can reset a student access code.");

  const db = getDatabase();
  try {
    return await db.transaction(async (tx) => {
      const [student] = await tx
        .select({ fullName: studentProfiles.fullName, id: studentProfiles.id, userId: studentProfiles.userId })
        .from(studentProfiles)
        .where(
          and(
            eq(studentProfiles.id, studentProfileId),
            eq(studentProfiles.organizationId, context.organization.id),
          ),
        )
        .for("update")
        .limit(1);

      if (!student) throw new CenterPeopleError("Choose a student from this center.");

      const userId = student.userId ?? await createAccessOnlyAccount(tx, student.fullName);
      if (!student.userId) {
        await tx.update(studentProfiles).set({ userId }).where(eq(studentProfiles.id, student.id));
      }

      await ensureMembership(tx, {
        organizationId: context.organization.id,
        role: "student",
        userId,
      });

      const code = await issueStudentAccessCode(tx, {
        actorMembershipId: context.actorMembershipId,
        organizationId: context.organization.id,
        studentProfileId: student.id,
        userId,
      });

      await tx.insert(auditLogs).values({
        action: "student.access_code_reset",
        actorMembershipId: context.actorMembershipId,
        entityId: student.id,
        entityType: "student_profile",
        metadata: {},
        organizationId: context.organization.id,
      });

      return code;
    });
  } catch (error) {
    const message = databaseMessage(error);
    if (message) throw new CenterPeopleError(message);
    throw error;
  }
}

export async function createGuardianAndLinkStudent(input: CreateGuardianInput): Promise<void> {
  const context = await getCurrentCenterPeopleWorkspace();
  if (!context) throw new CenterPeopleError("Only a center administrator or assistant can link guardians.");

  const email = normalizeEmailAddress(input.email);
  assertPasswordLength(input.password);
  const passwordHash = await hashPassword(input.password);
  const db = getDatabase();

  try {
    await db.transaction(async (tx) => {
      const [student] = await tx
        .select({ id: studentProfiles.id })
        .from(studentProfiles)
        .where(
          and(
            eq(studentProfiles.id, input.studentProfileId),
            eq(studentProfiles.organizationId, context.organization.id),
          ),
        )
        .for("update")
        .limit(1);

      if (!student) throw new CenterPeopleError("Choose a student from this center.");

      const userId = await prepareActiveAccount(tx, { email, fullName: input.fullName, passwordHash });

      const [membership] = await tx
        .insert(organizationMemberships)
        .values({
          organizationId: context.organization.id,
          role: "guardian",
          status: "active",
          userId,
        })
        .onConflictDoUpdate({
          set: { status: "active" },
          target: [
            organizationMemberships.organizationId,
            organizationMemberships.userId,
            organizationMemberships.role,
          ],
        })
        .returning({ id: organizationMemberships.id });

      if (!membership) throw new CenterPeopleError("The guardian membership could not be prepared.");

      await tx
        .insert(guardianStudentLinks)
        .values({
          guardianMembershipId: membership.id,
          organizationId: context.organization.id,
          relationship: input.relationship,
          studentProfileId: student.id,
        })
        .onConflictDoNothing();

      await tx.insert(auditLogs).values({
        action: "guardian.linked_to_student",
        actorMembershipId: context.actorMembershipId,
        entityId: student.id,
        entityType: "student_profile",
        metadata: { relationship: input.relationship },
        organizationId: context.organization.id,
      });
    });
  } catch (error) {
    const message = databaseMessage(error);
    if (message) throw new CenterPeopleError(message);
    throw error;
  }
}

export async function createStaffAccount(input: CreateStaffAccountInput): Promise<void> {
  const context = await getCurrentCenterAdminWorkspace();
  if (!context) throw new CenterPeopleError("Only a center administrator can create staff accounts.");

  const email = normalizeEmailAddress(input.email);
  assertPasswordLength(input.password);
  const passwordHash = await hashPassword(input.password);
  const db = getDatabase();

  try {
    await db.transaction(async (tx) => {
      const userId = await prepareActiveAccount(tx, { email, fullName: input.fullName, passwordHash });

      const [membership] = await tx
        .insert(organizationMemberships)
        .values({
          organizationId: context.organization.id,
          role: input.role,
          status: "active",
          userId,
        })
        .onConflictDoUpdate({
          set: { status: "active" },
          target: [
            organizationMemberships.organizationId,
            organizationMemberships.userId,
            organizationMemberships.role,
          ],
        })
        .returning({ id: organizationMemberships.id });

      if (!membership) throw new CenterPeopleError("The staff membership could not be prepared.");

      if (input.role === "teacher") {
        await tx
          .insert(teacherProfiles)
          .values({
            displayName: input.fullName,
            isPublished: false,
            membershipId: membership.id,
            organizationId: context.organization.id,
          })
          .onConflictDoNothing();
      }

      await tx.insert(auditLogs).values({
        action: "organization.staff_account_created",
        actorMembershipId: context.actorMembershipId,
        entityId: membership.id,
        entityType: "organization_membership",
        metadata: { role: input.role },
        organizationId: context.organization.id,
      });
    });
  } catch (error) {
    const message = databaseMessage(error);
    if (message) throw new CenterPeopleError(message);
    throw error;
  }
}
