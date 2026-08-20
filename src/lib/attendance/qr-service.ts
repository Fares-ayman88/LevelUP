import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { attendanceRecords, groupEnrollments, groupSessions, studentProfiles } from "@/db/schema";
import { getDatabase } from "@/db/client";
import { getServerEnvironment } from "@/lib/env/server";

const QR_VALIDITY_SECONDS = 30;

type QrPayload = {
  expiresAt: number;
  nonce: string;
  organizationId: string;
  sessionId: string;
  signature: string;
};

function getQrSecret(): string {
  try {
    const env = getServerEnvironment();
    return env.SESSION_SECRET;
  } catch {
    return "levelup-qr-secret-fallback-key-2026";
  }
}

export function generateSessionQrToken(sessionId: string, organizationId: string): QrPayload {
  const secret = getQrSecret();
  const expiresAt = Math.floor(Date.now() / 1000) + QR_VALIDITY_SECONDS;
  const nonce = randomBytes(6).toString("hex");

  const raw = `${sessionId}:${organizationId}:${expiresAt}:${nonce}`;
  const signature = createHmac("sha256", secret).update(raw).digest("hex");

  return {
    expiresAt,
    nonce,
    organizationId,
    sessionId,
    signature,
  };
}

export function verifySessionQrToken(payload: QrPayload): boolean {
  const secret = getQrSecret();
  const now = Math.floor(Date.now() / 1000);

  if (payload.expiresAt < now) {
    return false;
  }

  const raw = `${payload.sessionId}:${payload.organizationId}:${payload.expiresAt}:${payload.nonce}`;
  const expectedSignature = createHmac("sha256", secret).update(raw).digest("hex");

  return payload.signature === expectedSignature;
}

export async function recordQrScanAttendance(
  sessionId: string,
  organizationId: string,
  studentProfileId: string,
  recordedByMembershipId?: string,
): Promise<{ success: boolean; message: string; studentName?: string }> {
  const db = getDatabase();

  // 1. Verify session exists & belongs to org
  const [session] = await db
    .select()
    .from(groupSessions)
    .where(and(eq(groupSessions.id, sessionId), eq(groupSessions.organizationId, organizationId)))
    .limit(1);

  if (!session) {
    return { message: "Invalid or expired session.", success: false };
  }

  if (session.attendanceLocked) {
    return { message: "Attendance for this session has been locked.", success: false };
  }

  // 2. Verify student exists and is enrolled in the group
  const [enrollment] = await db
    .select({
      enrollmentId: groupEnrollments.id,
      fullName: studentProfiles.fullName,
    })
    .from(groupEnrollments)
    .innerJoin(studentProfiles, eq(groupEnrollments.studentProfileId, studentProfiles.id))
    .where(
      and(
        eq(groupEnrollments.groupId, session.groupId),
        eq(groupEnrollments.studentProfileId, studentProfileId),
        eq(groupEnrollments.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (!enrollment) {
    return { message: "Student is not enrolled in this group.", success: false };
  }

  // 3. Upsert attendance record as 'present'
  await db
    .insert(attendanceRecords)
    .values({
      enrollmentId: enrollment.enrollmentId,
      groupSessionId: session.id,
      note: "Recorded via QR scan",
      organizationId,
      recordedByMembershipId: recordedByMembershipId ?? null,
      status: "present",
    })
    .onConflictDoUpdate({
      set: {
        note: "Updated via QR scan",
        recordedByMembershipId: recordedByMembershipId ?? null,
        status: "present",
        updatedAt: new Date(),
      },
      target: [attendanceRecords.groupSessionId, attendanceRecords.enrollmentId],
    });

  return {
    message: `Attendance marked present for ${enrollment.fullName}.`,
    studentName: enrollment.fullName,
    success: true,
  };
}
