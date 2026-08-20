import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import {
  academicGroups,
  groupEnrollments,
  groupSchedules,
  guardianStudentLinks,
  organizationMemberships,
  paymentObligations,
  studentProfiles,
  subjects,
  teacherProfiles,
} from "@/db/schema";
import { getDatabase } from "@/db/client";
import { requireActiveOrganization } from "@/lib/auth/dal";
import { hasPermission, type OrganizationPrincipal } from "@/lib/authorization/permissions";

import { liveEnrollmentStatuses, type DiscoverySchedule } from "./student";

export type GuardianWorkspaceContext = {
  guardianMembershipId: string;
  organization: {
    id: string;
    name: string;
    roles: OrganizationPrincipal["roles"];
  };
  userId: string;
  userName: string;
};

export type GuardianPaymentSummary = {
  amountMinor: number;
  currencyCode: string;
  dueAt: Date;
  id: string;
  status: "awaiting_review" | "due" | "overdue" | "paid" | "void" | "waived";
};

export type GuardianGroupSummary = {
  id: string;
  name: string;
  payment: GuardianPaymentSummary | null;
  schedules: DiscoverySchedule[];
  subjectName: string;
  teacherName: string;
};

export type GuardianStudentSummary = {
  fullName: string;
  gradeLevel: string;
  groups: GuardianGroupSummary[];
  id: string;
};

function toPrincipal(context: Awaited<ReturnType<typeof requireActiveOrganization>>): OrganizationPrincipal {
  return {
    organizationId: context.organization.id,
    roles: context.organization.roles,
    userId: context.session.userId,
  };
}

export async function getCurrentGuardianWorkspace(): Promise<GuardianWorkspaceContext | null> {
  const activeOrganization = await requireActiveOrganization();
  const principal = toPrincipal(activeOrganization);

  if (!hasPermission(principal, "guardian.read_linked_students")) return null;

  const db = getDatabase();
  const [membership] = await db
    .select({ id: organizationMemberships.id })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.organizationId, activeOrganization.organization.id),
        eq(organizationMemberships.userId, activeOrganization.session.userId),
        eq(organizationMemberships.role, "guardian"),
        eq(organizationMemberships.status, "active"),
      ),
    )
    .limit(1);

  if (!membership) return null;

  return {
    guardianMembershipId: membership.id,
    organization: activeOrganization.organization,
    userId: activeOrganization.session.userId,
    userName: activeOrganization.session.userName,
  };
}

function paymentPriority(status: GuardianPaymentSummary["status"]): number {
  if (status === "overdue") return 0;
  if (status === "due") return 1;
  if (status === "awaiting_review") return 2;
  if (status === "paid") return 3;
  if (status === "waived") return 4;
  return 5;
}

export async function getGuardianStudentSummaries(
  context: GuardianWorkspaceContext,
): Promise<GuardianStudentSummary[]> {
  const db = getDatabase();
  const linkedStudents = await db
    .select({
      fullName: studentProfiles.fullName,
      gradeLevel: studentProfiles.gradeLevel,
      id: studentProfiles.id,
    })
    .from(guardianStudentLinks)
    .innerJoin(
      studentProfiles,
      and(
        eq(guardianStudentLinks.studentProfileId, studentProfiles.id),
        eq(studentProfiles.organizationId, context.organization.id),
      ),
    )
    .where(
      and(
        eq(guardianStudentLinks.organizationId, context.organization.id),
        eq(guardianStudentLinks.guardianMembershipId, context.guardianMembershipId),
        eq(studentProfiles.status, "active"),
      ),
    )
    .orderBy(studentProfiles.fullName);

  if (!linkedStudents.length) return [];

  const studentIds = linkedStudents.map((student) => student.id);
  const enrollmentRows = await db
    .select({
      enrollmentId: groupEnrollments.id,
      groupId: academicGroups.id,
      groupName: academicGroups.name,
      studentProfileId: groupEnrollments.studentProfileId,
      subjectName: subjects.name,
      teacherName: teacherProfiles.displayName,
    })
    .from(groupEnrollments)
    .innerJoin(
      academicGroups,
      and(
        eq(groupEnrollments.groupId, academicGroups.id),
        eq(academicGroups.organizationId, context.organization.id),
      ),
    )
    .innerJoin(
      teacherProfiles,
      and(
        eq(academicGroups.teacherProfileId, teacherProfiles.id),
        eq(teacherProfiles.organizationId, context.organization.id),
      ),
    )
    .innerJoin(
      subjects,
      and(eq(academicGroups.subjectId, subjects.id), eq(subjects.organizationId, context.organization.id)),
    )
    .where(
      and(
        eq(groupEnrollments.organizationId, context.organization.id),
        inArray(groupEnrollments.studentProfileId, studentIds),
        inArray(groupEnrollments.status, liveEnrollmentStatuses),
      ),
    )
    .orderBy(subjects.name, academicGroups.name);

  if (!enrollmentRows.length) {
    return linkedStudents.map((student) => ({ ...student, groups: [] }));
  }

  const groupIds = [...new Set(enrollmentRows.map((enrollment) => enrollment.groupId))];
  const enrollmentIds = enrollmentRows.map((enrollment) => enrollment.enrollmentId);
  const [scheduleRows, paymentRows] = await Promise.all([
    db
      .select({
        endsAt: groupSchedules.endsAt,
        groupId: groupSchedules.groupId,
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
      )
      .orderBy(groupSchedules.weekday, groupSchedules.startsAt),
    db
      .select({
        amountMinor: paymentObligations.amountMinor,
        currencyCode: paymentObligations.currencyCode,
        dueAt: paymentObligations.dueAt,
        id: paymentObligations.id,
        enrollmentId: paymentObligations.enrollmentId,
        status: paymentObligations.status,
      })
      .from(paymentObligations)
      .where(
        and(
          eq(paymentObligations.organizationId, context.organization.id),
          inArray(paymentObligations.enrollmentId, enrollmentIds),
        ),
      )
      .orderBy(paymentObligations.dueAt),
  ]);

  const schedulesByGroup = new Map<string, DiscoverySchedule[]>();
  for (const schedule of scheduleRows) {
    const schedules = schedulesByGroup.get(schedule.groupId) ?? [];
    schedules.push(schedule);
    schedulesByGroup.set(schedule.groupId, schedules);
  }

  const paymentByEnrollment = new Map<string, GuardianPaymentSummary>();
  for (const payment of paymentRows) {
    const currentPayment = paymentByEnrollment.get(payment.enrollmentId);
    const nextPayment: GuardianPaymentSummary = {
      amountMinor: payment.amountMinor,
      currencyCode: payment.currencyCode,
      dueAt: payment.dueAt,
      id: payment.id,
      status: payment.status,
    };

    if (
      !currentPayment ||
      paymentPriority(nextPayment.status) < paymentPriority(currentPayment.status) ||
      (paymentPriority(nextPayment.status) === paymentPriority(currentPayment.status) && nextPayment.dueAt < currentPayment.dueAt)
    ) {
      paymentByEnrollment.set(payment.enrollmentId, nextPayment);
    }
  }

  const groupsByStudent = new Map<string, GuardianGroupSummary[]>();
  for (const enrollment of enrollmentRows) {
    const groups = groupsByStudent.get(enrollment.studentProfileId) ?? [];
    groups.push({
      id: enrollment.groupId,
      name: enrollment.groupName,
      payment: paymentByEnrollment.get(enrollment.enrollmentId) ?? null,
      schedules: schedulesByGroup.get(enrollment.groupId) ?? [],
      subjectName: enrollment.subjectName,
      teacherName: enrollment.teacherName,
    });
    groupsByStudent.set(enrollment.studentProfileId, groups);
  }

  return linkedStudents.map((student) => ({
    ...student,
    groups: groupsByStudent.get(student.id) ?? [],
  }));
}
