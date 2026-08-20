import { NextResponse } from "next/server";

import { recordQrScanAttendance, verifySessionQrToken } from "@/lib/attendance/qr-service";
import { getCurrentSession } from "@/lib/auth/service";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { token, studentProfileId } = body;

    if (!token || !token.sessionId || !token.organizationId) {
      return NextResponse.json({ error: "Invalid QR code payload" }, { status: 400 });
    }

    if (token.organizationId !== session.organizationId) {
      return NextResponse.json({ error: "QR code belongs to a different center" }, { status: 403 });
    }

    const isValid = verifySessionQrToken(token);
    if (!isValid) {
      return NextResponse.json({ error: "QR code expired or invalid. Scan the new QR code on screen." }, { status: 400 });
    }

    const targetStudentId = studentProfileId || session.userId; // fallback if student is scanning themselves

    const result = await recordQrScanAttendance(
      token.sessionId,
      session.organizationId,
      targetStudentId,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      message: result.message,
      studentName: result.studentName,
      success: true,
    });
  } catch {
    return NextResponse.json({ error: "Failed to process QR scan" }, { status: 500 });
  }
}
