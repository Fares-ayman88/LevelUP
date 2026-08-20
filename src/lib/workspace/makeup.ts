import "server-only";

import { and, count, eq, gt, gte, inArray, lt, lte, ne, notInArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import {
  academicGroups,
  auditLogs,
  groupEnrollments,
  groupSchedules,
  groupSessions,
  makeupRequests,
  organizationMemberships,
  studentProfiles,
  subjects,
  teacherProfiles,
} from "@/db/schema";
import { getDatabase } from "@/db/client";
import { requireActiveOrganization } from "@/lib/auth/dal";
import { hasPermission, type OrganizationPrincipal } from "@/lib/authorization/permissions";

import { getCurrentStudentWorkspace, liveEnrollmentStatuses, type StudentWorkspaceContext } from "./student";
import { isWithinMakeupWindow, MAX_MAKEUP_WINDOW_MS } from "./makeup-rules";

const approvedMakeupStatuses = ["approved"] as const;
const openMakeupStatuses = ["pending", "approved"] as const;

export class MakeupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MakeupError";
  }
}

export type MakeupSessionOption = {
  endsAt: Date;
  groupId: string;
  groupName: string;
  id: string;
  roomLabel: string | null;
  seatsLeft: number;
  sourceEnrollmentId?: string;
  startsAt: Date;
  subjectId: string;
  subjectName: string;
  teacherName: string;
};

export type StudentMakeupRequest = {
  createdAt: Date;
  id: string;
  reason: string;
  reviewNote: string | null;
  sourceStartsAt: Date;
  status: string;
  targetGroupName: string;
  targetStartsAt: Date;
};

export type MakeupOperationsContext = {
  actorMembershipId: string;
  organization: {
    id: string;
    name: string;
    roles: OrganizationPrincipal["roles"];
  };
};

function toPrincipal(context: Awaited<ReturnType<typeof requireActiveOrganization>>): OrganizationPrincipal {
  return {
    organizationId: context.organization.id,
    roles: context.organization.roles,
    userId: context.session.userId,
  };
}

export async function getStudentMakeupWorkspace(context: StudentWorkspaceContext): Promise<{
  requests: StudentMakeupRequest[];
  sourceSessions: MakeupSessionOption[];
  targetSessions: MakeupSessionOption[];
}> {
  const db = getDatabase();
  const now = new Date();
  const windowEndsAt = new Date(now.getTime() + MAX_MAKEUP_WINDOW_MS);
  const sourceSessions = await db
    .select({
      endsAt: groupSessions.endsAt,
      groupId: academicGroups.id,
      groupName: academicGroups.name,
      id: groupSessions.id,
      roomLabel: groupSchedules.roomLabel,
      sourceEnrollmentId: groupEnrollments.id,
      startsAt: groupSessions.startsAt,
      subjectId: subjects.id,
      subjectName: subjects.name,
      teacherName: teacherProfiles.displayName,
    })
    .from(groupEnrollments)
    .innerJoin(
      academicGroups,
      and(eq(groupEnrollments.groupId, academicGroups.id), eq(academicGroups.organizationId, context.organization.id)),
    )
    .innerJoin(
      groupSessions,
      and(eq(groupSessions.groupId, academicGroups.id), eq(groupSessions.organizationId, context.organization.id)),
    )
    .leftJoin(
      groupSchedules,
      and(eq(groupSessions.groupScheduleId, groupSchedules.id), eq(groupSchedules.organizationId, context.organization.id)),
    )
    .innerJoin(
      subjects,
      and(eq(academicGroups.subjectId, subjects.id), eq(subjects.organizationId, context.organization.id)),
    )
    .innerJoin(
      teacherProfiles,
      and(eq(academicGroups.teacherProfileId, teacherProfiles.id), eq(teacherProfiles.organizationId, context.organization.id)),
    )
    .where(
      and(
        eq(groupEnrollments.organizationId, context.organization.id),
        eq(groupEnrollments.studentProfileId, context.student.id),
        inArray(groupEnrollments.status, liveEnrollmentStatuses),
        eq(groupSessions.status, "scheduled"),
        gte(groupSessions.startsAt, now),
        lte(groupSessions.startsAt, windowEndsAt),
      ),
    )
    .orderBy(groupSessions.startsAt);

  const sourceSessionIds = sourceSessions.map((session) => session.id);
  const sourceEnrollmentIds = sourceSessions.flatMap((session) => session.sourceEnrollmentId ? [session.sourceEnrollmentId] : []);
  const openSourceRequests = sourceSessionIds.length && sourceEnrollmentIds.length
    ? await db
      .select({ sourceGroupSessionId: makeupRequests.sourceGroupSessionId })
      .from(makeupRequests)
      .where(
        and(
          eq(makeupRequests.organizationId, context.organization.id),
          inArray(makeupRequests.sourceGroupSessionId, sourceSessionIds),
          inArray(makeupRequests.sourceEnrollmentId, sourceEnrollmentIds),
          inArray(makeupRequests.status, openMakeupStatuses),
        ),
      )
    : [];
  const openSourceSessionIds = new Set(openSourceRequests.map((request) => request.sourceGroupSessionId));
  const eligibleSourceSessions = sourceSessions.filter((session) => !openSourceSessionIds.has(session.id));
  const sourceGroupIds = [...new Set(eligibleSourceSessions.map((session) => session.groupId))];
  const subjectIds = [...new Set(eligibleSourceSessions.map((session) => session.subjectId))];
  const targetRows = sourceGroupIds.length && subjectIds.length
    ? await db
      .select({
        capacity: academicGroups.capacity,
        endsAt: groupSessions.endsAt,
        groupId: academicGroups.id,
        groupName: academicGroups.name,
        id: groupSessions.id,
        roomLabel: groupSchedules.roomLabel,
        startsAt: groupSessions.startsAt,
        subjectId: subjects.id,
        subjectName: subjects.name,
        teacherName: teacherProfiles.displayName,
      })
      .from(groupSessions)
      .innerJoin(
        academicGroups,
        and(eq(groupSessions.groupId, academicGroups.id), eq(academicGroups.organizationId, context.organization.id)),
      )
      .leftJoin(
        groupSchedules,
        and(eq(groupSessions.groupScheduleId, groupSchedules.id), eq(groupSchedules.organizationId, context.organization.id)),
      )
      .innerJoin(
        subjects,
        and(eq(academicGroups.subjectId, subjects.id), eq(subjects.organizationId, context.organization.id)),
      )
      .innerJoin(
        teacherProfiles,
        and(eq(academicGroups.teacherProfileId, teacherProfiles.id), eq(teacherProfiles.organizationId, context.organization.id)),
      )
      .where(
        and(
          eq(groupSessions.organizationId, context.organization.id),
          eq(groupSessions.status, "scheduled"),
          eq(academicGroups.status, "active"),
          eq(academicGroups.gradeLevel, context.student.gradeLevel),
          inArray(academicGroups.subjectId, subjectIds),
          notInArray(groupSessions.groupId, sourceGroupIds),
          gte(groupSessions.startsAt, now),
          lte(groupSessions.startsAt, windowEndsAt),
        ),
      )
      .orderBy(groupSessions.startsAt)
    : [];

  const targetSessionIds = targetRows.map((session) => session.id);
  const targetGroupIds = [...new Set(targetRows.map((session) => session.groupId))];
  const [occupancyRows, approvedMakeupRows] = targetGroupIds.length
    ? await Promise.all([
      db
        .select({ groupId: groupEnrollments.groupId, occupied: count() })
        .from(groupEnrollments)
        .where(
          and(
            eq(groupEnrollments.organizationId, context.organization.id),
            inArray(groupEnrollments.groupId, targetGroupIds),
            inArray(groupEnrollments.status, liveEnrollmentStatuses),
          ),
        )
        .groupBy(groupEnrollments.groupId),
      db
        .select({ sessionId: makeupRequests.targetGroupSessionId, approved: count() })
        .from(makeupRequests)
        .where(
          and(
            eq(makeupRequests.organizationId, context.organization.id),
            inArray(makeupRequests.targetGroupSessionId, targetSessionIds),
            inArray(makeupRequests.status, approvedMakeupStatuses),
          ),
        )
        .groupBy(makeupRequests.targetGroupSessionId),
    ])
    : [[], []];

  const occupiedByGroup = new Map(occupancyRows.map((row) => [row.groupId, Number(row.occupied)]));
  const approvedBySession = new Map(approvedMakeupRows.map((row) => [row.sessionId, Number(row.approved)]));
  const targetSessions = targetRows
    .map((target) => ({
      ...target,
      seatsLeft: Math.max(0, target.capacity - (occupiedByGroup.get(target.groupId) ?? 0) - (approvedBySession.get(target.id) ?? 0)),
    }))
    .filter((target) => target.seatsLeft > 0)
    .filter((target) => eligibleSourceSessions.some(
      (source) => source.subjectId === target.subjectId && isWithinMakeupWindow(source.startsAt, target.startsAt),
    ));

  const sourceSessionTable = alias(groupSessions, "makeup_source_sessions");
  const targetSessionTable = alias(groupSessions, "makeup_target_sessions");
  const targetGroupTable = alias(academicGroups, "makeup_target_groups");
  const requests = await db
    .select({
      createdAt: makeupRequests.createdAt,
      id: makeupRequests.id,
      reason: makeupRequests.reason,
      reviewNote: makeupRequests.reviewNote,
      sourceStartsAt: sourceSessionTable.startsAt,
      status: makeupRequests.status,
      targetGroupName: targetGroupTable.name,
      targetStartsAt: targetSessionTable.startsAt,
    })
    .from(makeupRequests)
    .innerJoin(
      sourceSessionTable,
      and(eq(makeupRequests.sourceGroupSessionId, sourceSessionTable.id), eq(sourceSessionTable.organizationId, context.organization.id)),
    )
    .innerJoin(
      targetSessionTable,
      and(eq(makeupRequests.targetGroupSessionId, targetSessionTable.id), eq(targetSessionTable.organizationId, context.organization.id)),
    )
    .innerJoin(
      targetGroupTable,
      and(eq(targetSessionTable.groupId, targetGroupTable.id), eq(targetGroupTable.organizationId, context.organization.id)),
    )
    .innerJoin(
      groupEnrollments,
      and(eq(makeupRequests.sourceEnrollmentId, groupEnrollments.id), eq(groupEnrollments.organizationId, context.organization.id)),
    )
    .where(
      and(
        eq(makeupRequests.organizationId, context.organization.id),
        eq(groupEnrollments.studentProfileId, context.student.id),
      ),
    )
    .orderBy(makeupRequests.createdAt);

  return {
    requests,
    sourceSessions: eligibleSourceSessions.map((session) => ({ ...session, seatsLeft: 0 })),
    targetSessions,
  };
}

export async function createStudentMakeupRequest(input: {
  reason: string;
  sourceGroupSessionId: string;
  sourceEnrollmentId: string;
  targetGroupSessionId: string;
}): Promise<void> {
  const context = await getCurrentStudentWorkspace();
  if (!context) throw new MakeupError("Only an active student can request an alternative class.");

  const reason = input.reason.trim();
  if (reason.length < 10 || reason.length > 500) {
    throw new MakeupError("Tell the center why you need the alternative class in 10 to 500 characters.");
  }

  const db = getDatabase();
  const now = new Date();
  try {
    await db.transaction(async (tx) => {
      const [sourceEnrollment] = await tx
        .select({ groupId: groupEnrollments.groupId, id: groupEnrollments.id })
        .from(groupEnrollments)
        .where(
          and(
            eq(groupEnrollments.id, input.sourceEnrollmentId),
            eq(groupEnrollments.organizationId, context.organization.id),
            eq(groupEnrollments.studentProfileId, context.student.id),
            inArray(groupEnrollments.status, liveEnrollmentStatuses),
          ),
        )
        .for("update")
        .limit(1);
      if (!sourceEnrollment) throw new MakeupError("That original class is no longer available.");

      const [sourceSession] = await tx
        .select({
          groupId: groupSessions.groupId,
          gradeLevel: academicGroups.gradeLevel,
          startsAt: groupSessions.startsAt,
          subjectId: academicGroups.subjectId,
        })
        .from(groupSessions)
        .innerJoin(
          academicGroups,
          and(eq(groupSessions.groupId, academicGroups.id), eq(academicGroups.organizationId, context.organization.id)),
        )
        .where(
          and(
            eq(groupSessions.id, input.sourceGroupSessionId),
            eq(groupSessions.organizationId, context.organization.id),
            eq(groupSessions.status, "scheduled"),
          ),
        )
        .limit(1);
      if (!sourceSession || sourceSession.groupId !== sourceEnrollment.groupId || sourceSession.startsAt <= now) {
        throw new MakeupError("Choose one of your upcoming classes.");
      }

      const [targetSession] = await tx
        .select({
          capacity: academicGroups.capacity,
          endsAt: groupSessions.endsAt,
          gradeLevel: academicGroups.gradeLevel,
          groupId: groupSessions.groupId,
          startsAt: groupSessions.startsAt,
          status: academicGroups.status,
          subjectId: academicGroups.subjectId,
        })
        .from(groupSessions)
        .innerJoin(
          academicGroups,
          and(eq(groupSessions.groupId, academicGroups.id), eq(academicGroups.organizationId, context.organization.id)),
        )
        .where(
          and(
            eq(groupSessions.id, input.targetGroupSessionId),
            eq(groupSessions.organizationId, context.organization.id),
            eq(groupSessions.status, "scheduled"),
          ),
        )
        .for("update")
        .limit(1);
      if (!targetSession || targetSession.status !== "active" || targetSession.startsAt <= now) {
        throw new MakeupError("That alternative class is no longer available.");
      }
      if (
        targetSession.groupId === sourceSession.groupId
        || targetSession.subjectId !== sourceSession.subjectId
        || targetSession.gradeLevel !== sourceSession.gradeLevel
        || !isWithinMakeupWindow(sourceSession.startsAt, targetSession.startsAt)
      ) {
        throw new MakeupError("Choose a nearby class for the same subject and grade.");
      }

      const [existingRequest] = await tx
        .select({ id: makeupRequests.id })
        .from(makeupRequests)
        .where(
          and(
            eq(makeupRequests.organizationId, context.organization.id),
            eq(makeupRequests.sourceEnrollmentId, sourceEnrollment.id),
            eq(makeupRequests.sourceGroupSessionId, input.sourceGroupSessionId),
            inArray(makeupRequests.status, openMakeupStatuses),
          ),
        )
        .limit(1);
      if (existingRequest) throw new MakeupError("You already have an open request for that class.");

      const [scheduledClassConflict] = await tx
        .select({ id: groupSessions.id })
        .from(groupEnrollments)
        .innerJoin(
          groupSessions,
          and(eq(groupEnrollments.groupId, groupSessions.groupId), eq(groupSessions.organizationId, context.organization.id)),
        )
        .where(
          and(
            eq(groupEnrollments.organizationId, context.organization.id),
            eq(groupEnrollments.studentProfileId, context.student.id),
            inArray(groupEnrollments.status, liveEnrollmentStatuses),
            eq(groupSessions.status, "scheduled"),
            ne(groupSessions.id, input.sourceGroupSessionId),
            lt(groupSessions.startsAt, targetSession.endsAt),
            gt(groupSessions.endsAt, targetSession.startsAt),
          ),
        )
        .limit(1);
      if (scheduledClassConflict) throw new MakeupError("That class overlaps with another class already on your schedule.");

      const approvedTargetSession = alias(groupSessions, "student_existing_makeup_target_session");
      const [approvedMakeupConflict] = await tx
        .select({ id: makeupRequests.id })
        .from(makeupRequests)
        .innerJoin(
          groupEnrollments,
          and(eq(makeupRequests.sourceEnrollmentId, groupEnrollments.id), eq(groupEnrollments.organizationId, context.organization.id)),
        )
        .innerJoin(
          approvedTargetSession,
          and(
            eq(makeupRequests.targetGroupSessionId, approvedTargetSession.id),
            eq(approvedTargetSession.organizationId, context.organization.id),
          ),
        )
        .where(
          and(
            eq(makeupRequests.organizationId, context.organization.id),
            eq(makeupRequests.status, "approved"),
            eq(groupEnrollments.studentProfileId, context.student.id),
            lt(approvedTargetSession.startsAt, targetSession.endsAt),
            gt(approvedTargetSession.endsAt, targetSession.startsAt),
          ),
        )
        .limit(1);
      if (approvedMakeupConflict) throw new MakeupError("That class overlaps with an alternative class the center already approved.");

      const [occupancyRows, approvedRows] = await Promise.all([
        tx
          .select({ occupied: count() })
          .from(groupEnrollments)
          .where(
            and(
              eq(groupEnrollments.organizationId, context.organization.id),
              eq(groupEnrollments.groupId, targetSession.groupId),
              inArray(groupEnrollments.status, liveEnrollmentStatuses),
            ),
          ),
        tx
          .select({ approved: count() })
          .from(makeupRequests)
          .where(
            and(
              eq(makeupRequests.organizationId, context.organization.id),
              eq(makeupRequests.targetGroupSessionId, input.targetGroupSessionId),
              inArray(makeupRequests.status, approvedMakeupStatuses),
            ),
          ),
      ]);
      const occupied = Number(occupancyRows[0]?.occupied ?? 0);
      const approved = Number(approvedRows[0]?.approved ?? 0);
      if (occupied + approved >= targetSession.capacity) {
        throw new MakeupError("That alternative class no longer has capacity.");
      }

      const [request] = await tx
        .insert(makeupRequests)
        .values({
          organizationId: context.organization.id,
          reason,
          sourceEnrollmentId: sourceEnrollment.id,
          sourceGroupSessionId: input.sourceGroupSessionId,
          status: "pending",
          targetGroupSessionId: input.targetGroupSessionId,
        })
        .returning({ id: makeupRequests.id });
      if (!request) throw new MakeupError("We could not submit that request. Please try again.");

      await tx.insert(auditLogs).values({
        organizationId: context.organization.id,
        actorMembershipId: context.actorMembershipId,
        action: "makeup.requested",
        entityType: "makeup_request",
        entityId: request.id,
        metadata: {},
      });
    });
  } catch (error) {
    if ((error as { code?: string } | undefined)?.code === "23505") {
      throw new MakeupError("You already have an open request for that class.");
    }
    throw error;
  }
}

export async function getCurrentMakeupOperationsContext(): Promise<MakeupOperationsContext | null> {
  const activeOrganization = await requireActiveOrganization();
  if (!hasPermission(toPrincipal(activeOrganization), "assistant.manage_rosters")) return null;

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
  return { actorMembershipId: membership.id, organization: activeOrganization.organization };
}

export type MakeupReviewItem = {
  id: string;
  reason: string;
  sourceGroupName: string;
  sourceStartsAt: Date;
  studentName: string;
  subjectName: string;
  targetGroupName: string;
  targetStartsAt: Date;
};

export async function getMakeupReviewQueue(context: MakeupOperationsContext): Promise<MakeupReviewItem[]> {
  const sourceSessionTable = alias(groupSessions, "makeup_queue_source_sessions");
  const targetSessionTable = alias(groupSessions, "makeup_queue_target_sessions");
  const sourceGroupTable = alias(academicGroups, "makeup_queue_source_groups");
  const targetGroupTable = alias(academicGroups, "makeup_queue_target_groups");
  const db = getDatabase();

  return db
    .select({
      id: makeupRequests.id,
      reason: makeupRequests.reason,
      sourceGroupName: sourceGroupTable.name,
      sourceStartsAt: sourceSessionTable.startsAt,
      studentName: studentProfiles.fullName,
      subjectName: subjects.name,
      targetGroupName: targetGroupTable.name,
      targetStartsAt: targetSessionTable.startsAt,
    })
    .from(makeupRequests)
    .innerJoin(
      groupEnrollments,
      and(eq(makeupRequests.sourceEnrollmentId, groupEnrollments.id), eq(groupEnrollments.organizationId, context.organization.id)),
    )
    .innerJoin(
      studentProfiles,
      and(eq(groupEnrollments.studentProfileId, studentProfiles.id), eq(studentProfiles.organizationId, context.organization.id)),
    )
    .innerJoin(
      sourceSessionTable,
      and(eq(makeupRequests.sourceGroupSessionId, sourceSessionTable.id), eq(sourceSessionTable.organizationId, context.organization.id)),
    )
    .innerJoin(
      sourceGroupTable,
      and(eq(sourceSessionTable.groupId, sourceGroupTable.id), eq(sourceGroupTable.organizationId, context.organization.id)),
    )
    .innerJoin(
      subjects,
      and(eq(sourceGroupTable.subjectId, subjects.id), eq(subjects.organizationId, context.organization.id)),
    )
    .innerJoin(
      targetSessionTable,
      and(eq(makeupRequests.targetGroupSessionId, targetSessionTable.id), eq(targetSessionTable.organizationId, context.organization.id)),
    )
    .innerJoin(
      targetGroupTable,
      and(eq(targetSessionTable.groupId, targetGroupTable.id), eq(targetGroupTable.organizationId, context.organization.id)),
    )
    .where(and(eq(makeupRequests.organizationId, context.organization.id), eq(makeupRequests.status, "pending")))
    .orderBy(targetSessionTable.startsAt, studentProfiles.fullName);
}

export async function approveMakeupRequest(requestId: string): Promise<void> {
  const context = await getCurrentMakeupOperationsContext();
  if (!context) throw new MakeupError("You do not have permission to approve this request.");

  const db = getDatabase();
  const now = new Date();
  await db.transaction(async (tx) => {
    const [request] = await tx
      .select({
        sourceEnrollmentId: makeupRequests.sourceEnrollmentId,
        sourceGroupSessionId: makeupRequests.sourceGroupSessionId,
        targetGroupSessionId: makeupRequests.targetGroupSessionId,
      })
      .from(makeupRequests)
      .where(
        and(
          eq(makeupRequests.id, requestId),
          eq(makeupRequests.organizationId, context.organization.id),
          eq(makeupRequests.status, "pending"),
        ),
      )
      .for("update")
      .limit(1);
    if (!request) throw new MakeupError("This request no longer needs a decision.");

    const [sourceEnrollment] = await tx
      .select({ groupId: groupEnrollments.groupId, id: groupEnrollments.id, studentProfileId: groupEnrollments.studentProfileId })
      .from(groupEnrollments)
      .where(
        and(
          eq(groupEnrollments.id, request.sourceEnrollmentId),
          eq(groupEnrollments.organizationId, context.organization.id),
          inArray(groupEnrollments.status, liveEnrollmentStatuses),
        ),
      )
      .for("update")
      .limit(1);
    if (!sourceEnrollment) throw new MakeupError("The student no longer has the original enrollment.");

    const [student] = await tx
      .select({ id: studentProfiles.id })
      .from(studentProfiles)
      .where(
        and(
          eq(studentProfiles.id, sourceEnrollment.studentProfileId),
          eq(studentProfiles.organizationId, context.organization.id),
        ),
      )
      .for("update")
      .limit(1);
    if (!student) throw new MakeupError("The student profile is no longer active.");

    const [sourceSession] = await tx
      .select({
        gradeLevel: academicGroups.gradeLevel,
        groupId: groupSessions.groupId,
        startsAt: groupSessions.startsAt,
        status: groupSessions.status,
        subjectId: academicGroups.subjectId,
      })
      .from(groupSessions)
      .innerJoin(
        academicGroups,
        and(eq(groupSessions.groupId, academicGroups.id), eq(academicGroups.organizationId, context.organization.id)),
      )
      .where(
        and(
          eq(groupSessions.id, request.sourceGroupSessionId),
          eq(groupSessions.organizationId, context.organization.id),
        ),
      )
      .for("update")
      .limit(1);
    if (!sourceSession || sourceSession.groupId !== sourceEnrollment.groupId || sourceSession.status === "cancelled") {
      throw new MakeupError("The original class is no longer eligible for an alternative.");
    }

    const [target] = await tx
      .select({
        capacity: academicGroups.capacity,
        endsAt: groupSessions.endsAt,
        gradeLevel: academicGroups.gradeLevel,
        groupId: academicGroups.id,
        startsAt: groupSessions.startsAt,
        subjectId: academicGroups.subjectId,
      })
      .from(groupSessions)
      .innerJoin(
        academicGroups,
        and(eq(groupSessions.groupId, academicGroups.id), eq(academicGroups.organizationId, context.organization.id)),
      )
      .where(
        and(
          eq(groupSessions.id, request.targetGroupSessionId),
          eq(groupSessions.organizationId, context.organization.id),
          eq(groupSessions.status, "scheduled"),
          eq(academicGroups.status, "active"),
        ),
      )
      .for("update")
      .limit(1);
    if (!target || target.startsAt <= now) throw new MakeupError("The alternative session is no longer available.");
    if (
      target.groupId === sourceSession.groupId
      || target.subjectId !== sourceSession.subjectId
      || target.gradeLevel !== sourceSession.gradeLevel
      || !isWithinMakeupWindow(sourceSession.startsAt, target.startsAt)
    ) {
      throw new MakeupError("The alternative class no longer matches the original class.");
    }

    const [scheduledClassConflict] = await tx
      .select({ id: groupSessions.id })
      .from(groupEnrollments)
      .innerJoin(
        groupSessions,
        and(eq(groupEnrollments.groupId, groupSessions.groupId), eq(groupSessions.organizationId, context.organization.id)),
      )
      .where(
        and(
          eq(groupEnrollments.organizationId, context.organization.id),
          eq(groupEnrollments.studentProfileId, sourceEnrollment.studentProfileId),
          inArray(groupEnrollments.status, liveEnrollmentStatuses),
          eq(groupSessions.status, "scheduled"),
          ne(groupSessions.id, request.sourceGroupSessionId),
          lt(groupSessions.startsAt, target.endsAt),
          gt(groupSessions.endsAt, target.startsAt),
        ),
      )
      .limit(1);
    if (scheduledClassConflict) throw new MakeupError("The student has another class at that time.");

    const approvedTargetSession = alias(groupSessions, "approved_makeup_target_session");
    const [approvedMakeupConflict] = await tx
      .select({ id: makeupRequests.id })
      .from(makeupRequests)
      .innerJoin(
        groupEnrollments,
        and(eq(makeupRequests.sourceEnrollmentId, groupEnrollments.id), eq(groupEnrollments.organizationId, context.organization.id)),
      )
      .innerJoin(
        approvedTargetSession,
        and(
          eq(makeupRequests.targetGroupSessionId, approvedTargetSession.id),
          eq(approvedTargetSession.organizationId, context.organization.id),
        ),
      )
      .where(
        and(
          eq(makeupRequests.organizationId, context.organization.id),
          eq(makeupRequests.status, "approved"),
          eq(groupEnrollments.studentProfileId, sourceEnrollment.studentProfileId),
          lt(approvedTargetSession.startsAt, target.endsAt),
          gt(approvedTargetSession.endsAt, target.startsAt),
        ),
      )
      .limit(1);
    if (approvedMakeupConflict) throw new MakeupError("The student already has an approved alternative class at that time.");

    const [occupancyRows, approvedRows] = await Promise.all([
      tx
        .select({ occupied: count() })
        .from(groupEnrollments)
        .where(
          and(
            eq(groupEnrollments.organizationId, context.organization.id),
            eq(groupEnrollments.groupId, target.groupId),
            inArray(groupEnrollments.status, liveEnrollmentStatuses),
          ),
        ),
      tx
        .select({ approved: count() })
        .from(makeupRequests)
        .where(
          and(
            eq(makeupRequests.organizationId, context.organization.id),
            eq(makeupRequests.targetGroupSessionId, request.targetGroupSessionId),
            inArray(makeupRequests.status, approvedMakeupStatuses),
          ),
        ),
    ]);

    const occupied = Number(occupancyRows[0]?.occupied ?? 0);
    const approved = Number(approvedRows[0]?.approved ?? 0);
    if (occupied + approved >= target.capacity) {
      throw new MakeupError("That alternative class no longer has capacity.");
    }

    await tx
      .update(makeupRequests)
      .set({ reviewedAt: now, reviewedByMembershipId: context.actorMembershipId, status: "approved" })
      .where(
        and(
          eq(makeupRequests.id, requestId),
          eq(makeupRequests.organizationId, context.organization.id),
          eq(makeupRequests.status, "pending"),
        ),
      );
    await tx.insert(auditLogs).values({
      organizationId: context.organization.id,
      actorMembershipId: context.actorMembershipId,
      action: "makeup.approved",
      entityType: "makeup_request",
      entityId: requestId,
      metadata: {},
    });
  });
}

export async function rejectMakeupRequest(requestId: string, reviewNote: string): Promise<void> {
  const context = await getCurrentMakeupOperationsContext();
  if (!context) throw new MakeupError("You do not have permission to reject this request.");

  const note = reviewNote.trim();
  if (note.length < 3 || note.length > 500) throw new MakeupError("Add a short reason for the decision.");

  const db = getDatabase();
  const now = new Date();
  await db.transaction(async (tx) => {
    const [request] = await tx
      .update(makeupRequests)
      .set({ reviewNote: note, reviewedAt: now, reviewedByMembershipId: context.actorMembershipId, status: "rejected" })
      .where(
        and(
          eq(makeupRequests.id, requestId),
          eq(makeupRequests.organizationId, context.organization.id),
          eq(makeupRequests.status, "pending"),
        ),
      )
      .returning({ id: makeupRequests.id });
    if (!request) throw new MakeupError("This request no longer needs a decision.");

    await tx.insert(auditLogs).values({
      organizationId: context.organization.id,
      actorMembershipId: context.actorMembershipId,
      action: "makeup.rejected",
      entityType: "makeup_request",
      entityId: request.id,
      metadata: { reviewNote: note },
    });
  });
}
