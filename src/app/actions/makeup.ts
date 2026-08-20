"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { initialMakeupActionState, type MakeupActionState } from "@/lib/workspace/makeup-state";
import { createStudentMakeupRequest, MakeupError } from "@/lib/workspace/makeup";

const makeupRequestSchema = z.object({
  reason: z.string().trim().min(10).max(500),
  sourceEnrollmentId: z.string().uuid(),
  sourceGroupSessionId: z.string().uuid(),
  targetGroupSessionId: z.string().uuid(),
});

export async function createMakeupRequestAction(
  _previousState: MakeupActionState,
  formData: FormData,
): Promise<MakeupActionState> {
  const parsed = makeupRequestSchema.safeParse({
    reason: formData.get("reason"),
    sourceEnrollmentId: formData.get("sourceEnrollmentId"),
    sourceGroupSessionId: formData.get("sourceGroupSessionId"),
    targetGroupSessionId: formData.get("targetGroupSessionId"),
  });
  if (!parsed.success) {
    return { ...initialMakeupActionState, status: "error", message: "Choose both classes and add a short reason." };
  }

  try {
    await createStudentMakeupRequest(parsed.data);
  } catch (error) {
    if (error instanceof MakeupError) {
      return { ...initialMakeupActionState, status: "error", message: error.message };
    }
    throw error;
  }

  revalidatePath("/app/student/makeup");
  revalidatePath("/app/assistant/makeup");
  return { status: "submitted", message: "Your request is with the center for review." };
}
