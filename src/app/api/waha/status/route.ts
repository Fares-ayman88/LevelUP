import { randomUUID } from "node:crypto";

import { getWahaConnectionStatus } from "@/lib/waha/messaging-service";
import { getCurrentCenterAdminWorkspace } from "@/lib/workspace/payment-channels";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/waha/status
 *
 * Returns the current WAHA session connection status.
 * Protected: requires an authenticated center_admin.
 */
export async function GET() {
  const workspace = await getCurrentCenterAdminWorkspace();

  if (!workspace) {
    return Response.json(
      { error: "Unauthorized. Center admin access required." },
      { status: 403, headers: { "Cache-Control": "no-store", "X-Request-Id": randomUUID() } },
    );
  }

  const status = await getWahaConnectionStatus();

  return Response.json(
    {
      connected: status.connected,
      session: status.sessionName,
      status: status.status,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Request-Id": randomUUID(),
      },
    },
  );
}
