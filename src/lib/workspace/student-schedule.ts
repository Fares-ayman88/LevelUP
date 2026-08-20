import "server-only";

import { and, eq, gte, inArray } from "drizzle-orm";

import {
  academicGroups,
  groupEnrollments,
  groupSchedules,
  groupSessions,
  subjects,
  teacherProfiles,
} from "@/db/schema";
import { getDatabase } from "@/db/client";

import { liveEnrollmentStatuses, type StudentWorkspaceContext } from "./student";

export type StudentScheduleItem = {
  endsAt: Date;
  groupId: string;
  groupName: string;
  roomLabel: string | null;
  startsAt: Date;
  subjectName: string;
  teacherName: string;
};

export type StudentRecurringScheduleItem = {
  endsAt: string;
  groupId: string;
  groupName: string;
  roomLabel: string | null;
  startsAt: string;
  subjectName: string;
  teacherName: string;
  weekday: number;
};

export async function getStudentSchedule(context: StudentWorkspaceContext): Promise<{
  upcoming: StudentScheduleItem[];
  weekly: StudentRecurringScheduleItem[];
}> {
  const db = getDatabase();
  const enrollmentRows = await db
    .select({ groupId: groupEnrollments.groupId })
    .from(groupEnrollments)
    .where(
      and(
        eq(groupEnrollments.organizationId, context.organization.id),
        eq(groupEnrollments.studentProfileId, context.student.id),
        inArray(groupEnrollments.status, liveEnrollmentStatuses),
      ),
    );
  const groupIds = enrollmentRows.map((enrollment) => enrollment.groupId);
  if (!groupIds.length) return { upcoming: [], weekly: [] };

  const now = new Date();
  const [upcomingRows, recurringRows] = await Promise.all([
    db
      .select({
        endsAt: groupSessions.endsAt,
        groupId: academicGroups.id,
        groupName: academicGroups.name,
        roomLabel: groupSchedules.roomLabel,
        startsAt: groupSessions.startsAt,
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
          inArray(groupSessions.groupId, groupIds),
          eq(groupSessions.status, "scheduled"),
          gte(groupSessions.startsAt, now),
        ),
      )
      .orderBy(groupSessions.startsAt)
      .limit(12),
    db
      .select({
        endsAt: groupSchedules.endsAt,
        groupId: academicGroups.id,
        groupName: academicGroups.name,
        roomLabel: groupSchedules.roomLabel,
        startsAt: groupSchedules.startsAt,
        subjectName: subjects.name,
        teacherName: teacherProfiles.displayName,
        weekday: groupSchedules.weekday,
      })
      .from(groupSchedules)
      .innerJoin(
        academicGroups,
        and(eq(groupSchedules.groupId, academicGroups.id), eq(academicGroups.organizationId, context.organization.id)),
      )
      .innerJoin(
        subjects,
        and(eq(academicGroups.subjectId, subjects.id), eq(subjects.organizationId, context.organization.id)),
      )
      .innerJoin(
        teacherProfiles,
        and(eq(academicGroups.teacherProfileId, teacherProfiles.id), eq(teacherProfiles.organizationId, context.organization.id)),
      )
      .where(and(eq(groupSchedules.organizationId, context.organization.id), inArray(groupSchedules.groupId, groupIds)))
      .orderBy(groupSchedules.weekday, groupSchedules.startsAt),
  ]);

  return { upcoming: upcomingRows, weekly: recurringRows };
}
