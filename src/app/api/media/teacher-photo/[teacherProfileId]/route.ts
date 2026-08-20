import { z } from "zod";

import { ObjectStorageError } from "@/lib/storage/object-storage";
import { getTeacherProfilePhotoDownloadUrl } from "@/lib/workspace/teacher-profile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const teacherProfileIdSchema = z.string().uuid();

export async function GET(
  _request: Request,
  context: { params: Promise<{ teacherProfileId: string }> },
) {
  const { teacherProfileId } = await context.params;
  if (!teacherProfileIdSchema.safeParse(teacherProfileId).success) return new Response(null, { status: 404 });

  try {
    const url = await getTeacherProfilePhotoDownloadUrl(teacherProfileId);
    if (!url) return new Response(null, { status: 404 });
    return Response.redirect(url, 307);
  } catch (error) {
    if (error instanceof ObjectStorageError) return new Response(null, { status: 503 });
    return new Response(null, { status: 500 });
  }
}
