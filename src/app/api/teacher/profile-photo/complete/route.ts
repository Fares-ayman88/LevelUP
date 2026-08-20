import { z } from "zod";

import { hasTrustedMutationOrigin } from "@/lib/security/request-origin";
import { completeTeacherProfilePhotoUpload, TeacherProfileError } from "@/lib/workspace/teacher-profile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const completeRequestSchema = z.object({ assetId: z.string().uuid() });

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = completeRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid upload reference." }, { status: 400 });

  try {
    await completeTeacherProfilePhotoUpload(parsed.data.assetId);
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof TeacherProfileError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ error: "Could not finalize the image upload." }, { status: 500 });
  }
}
