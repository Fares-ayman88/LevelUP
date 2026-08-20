import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import {
  academicGroups,
  attendanceRecords,
  examScores,
  exams,
  groupEnrollments,
  groupSessions,
  homeworkAssignments,
  homeworkSubmissions,
  subjects,
} from "@/db/schema";
import { getDatabase } from "@/db/client";

import { calculateProgress, calculateProgressRank, type ProgressMetrics } from "./progress-rules";
import { liveEnrollmentStatuses, type StudentWorkspaceContext } from "./student";

type ComponentProgress = {
  possible: number;
  score: number | null;
  value: number;
};

export type StudentProgressGroup = {
  attendance: ComponentProgress;
  comparableStudents: number;
  exams: ComponentProgress;
  groupId: string;
  groupName: string;
  homework: ComponentProgress;
  nextFocus: string | null;
  overallScore: number | null;
  percentile: number | null;
  rank: number | null;
  subjectName: string;
};

function emptyMetrics(): ProgressMetrics {
  return {
    attendance: { attended: 0, total: 0 },
    exams: { earned: 0, possible: 0 },
    homework: { earned: 0, possible: 0 },
  };
}

function nextFocus(scores: { attendance: number | null; exams: number | null; homework: number | null }): string | null {
  const candidates = [
    { label: "attendance", score: scores.attendance },
    { label: "homework", score: scores.homework },
    { label: "exam practice", score: scores.exams },
  ].filter((candidate): candidate is { label: string; score: number } => candidate.score !== null);

  if (!candidates.length) return null;
  return candidates.sort((left, right) => left.score - right.score)[0]?.label ?? null;
}

export async function getStudentProgress(context: StudentWorkspaceContext): Promise<StudentProgressGroup[]> {
  const db = getDatabase();
  const ownEnrollments = await db
    .select({
      groupId: academicGroups.id,
      groupName: academicGroups.name,
      id: groupEnrollments.id,
      subjectName: subjects.name,
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
      subjects,
      and(eq(academicGroups.subjectId, subjects.id), eq(subjects.organizationId, context.organization.id)),
    )
    .where(
      and(
        eq(groupEnrollments.organizationId, context.organization.id),
        eq(groupEnrollments.studentProfileId, context.student.id),
        inArray(groupEnrollments.status, liveEnrollmentStatuses),
      ),
    )
    .orderBy(subjects.name, academicGroups.name);

  if (!ownEnrollments.length) return [];

  const groupIds = ownEnrollments.map((enrollment) => enrollment.groupId);
  const groupEnrollmentsForRanking = await db
    .select({ groupId: groupEnrollments.groupId, id: groupEnrollments.id })
    .from(groupEnrollments)
    .where(
      and(
        eq(groupEnrollments.organizationId, context.organization.id),
        inArray(groupEnrollments.groupId, groupIds),
        inArray(groupEnrollments.status, liveEnrollmentStatuses),
      ),
    );

  const enrollmentIds = groupEnrollmentsForRanking.map((enrollment) => enrollment.id);
  const groupIdByEnrollment = new Map(groupEnrollmentsForRanking.map((enrollment) => [enrollment.id, enrollment.groupId]));
  const metricsByEnrollment = new Map(groupEnrollmentsForRanking.map((enrollment) => [enrollment.id, emptyMetrics()]));

  const [attendanceRows, homeworkRows, examRows] = await Promise.all([
    db
      .select({
        enrollmentId: attendanceRecords.enrollmentId,
        groupId: groupSessions.groupId,
        status: attendanceRecords.status,
      })
      .from(attendanceRecords)
      .innerJoin(
        groupSessions,
        and(
          eq(attendanceRecords.groupSessionId, groupSessions.id),
          eq(groupSessions.organizationId, context.organization.id),
          eq(groupSessions.status, "completed"),
        ),
      )
      .where(
        and(
          eq(attendanceRecords.organizationId, context.organization.id),
          inArray(attendanceRecords.enrollmentId, enrollmentIds),
        ),
      ),
    db
      .select({
        enrollmentId: homeworkSubmissions.enrollmentId,
        groupId: homeworkAssignments.groupId,
        maxScore: homeworkAssignments.maxScore,
        score: homeworkSubmissions.score,
      })
      .from(homeworkSubmissions)
      .innerJoin(
        homeworkAssignments,
        and(
          eq(homeworkSubmissions.assignmentId, homeworkAssignments.id),
          eq(homeworkAssignments.organizationId, context.organization.id),
        ),
      )
      .where(
        and(
          eq(homeworkSubmissions.organizationId, context.organization.id),
          inArray(homeworkSubmissions.enrollmentId, enrollmentIds),
        ),
      ),
    db
      .select({
        enrollmentId: examScores.enrollmentId,
        groupId: exams.groupId,
        maxScore: exams.maxScore,
        score: examScores.score,
      })
      .from(examScores)
      .innerJoin(
        exams,
        and(eq(examScores.examId, exams.id), eq(exams.organizationId, context.organization.id)),
      )
      .where(
        and(
          eq(examScores.organizationId, context.organization.id),
          inArray(examScores.enrollmentId, enrollmentIds),
        ),
      ),
  ]);

  for (const row of attendanceRows) {
    const metrics = metricsByEnrollment.get(row.enrollmentId);
    if (!metrics || groupIdByEnrollment.get(row.enrollmentId) !== row.groupId || row.status === "excused") continue;

    metrics.attendance.total += 1;
    if (row.status === "present" || row.status === "late") metrics.attendance.attended += 1;
  }

  for (const row of homeworkRows) {
    const metrics = metricsByEnrollment.get(row.enrollmentId);
    if (!metrics || groupIdByEnrollment.get(row.enrollmentId) !== row.groupId || row.score === null) continue;

    metrics.homework.earned += Math.max(0, Math.min(row.score, row.maxScore));
    metrics.homework.possible += row.maxScore;
  }

  for (const row of examRows) {
    const metrics = metricsByEnrollment.get(row.enrollmentId);
    if (!metrics || groupIdByEnrollment.get(row.enrollmentId) !== row.groupId) continue;

    metrics.exams.earned += Math.max(0, Math.min(row.score, row.maxScore));
    metrics.exams.possible += row.maxScore;
  }

  const progressByEnrollment = new Map(
    groupEnrollmentsForRanking.map((enrollment) => [enrollment.id, calculateProgress(metricsByEnrollment.get(enrollment.id) ?? emptyMetrics())]),
  );

  return ownEnrollments.map((enrollment) => {
    const metrics = metricsByEnrollment.get(enrollment.id) ?? emptyMetrics();
    const progress = progressByEnrollment.get(enrollment.id) ?? calculateProgress(metrics);
    const peerScores = groupEnrollmentsForRanking
      .filter((peerEnrollment) => peerEnrollment.groupId === enrollment.groupId)
      .map((peerEnrollment) => progressByEnrollment.get(peerEnrollment.id)?.overall ?? null);
    const rank = calculateProgressRank(progress.overall, peerScores);

    return {
      attendance: {
        possible: metrics.attendance.total,
        score: progress.attendance,
        value: metrics.attendance.attended,
      },
      comparableStudents: rank.comparableStudents,
      exams: {
        possible: metrics.exams.possible,
        score: progress.exams,
        value: metrics.exams.earned,
      },
      groupId: enrollment.groupId,
      groupName: enrollment.groupName,
      homework: {
        possible: metrics.homework.possible,
        score: progress.homework,
        value: metrics.homework.earned,
      },
      nextFocus: nextFocus(progress),
      overallScore: progress.overall,
      percentile: rank.percentile,
      rank: rank.rank,
      subjectName: enrollment.subjectName,
    };
  });
}
