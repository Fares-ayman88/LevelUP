import "server-only";

import { and, desc, eq, gte, inArray, lte, ne } from "drizzle-orm";

import {
  academicGroups,
  attendanceRecords,
  auditLogs,
  examScores,
  exams,
  groupEnrollments,
  groupSessions,
  homeworkAssignments,
  homeworkSubmissions,
  organizationMemberships,
  studentProfiles,
  subjects,
  teacherProfiles,
} from "@/db/schema";
import { getDatabase } from "@/db/client";
import { requireActiveOrganization } from "@/lib/auth/dal";
import { hasPermission, type OrganizationPrincipal, type Permission } from "@/lib/authorization/permissions";

import { liveEnrollmentStatuses } from "./student";
import { hasCompleteUniqueRoster, isScoreWithinRange } from "./academic-record-rules";

const CLASSROOM_LOOKAHEAD_MS = 28 * 24 * 60 * 60 * 1000;
const CLASSROOM_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;
export const classroomAttendanceStatuses = ["present", "late", "absent", "excused"] as const;

export type ClassroomAttendanceStatus = (typeof classroomAttendanceStatuses)[number];

export class TeacherClassroomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeacherClassroomError";
  }
}

export type TeacherClassroomContext = {
  actorMembershipId: string;
  organization: {
    id: string;
    name: string;
    roles: OrganizationPrincipal["roles"];
  };
  teacher: {
    displayName: string;
    id: string;
  };
  userId: string;
};

export type TeacherClassroomGroup = {
  assignments: TeacherAssessmentListItem[];
  exams: TeacherAssessmentListItem[];
  id: string;
  name: string;
  sessions: TeacherSessionListItem[];
  subjectName: string;
};

export type TeacherAssessmentListItem = {
  id: string;
  maxScore: number;
  title: string;
  timestamp: Date | null;
};

export type TeacherSessionListItem = {
  endsAt: Date;
  id: string;
  startsAt: Date;
  status: "scheduled" | "completed";
};

export type TeacherAttendanceWorkspace = {
  roster: Array<{
    attendanceStatus: ClassroomAttendanceStatus | null;
    enrollmentId: string;
    studentName: string;
  }>;
  session: TeacherSessionListItem | null;
};

export type TeacherScorebook = {
  assessment: TeacherAssessmentListItem;
  roster: Array<{
    enrollmentId: string;
    score: number | null;
    studentName: string;
  }>;
};

function toPrincipal(context: TeacherClassroomContext): OrganizationPrincipal {
  return {
    organizationId: context.organization.id,
    roles: context.organization.roles,
    userId: context.userId,
  };
}

function requireTeacherPermission(context: TeacherClassroomContext, permission: Permission): void {
  if (!hasPermission(toPrincipal(context), permission)) {
    throw new TeacherClassroomError("You do not have permission to manage this class.");
  }
}

export async function getCurrentTeacherClassroomContext(): Promise<TeacherClassroomContext | null> {
  const activeOrganization = await requireActiveOrganization();
  const principal: OrganizationPrincipal = {
    organizationId: activeOrganization.organization.id,
    roles: activeOrganization.organization.roles,
    userId: activeOrganization.session.userId,
  };
  if (!hasPermission(principal, "teacher.read_assigned_groups")) return null;

  const db = getDatabase();
  const [teacher] = await db
    .select({
      displayName: teacherProfiles.displayName,
      id: teacherProfiles.id,
      membershipId: organizationMemberships.id,
    })
    .from(teacherProfiles)
    .innerJoin(
      organizationMemberships,
      and(
        eq(teacherProfiles.membershipId, organizationMemberships.id),
        eq(organizationMemberships.organizationId, activeOrganization.organization.id),
      ),
    )
    .where(
      and(
        eq(teacherProfiles.organizationId, activeOrganization.organization.id),
        eq(organizationMemberships.userId, activeOrganization.session.userId),
        eq(organizationMemberships.role, "teacher"),
        eq(organizationMemberships.status, "active"),
      ),
    )
    .limit(1);

  if (!teacher) return null;

  return {
    actorMembershipId: teacher.membershipId,
    organization: activeOrganization.organization,
    teacher: { displayName: teacher.displayName, id: teacher.id },
    userId: activeOrganization.session.userId,
  };
}

export async function getTeacherClassroomOverview(
  context: TeacherClassroomContext,
): Promise<TeacherClassroomGroup[]> {
  requireTeacherPermission(context, "teacher.read_assigned_groups");

  const db = getDatabase();
  const now = new Date();
  const earliestSession = new Date(now.getTime() - CLASSROOM_LOOKBACK_MS);
  const latestSession = new Date(now.getTime() + CLASSROOM_LOOKAHEAD_MS);
  const groupRows = await db
    .select({
      id: academicGroups.id,
      name: academicGroups.name,
      subjectName: subjects.name,
    })
    .from(academicGroups)
    .innerJoin(
      subjects,
      and(eq(academicGroups.subjectId, subjects.id), eq(subjects.organizationId, context.organization.id)),
    )
    .where(
      and(
        eq(academicGroups.organizationId, context.organization.id),
        eq(academicGroups.teacherProfileId, context.teacher.id),
        eq(academicGroups.status, "active"),
      ),
    )
    .orderBy(subjects.name, academicGroups.name);

  if (!groupRows.length) return [];

  const groupIds = groupRows.map((group) => group.id);
  const [sessionRows, assignmentRows, examRows] = await Promise.all([
    db
      .select({
        endsAt: groupSessions.endsAt,
        groupId: groupSessions.groupId,
        id: groupSessions.id,
        startsAt: groupSessions.startsAt,
        status: groupSessions.status,
      })
      .from(groupSessions)
      .where(
        and(
          eq(groupSessions.organizationId, context.organization.id),
          inArray(groupSessions.groupId, groupIds),
          ne(groupSessions.status, "cancelled"),
          gte(groupSessions.startsAt, earliestSession),
          lte(groupSessions.startsAt, latestSession),
        ),
      )
      .orderBy(desc(groupSessions.startsAt)),
    db
      .select({
        createdAt: homeworkAssignments.createdAt,
        groupId: homeworkAssignments.groupId,
        id: homeworkAssignments.id,
        maxScore: homeworkAssignments.maxScore,
        title: homeworkAssignments.title,
      })
      .from(homeworkAssignments)
      .where(
        and(
          eq(homeworkAssignments.organizationId, context.organization.id),
          inArray(homeworkAssignments.groupId, groupIds),
        ),
      )
      .orderBy(desc(homeworkAssignments.createdAt))
      .limit(48),
    db
      .select({
        groupId: exams.groupId,
        heldAt: exams.heldAt,
        id: exams.id,
        maxScore: exams.maxScore,
        title: exams.title,
      })
      .from(exams)
      .where(and(eq(exams.organizationId, context.organization.id), inArray(exams.groupId, groupIds)))
      .orderBy(desc(exams.heldAt), desc(exams.createdAt))
      .limit(48),
  ]);

  const groupsById = new Map<string, TeacherClassroomGroup>(
    groupRows.map((group) => [
      group.id,
      { assignments: [], exams: [], id: group.id, name: group.name, sessions: [], subjectName: group.subjectName },
    ]),
  );

  for (const session of sessionRows) {
    if (session.status === "cancelled") continue;
    groupsById.get(session.groupId)?.sessions.push({
      endsAt: session.endsAt,
      id: session.id,
      startsAt: session.startsAt,
      status: session.status,
    });
  }
  for (const assignment of assignmentRows) {
    groupsById.get(assignment.groupId)?.assignments.push({
      id: assignment.id,
      maxScore: assignment.maxScore,
      timestamp: assignment.createdAt,
      title: assignment.title,
    });
  }
  for (const exam of examRows) {
    groupsById.get(exam.groupId)?.exams.push({
      id: exam.id,
      maxScore: exam.maxScore,
      timestamp: exam.heldAt,
      title: exam.title,
    });
  }

  return groupRows.flatMap((group) => {
    const classroomGroup = groupsById.get(group.id);
    return classroomGroup ? [classroomGroup] : [];
  });
}

export async function getTeacherAttendanceWorkspace(
  context: TeacherClassroomContext,
  groupId: string,
  sessionId?: string,
): Promise<TeacherAttendanceWorkspace> {
  requireTeacherPermission(context, "teacher.manage_attendance");

  const db = getDatabase();
  const now = new Date();
  const [group] = await db
    .select({ id: academicGroups.id })
    .from(academicGroups)
    .where(
      and(
        eq(academicGroups.id, groupId),
        eq(academicGroups.organizationId, context.organization.id),
        eq(academicGroups.teacherProfileId, context.teacher.id),
        eq(academicGroups.status, "active"),
      ),
    )
    .limit(1);
  if (!group) throw new TeacherClassroomError("That class is no longer available.");

  const sessionQuery = db
    .select({
      endsAt: groupSessions.endsAt,
      id: groupSessions.id,
      startsAt: groupSessions.startsAt,
      status: groupSessions.status,
    })
    .from(groupSessions)
    .where(
      and(
        eq(groupSessions.organizationId, context.organization.id),
        eq(groupSessions.groupId, group.id),
        ne(groupSessions.status, "cancelled"),
        lte(groupSessions.endsAt, now),
        sessionId ? eq(groupSessions.id, sessionId) : undefined,
      ),
    )
    .orderBy(desc(groupSessions.startsAt))
    .limit(1);
  const [session] = await sessionQuery;
  if (!session || session.status === "cancelled") return { roster: [], session: null };

  const roster = await db
    .select({
      attendanceStatus: attendanceRecords.status,
      enrollmentId: groupEnrollments.id,
      studentName: studentProfiles.fullName,
    })
    .from(groupEnrollments)
    .innerJoin(
      studentProfiles,
      and(
        eq(groupEnrollments.studentProfileId, studentProfiles.id),
        eq(studentProfiles.organizationId, context.organization.id),
      ),
    )
    .leftJoin(
      attendanceRecords,
      and(
        eq(attendanceRecords.enrollmentId, groupEnrollments.id),
        eq(attendanceRecords.groupSessionId, session.id),
        eq(attendanceRecords.organizationId, context.organization.id),
      ),
    )
    .where(
      and(
        eq(groupEnrollments.organizationId, context.organization.id),
        eq(groupEnrollments.groupId, group.id),
        inArray(groupEnrollments.status, liveEnrollmentStatuses),
      ),
    )
    .orderBy(studentProfiles.fullName);

  return {
    roster,
    session: { endsAt: session.endsAt, id: session.id, startsAt: session.startsAt, status: session.status },
  };
}

export async function getTeacherHomeworkScorebook(
  context: TeacherClassroomContext,
  groupId: string,
  assignmentId: string,
): Promise<TeacherScorebook | null> {
  requireTeacherPermission(context, "teacher.manage_assignments");

  const db = getDatabase();
  const [assignment] = await db
    .select({
      createdAt: homeworkAssignments.createdAt,
      id: homeworkAssignments.id,
      maxScore: homeworkAssignments.maxScore,
      title: homeworkAssignments.title,
    })
    .from(homeworkAssignments)
    .innerJoin(
      academicGroups,
      and(
        eq(homeworkAssignments.groupId, academicGroups.id),
        eq(academicGroups.organizationId, context.organization.id),
      ),
    )
    .where(
      and(
        eq(homeworkAssignments.id, assignmentId),
        eq(homeworkAssignments.organizationId, context.organization.id),
        eq(homeworkAssignments.groupId, groupId),
        eq(academicGroups.teacherProfileId, context.teacher.id),
      ),
    )
    .limit(1);
  if (!assignment) return null;

  const roster = await db
    .select({
      enrollmentId: groupEnrollments.id,
      score: homeworkSubmissions.score,
      studentName: studentProfiles.fullName,
    })
    .from(groupEnrollments)
    .innerJoin(
      studentProfiles,
      and(eq(groupEnrollments.studentProfileId, studentProfiles.id), eq(studentProfiles.organizationId, context.organization.id)),
    )
    .leftJoin(
      homeworkSubmissions,
      and(
        eq(homeworkSubmissions.enrollmentId, groupEnrollments.id),
        eq(homeworkSubmissions.assignmentId, assignment.id),
        eq(homeworkSubmissions.organizationId, context.organization.id),
      ),
    )
    .where(
      and(
        eq(groupEnrollments.organizationId, context.organization.id),
        eq(groupEnrollments.groupId, groupId),
        inArray(groupEnrollments.status, liveEnrollmentStatuses),
      ),
    )
    .orderBy(studentProfiles.fullName);

  return {
    assessment: { id: assignment.id, maxScore: assignment.maxScore, timestamp: assignment.createdAt, title: assignment.title },
    roster,
  };
}

export async function getTeacherExamScorebook(
  context: TeacherClassroomContext,
  groupId: string,
  examId: string,
): Promise<TeacherScorebook | null> {
  requireTeacherPermission(context, "teacher.manage_exams");

  const db = getDatabase();
  const [exam] = await db
    .select({
      heldAt: exams.heldAt,
      id: exams.id,
      maxScore: exams.maxScore,
      title: exams.title,
    })
    .from(exams)
    .innerJoin(
      academicGroups,
      and(eq(exams.groupId, academicGroups.id), eq(academicGroups.organizationId, context.organization.id)),
    )
    .where(
      and(
        eq(exams.id, examId),
        eq(exams.organizationId, context.organization.id),
        eq(exams.groupId, groupId),
        eq(academicGroups.teacherProfileId, context.teacher.id),
      ),
    )
    .limit(1);
  if (!exam) return null;

  const roster = await db
    .select({
      enrollmentId: groupEnrollments.id,
      score: examScores.score,
      studentName: studentProfiles.fullName,
    })
    .from(groupEnrollments)
    .innerJoin(
      studentProfiles,
      and(eq(groupEnrollments.studentProfileId, studentProfiles.id), eq(studentProfiles.organizationId, context.organization.id)),
    )
    .leftJoin(
      examScores,
      and(
        eq(examScores.enrollmentId, groupEnrollments.id),
        eq(examScores.examId, exam.id),
        eq(examScores.organizationId, context.organization.id),
      ),
    )
    .where(
      and(
        eq(groupEnrollments.organizationId, context.organization.id),
        eq(groupEnrollments.groupId, groupId),
        inArray(groupEnrollments.status, liveEnrollmentStatuses),
      ),
    )
    .orderBy(studentProfiles.fullName);

  return {
    assessment: { id: exam.id, maxScore: exam.maxScore, timestamp: exam.heldAt, title: exam.title },
    roster,
  };
}

async function getTeacherContextForMutation(permission: Permission): Promise<TeacherClassroomContext> {
  const context = await getCurrentTeacherClassroomContext();
  if (!context) throw new TeacherClassroomError("You do not have a teacher workspace in this center.");
  requireTeacherPermission(context, permission);
  return context;
}

function ensureCompleteRoster<T extends { enrollmentId: string }>(
  provided: T[],
  rosterEnrollmentIds: string[],
): void {
  if (!hasCompleteUniqueRoster(provided.map((record) => record.enrollmentId), rosterEnrollmentIds)) {
    throw new TeacherClassroomError("The class list changed. Refresh the page before saving.");
  }
}

export async function saveTeacherAttendance(input: {
  records: Array<{ enrollmentId: string; status: ClassroomAttendanceStatus }>;
  sessionId: string;
}): Promise<void> {
  const context = await getTeacherContextForMutation("teacher.manage_attendance");
  const db = getDatabase();
  const now = new Date();

  await db.transaction(async (tx) => {
    const [session] = await tx
      .select({
        attendanceLocked: groupSessions.attendanceLocked,
        endsAt: groupSessions.endsAt,
        groupId: groupSessions.groupId,
        id: groupSessions.id,
        status: groupSessions.status,
      })
      .from(groupSessions)
      .innerJoin(
        academicGroups,
        and(
          eq(groupSessions.groupId, academicGroups.id),
          eq(academicGroups.organizationId, context.organization.id),
          eq(academicGroups.teacherProfileId, context.teacher.id),
        ),
      )
      .where(
        and(eq(groupSessions.id, input.sessionId), eq(groupSessions.organizationId, context.organization.id)),
      )
      .for("update")
      .limit(1);
    if (!session || session.status === "cancelled" || session.endsAt > now) {
      throw new TeacherClassroomError("Attendance can only be recorded after a class has ended.");
    }
    if (session.attendanceLocked) throw new TeacherClassroomError("Attendance for this class is locked.");

    const roster = await tx
      .select({ id: groupEnrollments.id })
      .from(groupEnrollments)
      .where(
        and(
          eq(groupEnrollments.organizationId, context.organization.id),
          eq(groupEnrollments.groupId, session.groupId),
          inArray(groupEnrollments.status, liveEnrollmentStatuses),
        ),
      )
      .for("update");
    const rosterIds = roster.map((enrollment) => enrollment.id);
    if (!rosterIds.length) throw new TeacherClassroomError("This class does not have an active roster.");
    ensureCompleteRoster(input.records, rosterIds);

    const existingRows = await tx
      .select({ enrollmentId: attendanceRecords.enrollmentId, status: attendanceRecords.status })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.organizationId, context.organization.id),
          eq(attendanceRecords.groupSessionId, session.id),
          inArray(attendanceRecords.enrollmentId, rosterIds),
        ),
      );
    const existingByEnrollment = new Map(existingRows.map((record) => [record.enrollmentId, record.status]));
    const changes = input.records.filter((record) => existingByEnrollment.get(record.enrollmentId) !== record.status);

    for (const record of changes) {
      await tx
        .insert(attendanceRecords)
        .values({
          enrollmentId: record.enrollmentId,
          groupSessionId: session.id,
          organizationId: context.organization.id,
          recordedByMembershipId: context.actorMembershipId,
          status: record.status,
        })
        .onConflictDoUpdate({
          target: [attendanceRecords.groupSessionId, attendanceRecords.enrollmentId],
          set: {
            recordedByMembershipId: context.actorMembershipId,
            status: record.status,
            updatedAt: now,
          },
        });
    }

    if (session.status === "scheduled") {
      await tx
        .update(groupSessions)
        .set({ status: "completed", updatedAt: now })
        .where(eq(groupSessions.id, session.id));
    }

    if (changes.length || session.status === "scheduled") {
      await tx.insert(auditLogs).values({
        organizationId: context.organization.id,
        actorMembershipId: context.actorMembershipId,
        action: "attendance.recorded",
        entityType: "group_session",
        entityId: session.id,
        metadata: {
          changes: changes.map((record) => ({
            enrollmentId: record.enrollmentId,
            from: existingByEnrollment.get(record.enrollmentId) ?? null,
            to: record.status,
          })),
        },
      });
    }
  });
}

export async function createTeacherHomeworkAssignment(input: {
  groupId: string;
  instructions: string | null;
  maxScore: number;
  title: string;
}): Promise<void> {
  const context = await getTeacherContextForMutation("teacher.manage_assignments");
  const db = getDatabase();

  await db.transaction(async (tx) => {
    const [group] = await tx
      .select({ id: academicGroups.id })
      .from(academicGroups)
      .where(
        and(
          eq(academicGroups.id, input.groupId),
          eq(academicGroups.organizationId, context.organization.id),
          eq(academicGroups.teacherProfileId, context.teacher.id),
          eq(academicGroups.status, "active"),
        ),
      )
      .for("update")
      .limit(1);
    if (!group) throw new TeacherClassroomError("Choose one of your active classes.");

    const [assignment] = await tx
      .insert(homeworkAssignments)
      .values({
        createdByMembershipId: context.actorMembershipId,
        groupId: group.id,
        instructions: input.instructions,
        maxScore: input.maxScore,
        organizationId: context.organization.id,
        title: input.title,
      })
      .returning({ id: homeworkAssignments.id });
    if (!assignment) throw new TeacherClassroomError("The homework could not be created.");

    await tx.insert(auditLogs).values({
      organizationId: context.organization.id,
      actorMembershipId: context.actorMembershipId,
      action: "homework.created",
      entityType: "homework_assignment",
      entityId: assignment.id,
      metadata: { groupId: group.id, maxScore: input.maxScore },
    });
  });
}

export async function createTeacherExam(input: {
  groupId: string;
  maxScore: number;
  title: string;
}): Promise<void> {
  const context = await getTeacherContextForMutation("teacher.manage_exams");
  const db = getDatabase();
  const now = new Date();

  await db.transaction(async (tx) => {
    const [group] = await tx
      .select({ id: academicGroups.id })
      .from(academicGroups)
      .where(
        and(
          eq(academicGroups.id, input.groupId),
          eq(academicGroups.organizationId, context.organization.id),
          eq(academicGroups.teacherProfileId, context.teacher.id),
          eq(academicGroups.status, "active"),
        ),
      )
      .for("update")
      .limit(1);
    if (!group) throw new TeacherClassroomError("Choose one of your active classes.");

    const [exam] = await tx
      .insert(exams)
      .values({
        createdByMembershipId: context.actorMembershipId,
        groupId: group.id,
        heldAt: now,
        maxScore: input.maxScore,
        organizationId: context.organization.id,
        title: input.title,
      })
      .returning({ id: exams.id });
    if (!exam) throw new TeacherClassroomError("The exam could not be created.");

    await tx.insert(auditLogs).values({
      organizationId: context.organization.id,
      actorMembershipId: context.actorMembershipId,
      action: "exam.created",
      entityType: "exam",
      entityId: exam.id,
      metadata: { groupId: group.id, maxScore: input.maxScore },
    });
  });
}

export async function saveTeacherHomeworkScores(input: {
  assignmentId: string;
  scores: Array<{ enrollmentId: string; score: number | null }>;
}): Promise<void> {
  const context = await getTeacherContextForMutation("teacher.manage_assignments");
  const db = getDatabase();
  const now = new Date();

  await db.transaction(async (tx) => {
    const [assignment] = await tx
      .select({ groupId: homeworkAssignments.groupId, id: homeworkAssignments.id, maxScore: homeworkAssignments.maxScore })
      .from(homeworkAssignments)
      .innerJoin(
        academicGroups,
        and(
          eq(homeworkAssignments.groupId, academicGroups.id),
          eq(academicGroups.organizationId, context.organization.id),
          eq(academicGroups.teacherProfileId, context.teacher.id),
        ),
      )
      .where(
        and(eq(homeworkAssignments.id, input.assignmentId), eq(homeworkAssignments.organizationId, context.organization.id)),
      )
      .for("update")
      .limit(1);
    if (!assignment) throw new TeacherClassroomError("That homework is no longer available.");

    const roster = await tx
      .select({ id: groupEnrollments.id })
      .from(groupEnrollments)
      .where(
        and(
          eq(groupEnrollments.organizationId, context.organization.id),
          eq(groupEnrollments.groupId, assignment.groupId),
          inArray(groupEnrollments.status, liveEnrollmentStatuses),
        ),
      )
      .for("update");
    const rosterIds = roster.map((enrollment) => enrollment.id);
    if (!rosterIds.length) throw new TeacherClassroomError("This class does not have an active roster.");
    ensureCompleteRoster(input.scores, rosterIds);
    if (input.scores.some((entry) => !isScoreWithinRange(entry.score, assignment.maxScore))) {
      throw new TeacherClassroomError(`Scores must be between 0 and ${assignment.maxScore}.`);
    }

    const existingRows = await tx
      .select({ enrollmentId: homeworkSubmissions.enrollmentId, id: homeworkSubmissions.id, score: homeworkSubmissions.score, status: homeworkSubmissions.status })
      .from(homeworkSubmissions)
      .where(
        and(
          eq(homeworkSubmissions.organizationId, context.organization.id),
          eq(homeworkSubmissions.assignmentId, assignment.id),
          inArray(homeworkSubmissions.enrollmentId, rosterIds),
        ),
      );
    const existingByEnrollment = new Map(existingRows.map((row) => [row.enrollmentId, row]));
    const changes = input.scores.filter((entry) => {
      const previous = existingByEnrollment.get(entry.enrollmentId);
      if (entry.score === null) return Boolean(previous && (previous.score !== null || previous.status !== "pending"));
      return !previous || previous.score !== entry.score || previous.status !== "graded";
    });

    for (const entry of changes) {
      const previous = existingByEnrollment.get(entry.enrollmentId);
      if (entry.score === null) {
        if (previous) {
          await tx
            .update(homeworkSubmissions)
            .set({ gradedAt: null, gradedByMembershipId: null, score: null, status: "pending", updatedAt: now })
            .where(eq(homeworkSubmissions.id, previous.id));
        }
        continue;
      }

      await tx
        .insert(homeworkSubmissions)
        .values({
          assignmentId: assignment.id,
          enrollmentId: entry.enrollmentId,
          gradedAt: now,
          gradedByMembershipId: context.actorMembershipId,
          organizationId: context.organization.id,
          score: entry.score,
          status: "graded",
        })
        .onConflictDoUpdate({
          target: [homeworkSubmissions.assignmentId, homeworkSubmissions.enrollmentId],
          set: {
            gradedAt: now,
            gradedByMembershipId: context.actorMembershipId,
            score: entry.score,
            status: "graded",
            updatedAt: now,
          },
        });
    }

    if (changes.length) {
      await tx.insert(auditLogs).values({
        organizationId: context.organization.id,
        actorMembershipId: context.actorMembershipId,
        action: "homework.scores_updated",
        entityType: "homework_assignment",
        entityId: assignment.id,
        metadata: {
          changes: changes.map((entry) => ({
            enrollmentId: entry.enrollmentId,
            from: existingByEnrollment.get(entry.enrollmentId)?.score ?? null,
            to: entry.score,
          })),
        },
      });
    }
  });
}

export async function saveTeacherExamScores(input: {
  examId: string;
  scores: Array<{ enrollmentId: string; score: number | null }>;
}): Promise<void> {
  const context = await getTeacherContextForMutation("teacher.manage_exams");
  const db = getDatabase();
  const now = new Date();

  await db.transaction(async (tx) => {
    const [exam] = await tx
      .select({ groupId: exams.groupId, id: exams.id, maxScore: exams.maxScore })
      .from(exams)
      .innerJoin(
        academicGroups,
        and(
          eq(exams.groupId, academicGroups.id),
          eq(academicGroups.organizationId, context.organization.id),
          eq(academicGroups.teacherProfileId, context.teacher.id),
        ),
      )
      .where(and(eq(exams.id, input.examId), eq(exams.organizationId, context.organization.id)))
      .for("update")
      .limit(1);
    if (!exam) throw new TeacherClassroomError("That exam is no longer available.");

    const roster = await tx
      .select({ id: groupEnrollments.id })
      .from(groupEnrollments)
      .where(
        and(
          eq(groupEnrollments.organizationId, context.organization.id),
          eq(groupEnrollments.groupId, exam.groupId),
          inArray(groupEnrollments.status, liveEnrollmentStatuses),
        ),
      )
      .for("update");
    const rosterIds = roster.map((enrollment) => enrollment.id);
    if (!rosterIds.length) throw new TeacherClassroomError("This class does not have an active roster.");
    ensureCompleteRoster(input.scores, rosterIds);
    if (input.scores.some((entry) => !isScoreWithinRange(entry.score, exam.maxScore))) {
      throw new TeacherClassroomError(`Scores must be between 0 and ${exam.maxScore}.`);
    }

    const existingRows = await tx
      .select({ enrollmentId: examScores.enrollmentId, id: examScores.id, score: examScores.score })
      .from(examScores)
      .where(
        and(
          eq(examScores.organizationId, context.organization.id),
          eq(examScores.examId, exam.id),
          inArray(examScores.enrollmentId, rosterIds),
        ),
      );
    const existingByEnrollment = new Map(existingRows.map((row) => [row.enrollmentId, row]));
    const changes = input.scores.filter((entry) => existingByEnrollment.get(entry.enrollmentId)?.score !== entry.score);

    for (const entry of changes) {
      const previous = existingByEnrollment.get(entry.enrollmentId);
      if (entry.score === null) {
        if (previous) await tx.delete(examScores).where(eq(examScores.id, previous.id));
        continue;
      }

      await tx
        .insert(examScores)
        .values({
          enrollmentId: entry.enrollmentId,
          examId: exam.id,
          gradedByMembershipId: context.actorMembershipId,
          organizationId: context.organization.id,
          score: entry.score,
        })
        .onConflictDoUpdate({
          target: [examScores.examId, examScores.enrollmentId],
          set: { gradedByMembershipId: context.actorMembershipId, score: entry.score, updatedAt: now },
        });
    }

    if (changes.length) {
      await tx.insert(auditLogs).values({
        organizationId: context.organization.id,
        actorMembershipId: context.actorMembershipId,
        action: "exam.scores_updated",
        entityType: "exam",
        entityId: exam.id,
        metadata: {
          changes: changes.map((entry) => ({
            enrollmentId: entry.enrollmentId,
            from: existingByEnrollment.get(entry.enrollmentId)?.score ?? null,
            to: entry.score,
          })),
        },
      });
    }
  });
}
