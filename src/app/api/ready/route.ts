import { randomUUID } from "node:crypto";

import { isDatabaseReady } from "@/db/readiness";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const ready = await isDatabaseReady();

  return Response.json(
    {
      status: ready ? "ready" : "not_ready",
      service: "levelup",
    },
    {
      status: ready ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
        "X-Request-Id": randomUUID(),
      },
    },
  );
}
