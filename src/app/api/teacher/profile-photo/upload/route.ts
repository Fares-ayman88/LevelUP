import { z } from "zod";

import { hasTrustedMutationOrigin } from "@/lib/security/request-origin";
import { TeacherProfileError, initiateTeacherProfilePhotoUpload } from "@/lib/workspace/teacher-profile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const uploadRequestSchema = z.object({
  byteSize: z.number().int().positive(),
  contentType: z.string().trim().toLowerCase(),
});

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

  const parsed = uploadRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid image details." }, { status: 400 });

  try {
    const upload = await initiateTeacherProfilePhotoUpload(parsed.data);
    return Response.json(upload, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof TeacherProfileError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ error: "Could not prepare the image upload." }, { status: 500 });
  }
}
