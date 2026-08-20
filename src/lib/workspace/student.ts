import "server-only";

import { and, count, eq, gt, ilike, inArray, or } from "drizzle-orm";

import {
  academicGroups,
  groupEnrollments,
  groupSchedules,
  organizationMemberships,
  studentProfiles,
  subjects,
  teacherProfiles,
  waitlistEntries,
} from "@/db/schema";
import { getDatabase } from "@/db/client";
import { requireActiveOrganization } from "@/lib/auth/dal";
import { hasPermission, type OrganizationPrincipal } from "@/lib/authorization/permissions";

import { availableGroupSeats } from "./waitlist-rules";

export const liveEnrollmentStatuses = ["pending_payment", "active", "payment_follow_up"] as const;

export type StudentWorkspaceContext = {
  actorMembershipId: string;
  organization: {
    id: string;
    name: string;
    roles: OrganizationPrincipal["roles"];
  };
  student: {
    fullName: string;
    gradeLevel: string;
    id: string;
  };
  userId: string;
};

export type StudentDiscoveryFilters = {
  availability: "all" | "open";
  query: string;
  subject: string;
};

export type DiscoverySchedule = {
  endsAt: string;
  roomLabel: string | null;
  startsAt: string;
  weekday: number;
};

export type DiscoveryGroup = {
  capacity: number;
  currencyCode: string;
  id: string;
  isEnrolled: boolean;
  monthlyFeeMinor: number;
  name: string;
  schedules: DiscoverySchedule[];
  seatsLeft: number;
  subjectName: string;
  teacher: {
    displayName: string;
    id: string;
    profilePhotoKey: string | null;
  };
};

export type StudentWaitlistOffer = {
  expiresAt: Date;
  groupId: string;
  groupName: string;
  id: string;
  subjectName: string;
  teacherName: string;
};

function toPrincipal(context: Awaited<ReturnType<typeof requireActiveOrganization>>): OrganizationPrincipal {
  return {
    organizationId: context.organization.id,
    roles: context.organization.roles,
    userId: context.session.userId,
  };
}

export async function getCurrentStudentWorkspace(): Promise<StudentWorkspaceContext | null> {
  const activeOrganization = await requireActiveOrganization();
  const principal = toPrincipal(activeOrganization);

  if (!hasPermission(principal, "student.read_available_groups")) return null;

  const db = getDatabase();
  const [[student], [membership]] = await Promise.all([
    db
      .select({
        fullName: studentProfiles.fullName,
        gradeLevel: studentProfiles.gradeLevel,
        id: studentProfiles.id,
      })
      .from(studentProfiles)
      .where(
        and(
          eq(studentProfiles.organizationId, activeOrganization.organization.id),
          eq(studentProfiles.userId, activeOrganization.session.userId),
          eq(studentProfiles.status, "active"),
        ),
      )
      .limit(1),
    db
      .select({ id: organizationMemberships.id })
      .from(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.organizationId, activeOrganization.organization.id),
          eq(organizationMemberships.userId, activeOrganization.session.userId),
          eq(organizationMemberships.role, "student"),
          eq(organizationMemberships.status, "active"),
        ),
      )
      .limit(1),
  ]);

  if (!student || !membership) return null;

  return {
    actorMembershipId: membership.id,
    organization: activeOrganization.organization,
    student,
    userId: activeOrganization.session.userId,
  };
}

export async function getStudentDiscovery(
  context: StudentWorkspaceContext,
  filters: StudentDiscoveryFilters,
): Promise<{ groups: DiscoveryGroup[]; subjects: string[] }> {
  const db = getDatabase();
  const now = new Date();
  const query = filters.query.trim().slice(0, 80);
  const conditions = [
    eq(academicGroups.organizationId, context.organization.id),
    eq(academicGroups.gradeLevel, context.student.gradeLevel),
    eq(academicGroups.status, "active"),
    eq(teacherProfiles.isPublished, true),
  ];

  if (filters.subject) conditions.push(eq(subjects.name, filters.subject));
  if (query) {
    const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
    const searchCondition = or(
      ilike(academicGroups.name, pattern),
      ilike(subjects.name, pattern),
      ilike(teacherProfiles.displayName, pattern),
    );

    if (searchCondition) conditions.push(searchCondition);
  }

  const [rows, subjectRows] = await Promise.all([
    db
      .select({
        capacity: academicGroups.capacity,
        currencyCode: academicGroups.currencyCode,
        groupId: academicGroups.id,
        monthlyFeeMinor: academicGroups.monthlyFeeMinor,
        name: academicGroups.name,
        subjectName: subjects.name,
        teacherDisplayName: teacherProfiles.displayName,
        teacherId: teacherProfiles.id,
        teacherProfilePhotoKey: teacherProfiles.profilePhotoKey,
      })
      .from(academicGroups)
      .innerJoin(teacherProfiles, eq(academicGroups.teacherProfileId, teacherProfiles.id))
      .innerJoin(subjects, eq(academicGroups.subjectId, subjects.id))
      .where(and(...conditions))
      .orderBy(teacherProfiles.displayName, academicGroups.name),
    db
      .select({ name: subjects.name })
      .from(subjects)
      .where(eq(subjects.organizationId, context.organization.id))
      .orderBy(subjects.name),
  ]);

  if (!rows.length) {
    return { groups: [], subjects: subjectRows.map((subject) => subject.name) };
  }

  const groupIds = rows.map((row) => row.groupId);
  const [scheduleRows, occupancyRows, enrollmentRows, offerRows] = await Promise.all([
    db
      .select({
        endsAt: groupSchedules.endsAt,
        groupId: groupSchedules.groupId,
        roomLabel: groupSchedules.roomLabel,
        startsAt: groupSchedules.startsAt,
        weekday: groupSchedules.weekday,
      })
      .from(groupSchedules)
      .where(and(eq(groupSchedules.organizationId, context.organization.id), inArray(groupSchedules.groupId, groupIds)))
      .orderBy(groupSchedules.weekday, groupSchedules.startsAt),
    db
      .select({ groupId: groupEnrollments.groupId, occupied: count() })
      .from(groupEnrollments)
      .where(
        and(
          eq(groupEnrollments.organizationId, context.organization.id),
          inArray(groupEnrollments.groupId, groupIds),
          inArray(groupEnrollments.status, liveEnrollmentStatuses),
        ),
      )
      .groupBy(groupEnrollments.groupId),
    db
      .select({ groupId: groupEnrollments.groupId })
      .from(groupEnrollments)
      .where(
        and(
          eq(groupEnrollments.organizationId, context.organization.id),
          eq(groupEnrollments.studentProfileId, context.student.id),
          inArray(groupEnrollments.groupId, groupIds),
          inArray(groupEnrollments.status, liveEnrollmentStatuses),
        ),
      ),
    db
      .select({ groupId: waitlistEntries.groupId, offered: count() })
      .from(waitlistEntries)
      .where(
        and(
          eq(waitlistEntries.organizationId, context.organization.id),
          inArray(waitlistEntries.groupId, groupIds),
          eq(waitlistEntries.status, "offered"),
          gt(waitlistEntries.offeredUntil, now),
        ),
      )
      .groupBy(waitlistEntries.groupId),
  ]);

  const schedulesByGroup = new Map<string, DiscoverySchedule[]>();
  for (const schedule of scheduleRows) {
    const schedules = schedulesByGroup.get(schedule.groupId) ?? [];
    schedules.push(schedule);
    schedulesByGroup.set(schedule.groupId, schedules);
  }

  const occupiedByGroup = new Map(occupancyRows.map((row) => [row.groupId, Number(row.occupied)]));
  const offeredByGroup = new Map(offerRows.map((row) => [row.groupId, Number(row.offered)]));
  const enrolledGroupIds = new Set(enrollmentRows.map((row) => row.groupId));
  const groups = rows.map((row) => ({
    capacity: row.capacity,
    currencyCode: row.currencyCode,
    id: row.groupId,
    isEnrolled: enrolledGroupIds.has(row.groupId),
    monthlyFeeMinor: row.monthlyFeeMinor,
    name: row.name,
    schedules: schedulesByGroup.get(row.groupId) ?? [],
    seatsLeft: availableGroupSeats(
      row.capacity,
      occupiedByGroup.get(row.groupId) ?? 0,
      offeredByGroup.get(row.groupId) ?? 0,
    ),
    subjectName: row.subjectName,
    teacher: {
      displayName: row.teacherDisplayName,
      id: row.teacherId,
      profilePhotoKey: row.teacherProfilePhotoKey,
    },
  }));

  return {
    groups: filters.availability === "open" ? groups.filter((group) => group.seatsLeft > 0 || group.isEnrolled) : groups,
    subjects: subjectRows.map((subject) => subject.name),
  };
}

export async function getStudentWaitlistOffers(context: StudentWorkspaceContext): Promise<StudentWaitlistOffer[]> {
  const db = getDatabase();
  const now = new Date();
  const rows = await db
    .select({
      expiresAt: waitlistEntries.offeredUntil,
      groupId: academicGroups.id,
      groupName: academicGroups.name,
      id: waitlistEntries.id,
      subjectName: subjects.name,
      teacherName: teacherProfiles.displayName,
    })
    .from(waitlistEntries)
    .innerJoin(
      academicGroups,
      and(eq(waitlistEntries.groupId, academicGroups.id), eq(academicGroups.organizationId, context.organization.id)),
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
        eq(waitlistEntries.organizationId, context.organization.id),
        eq(waitlistEntries.studentProfileId, context.student.id),
        eq(waitlistEntries.status, "offered"),
        gt(waitlistEntries.offeredUntil, now),
      ),
    )
    .orderBy(waitlistEntries.offeredUntil);

  return rows.flatMap((row) => (
    row.expiresAt
      ? [{ ...row, expiresAt: row.expiresAt }]
      : []
  ));
}
