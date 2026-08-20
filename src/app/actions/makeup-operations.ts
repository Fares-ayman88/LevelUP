"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { initialMakeupActionState, type MakeupActionState } from "@/lib/workspace/makeup-state";
import { approveMakeupRequest, MakeupError, rejectMakeupRequest } from "@/lib/workspace/makeup";

const reviewSchema = z.object({
  intent: z.enum(["approve", "reject"]),
  requestId: z.string().uuid(),
  reviewNote: z.string().trim().max(500),
});

export async function reviewMakeupRequestAction(
  _previousState: MakeupActionState,
  formData: FormData,
): Promise<MakeupActionState> {
  const parsed = reviewSchema.safeParse({
    intent: formData.get("intent"),
    requestId: formData.get("requestId"),
    reviewNote: formData.get("reviewNote") ?? "",
  });
  if (!parsed.success) return { ...initialMakeupActionState, status: "error", message: "That request is no longer valid." };

  try {
    if (parsed.data.intent === "approve") {
      await approveMakeupRequest(parsed.data.requestId);
    } else {
      await rejectMakeupRequest(parsed.data.requestId, parsed.data.reviewNote);
    }
  } catch (error) {
    if (error instanceof MakeupError) {
      return { ...initialMakeupActionState, status: "error", message: error.message };
    }
    throw error;
  }

  revalidatePath("/app/assistant/makeup");
  revalidatePath("/app/student/makeup");
  return {
    status: parsed.data.intent === "approve" ? "approved" : "rejected",
    message: parsed.data.intent === "approve" ? "Alternative class approved." : "Alternative class request declined.",
  };
}
