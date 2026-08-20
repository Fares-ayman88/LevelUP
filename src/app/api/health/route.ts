import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return Response.json(
    {
      status: "ok",
      service: "levelup",
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Request-Id": randomUUID(),
      },
    },
  );
}
