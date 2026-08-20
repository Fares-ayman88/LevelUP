import { randomUUID } from "node:crypto";

import { hasValidCronAuthorization } from "@/lib/security/cron-auth";
import { runScheduledMaintenance } from "@/lib/workspace/maintenance";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function runMaintenance(request: Request) {
  const requestId = randomUUID();
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return Response.json(
      { error: "Maintenance is not configured.", requestId },
      { status: 503, headers: { "Cache-Control": "no-store", "X-Request-Id": requestId } },
    );
  }

  if (!hasValidCronAuthorization(request.headers.get("authorization"), cronSecret)) {
    return Response.json(
      { error: "Unauthorized", requestId },
      { status: 401, headers: { "Cache-Control": "no-store", "X-Request-Id": requestId } },
    );
  }

  try {
    const result = await runScheduledMaintenance();
    return Response.json(
      { requestId, result, status: "ok" },
      { headers: { "Cache-Control": "no-store", "X-Request-Id": requestId } },
    );
  } catch {
    return Response.json(
      { error: "Maintenance failed.", requestId },
      { status: 500, headers: { "Cache-Control": "no-store", "X-Request-Id": requestId } },
    );
  }
}

export async function GET(request: Request) {
  return runMaintenance(request);
}

export async function POST(request: Request) {
  return runMaintenance(request);
}
