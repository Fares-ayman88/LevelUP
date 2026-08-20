import "server-only";

import { and, count, eq, inArray } from "drizzle-orm";

import {
  academicGroups,
  groupEnrollments,
  groupSchedules,
  subjects,
  teacherProfiles,
} from "@/db/schema";
import { getDatabase } from "@/db/client";
import { requirePermission } from "@/lib/authorization/permissions";

import type { CenterAdminWorkspaceContext } from "./payment-channels";
import { liveEnrollmentStatuses } from "./student";

export type AdminGroupItem = {
  capacity: number;
  currencyCode: string;
  enrolledCount: number;
  gradeLevel: string;
  id: string;
  monthlyFeeMinor: number;
  name: string;
  schedules: {
    endsAt: string;
    id: string;
    roomLabel: string | null;
    startsAt: string;
    weekday: number;
  }[];
  seatsLeft: number;
  status: "draft" | "active" | "paused" | "archived";
  subjectName: string;
  teacherDisplayName: string;
};

export type AdminGroupsOverview = {
  activeGroupsCount: number;
  groups: AdminGroupItem[];
  totalCapacity: number;
  totalEnrolled: number;
};

export async function getCenterAdminGroupsOverview(
  context: CenterAdminWorkspaceContext,
): Promise<AdminGroupsOverview> {
  requirePermission(
    { organizationId: context.organization.id, roles: context.organization.roles, userId: context.userId },
    "organization.manage_groups",
  );

  const db = getDatabase();

  const groupRows = await db
    .select({
      capacity: academicGroups.capacity,
      currencyCode: academicGroups.currencyCode,
      gradeLevel: academicGroups.gradeLevel,
      id: academicGroups.id,
      monthlyFeeMinor: academicGroups.monthlyFeeMinor,
      name: academicGroups.name,
      status: academicGroups.status,
      subjectName: subjects.name,
      teacherDisplayName: teacherProfiles.displayName,
    })
    .from(academicGroups)
    .innerJoin(subjects, eq(academicGroups.subjectId, subjects.id))
    .innerJoin(teacherProfiles, eq(academicGroups.teacherProfileId, teacherProfiles.id))
    .where(eq(academicGroups.organizationId, context.organization.id));

  if (!groupRows.length) {
    return {
      activeGroupsCount: 0,
      groups: [],
      totalCapacity: 0,
      totalEnrolled: 0,
    };
  }

  const groupIds = groupRows.map((g) => g.id);

  const [schedulesRows, enrollmentsRows] = await Promise.all([
    db
      .select({
        endsAt: groupSchedules.endsAt,
        groupId: groupSchedules.groupId,
        id: groupSchedules.id,
        roomLabel: groupSchedules.roomLabel,
        startsAt: groupSchedules.startsAt,
        weekday: groupSchedules.weekday,
      })
      .from(groupSchedules)
      .where(
        and(
          eq(groupSchedules.organizationId, context.organization.id),
          inArray(groupSchedules.groupId, groupIds),
        ),
      ),
    db
      .select({
        enrollmentCount: count(),
        groupId: groupEnrollments.groupId,
      })
      .from(groupEnrollments)
      .where(
        and(
          eq(groupEnrollments.organizationId, context.organization.id),
          inArray(groupEnrollments.groupId, groupIds),
          inArray(groupEnrollments.status, liveEnrollmentStatuses),
        ),
      )
      .groupBy(groupEnrollments.groupId),
  ]);

  const schedulesByGroup = new Map<string, typeof schedulesRows>();
  for (const s of schedulesRows) {
    const list = schedulesByGroup.get(s.groupId) ?? [];
    list.push(s);
    schedulesByGroup.set(s.groupId, list);
  }

  const enrollmentsByGroup = new Map(enrollmentsRows.map((e) => [e.groupId, Number(e.enrollmentCount)]));

  const groups: AdminGroupItem[] = groupRows.map((g) => {
    const enrolled = enrollmentsByGroup.get(g.id) ?? 0;
    const seatsLeft = Math.max(0, g.capacity - enrolled);
    return {
      capacity: g.capacity,
      currencyCode: g.currencyCode,
      enrolledCount: enrolled,
      gradeLevel: g.gradeLevel,
      id: g.id,
      monthlyFeeMinor: g.monthlyFeeMinor,
      name: g.name,
      schedules: schedulesByGroup.get(g.id) ?? [],
      seatsLeft,
      status: g.status,
      subjectName: g.subjectName,
      teacherDisplayName: g.teacherDisplayName,
    };
  });

  const activeGroupsCount = groups.filter((g) => g.status === "active").length;
  const totalCapacity = groups.reduce((acc, g) => acc + g.capacity, 0);
  const totalEnrolled = groups.reduce((acc, g) => acc + g.enrolledCount, 0);

  return {
    activeGroupsCount,
    groups,
    totalCapacity,
    totalEnrolled,
  };
}
