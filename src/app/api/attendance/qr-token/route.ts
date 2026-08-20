import { NextResponse } from "next/server";

import { generateSessionQrToken } from "@/lib/attendance/qr-service";
import { getCurrentSession } from "@/lib/auth/service";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
  }

  const token = generateSessionQrToken(sessionId, session.organizationId);
  return NextResponse.json({ token });
}
