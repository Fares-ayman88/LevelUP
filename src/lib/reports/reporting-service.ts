import "server-only";

import { and, count, eq, inArray, sql, sum } from "drizzle-orm";

import {
  academicGroups,
  attendanceRecords,
  groupEnrollments,
  groupSessions,
  paymentObligations,
  paymentRecords,
  subjects,
} from "@/db/schema";
import { getDatabase } from "@/db/client";
import { requirePermission } from "@/lib/authorization/permissions";
import type { CenterAdminWorkspaceContext } from "@/lib/workspace/payment-channels";

export type CenterReportData = {
  attendanceStats: {
    absent: number;
    excused: number;
    late: number;
    present: number;
    total: number;
  };
  financials: {
    collectedMinor: number;
    currencyCode: string;
    overdueCount: number;
    pendingReviewCount: number;
    unpaidMinor: number;
  };
  groupPerformance: {
    capacity: number;
    enrolledCount: number;
    groupId: string;
    groupName: string;
    subjectName: string;
    utilizationPercent: number;
  }[];
};

export async function getCenterReportsData(
  context: CenterAdminWorkspaceContext,
): Promise<CenterReportData> {
  requirePermission(
    { organizationId: context.organization.id, roles: context.organization.roles, userId: context.userId },
    "organization.read_reporting",
  );

  const db = getDatabase();

  // 1. Financial stats
  const [confirmedTotal] = await db
    .select({
      total: sum(paymentRecords.amountMinor),
    })
    .from(paymentRecords)
    .where(
      and(
        eq(paymentRecords.organizationId, context.organization.id),
        eq(paymentRecords.status, "confirmed"),
      ),
    );

  const [unpaidTotal] = await db
    .select({
      overdueCount: count(sql`case when ${paymentObligations.status} = 'overdue' then 1 else null end`),
      pendingCount: count(sql`case when ${paymentObligations.status} = 'awaiting_review' then 1 else null end`),
      total: sum(paymentObligations.amountMinor),
    })
    .from(paymentObligations)
    .where(
      and(
        eq(paymentObligations.organizationId, context.organization.id),
        inArray(paymentObligations.status, ["due", "overdue", "awaiting_review"]),
      ),
    );

  // 2. Attendance stats
  const attendanceCounts = await db
    .select({
      status: attendanceRecords.status,
      totalCount: count(),
    })
    .from(attendanceRecords)
    .where(eq(attendanceRecords.organizationId, context.organization.id))
    .groupBy(attendanceRecords.status);

  const attMap = new Map(attendanceCounts.map((a) => [a.status, Number(a.totalCount)]));
  const present = attMap.get("present") ?? 0;
  const late = attMap.get("late") ?? 0;
  const absent = attMap.get("absent") ?? 0;
  const excused = attMap.get("excused") ?? 0;
  const totalAtt = present + late + absent + excused;

  // 3. Group performance
  const groupRows = await db
    .select({
      capacity: academicGroups.capacity,
      groupId: academicGroups.id,
      groupName: academicGroups.name,
      subjectName: subjects.name,
    })
    .from(academicGroups)
    .innerJoin(subjects, eq(academicGroups.subjectId, subjects.id))
    .where(eq(academicGroups.organizationId, context.organization.id));

  const groupIds = groupRows.map((g) => g.groupId);

  const enrollmentsRows = groupIds.length
    ? await db
        .select({
          enrollmentCount: count(),
          groupId: groupEnrollments.groupId,
        })
        .from(groupEnrollments)
        .where(
          and(
            eq(groupEnrollments.organizationId, context.organization.id),
            inArray(groupEnrollments.groupId, groupIds),
            inArray(groupEnrollments.status, ["active", "pending_payment", "payment_follow_up"]),
          ),
        )
        .groupBy(groupEnrollments.groupId)
    : [];

  const enrollmentsMap = new Map(enrollmentsRows.map((e) => [e.groupId, Number(e.enrollmentCount)]));

  const groupPerformance = groupRows.map((g) => {
    const enrolledCount = enrollmentsMap.get(g.groupId) ?? 0;
    const utilizationPercent = g.capacity > 0 ? Math.round((enrolledCount / g.capacity) * 100) : 0;
    return {
      capacity: g.capacity,
      enrolledCount,
      groupId: g.groupId,
      groupName: g.groupName,
      subjectName: g.subjectName,
      utilizationPercent,
    };
  });

  return {
    attendanceStats: {
      absent,
      excused,
      late,
      present,
      total: totalAtt,
    },
    financials: {
      collectedMinor: Number(confirmedTotal?.total ?? 0),
      currencyCode: "EGP",
      overdueCount: Number(unpaidTotal?.overdueCount ?? 0),
      pendingReviewCount: Number(unpaidTotal?.pendingCount ?? 0),
      unpaidMinor: Number(unpaidTotal?.total ?? 0),
    },
    groupPerformance,
  };
}
