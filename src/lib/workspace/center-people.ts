import "server-only";

import { and, count, eq } from "drizzle-orm";

import {
  auditLogs,
  guardianStudentLinks,
  organizationMemberships,
  studentProfiles,
  teacherProfiles,
  users,
} from "@/db/schema";
import { getDatabase, type Database } from "@/db/client";

import { normalizeEmailAddress } from "@/lib/auth/email";
import { hashPassword, MINIMUM_PASSWORD_LENGTH } from "@/lib/auth/password";

import { getCurrentCenterAdminWorkspace } from "./payment-channels";

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
  hasStudentAccount: boolean;
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

function databaseMessage(error: unknown): string | null {
  if ((error as { code?: string } | undefined)?.code === "23505") {
    return "That student code or account relationship already exists in this center.";
  }

  return null;
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

export async function getCenterStudentDirectory(): Promise<CenterStudentDirectoryItem[]> {
  const context = await getCurrentCenterAdminWorkspace();
  if (!context) throw new CenterPeopleError("Only a center administrator can view this directory.");

  const db = getDatabase();
  const [students, guardianCounts] = await Promise.all([
    db
      .select({
        email: users.email,
        fullName: studentProfiles.fullName,
        gradeLevel: studentProfiles.gradeLevel,
        id: studentProfiles.id,
        studentCode: studentProfiles.studentCode,
        userId: studentProfiles.userId,
      })
      .from(studentProfiles)
      .leftJoin(users, eq(studentProfiles.userId, users.id))
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
    hasStudentAccount: Boolean(student.userId),
    id: student.id,
    linkedGuardianCount: guardianCountByStudentId.get(student.id) ?? 0,
    studentCode: student.studentCode,
  }));
}

export async function createStudent(input: CreateStudentInput): Promise<void> {
  const context = await getCurrentCenterAdminWorkspace();
  if (!context) throw new CenterPeopleError("Only a center administrator can create students.");

  const email = input.email ? normalizeEmailAddress(input.email) : null;
  if (Boolean(email) !== Boolean(input.password)) {
    throw new CenterPeopleError("Add both an email and an initial password to create a student account.");
  }

  if (input.password) assertPasswordLength(input.password);
  const passwordHash = input.password ? await hashPassword(input.password) : null;
  const db = getDatabase();

  try {
    await db.transaction(async (tx) => {
      let userId: string | null = null;

      if (email && passwordHash) {
        const accountId = await prepareActiveAccount(tx, { email, fullName: input.fullName, passwordHash });

        const [existingStudent] = await tx
          .select({ id: studentProfiles.id })
          .from(studentProfiles)
          .where(
            and(
              eq(studentProfiles.organizationId, context.organization.id),
              eq(studentProfiles.userId, accountId),
            ),
          )
          .for("update")
          .limit(1);

        if (existingStudent) throw new CenterPeopleError("This account already belongs to a student in this center.");

        await tx
          .insert(organizationMemberships)
          .values({
            organizationId: context.organization.id,
            role: "student",
            status: "active",
            userId: accountId,
          })
          .onConflictDoUpdate({
            set: { status: "active" },
            target: [
              organizationMemberships.organizationId,
              organizationMemberships.userId,
              organizationMemberships.role,
            ],
          });

        userId = accountId;
      }

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

      await tx.insert(auditLogs).values({
        action: "student.created",
        actorMembershipId: context.actorMembershipId,
        entityId: student.id,
        entityType: "student_profile",
        metadata: { accountCreated: Boolean(userId), studentCode: input.studentCode },
        organizationId: context.organization.id,
      });
    });
  } catch (error) {
    const message = databaseMessage(error);
    if (message) throw new CenterPeopleError(message);
    throw error;
  }
}

export async function createGuardianAndLinkStudent(input: CreateGuardianInput): Promise<void> {
  const context = await getCurrentCenterAdminWorkspace();
  if (!context) throw new CenterPeopleError("Only a center administrator can link guardians.");

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
