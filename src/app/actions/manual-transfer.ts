"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ManualTransferError, submitManualTransfer } from "@/lib/workspace/payer-payments";
import { initialManualTransferActionState, type ManualTransferActionState } from "@/lib/workspace/manual-transfer-state";

const manualTransferSchema = z.object({
  obligationId: z.string().uuid(),
  paymentChannelId: z.string().uuid(),
  transferReference: z.string().trim().min(3, "Enter the transfer reference.").max(160, "Keep the reference under 160 characters."),
});

export async function submitManualTransferAction(
  _previousState: ManualTransferActionState,
  formData: FormData,
): Promise<ManualTransferActionState> {
  const parsed = manualTransferSchema.safeParse({
    obligationId: formData.get("obligationId"),
    paymentChannelId: formData.get("paymentChannelId"),
    transferReference: formData.get("transferReference"),
  });
  if (!parsed.success) {
    return {
      ...initialManualTransferActionState,
      message: parsed.error.issues[0]?.message ?? "Check the transfer details.",
      status: "error",
    };
  }

  try {
    await submitManualTransfer(parsed.data.obligationId, parsed.data.paymentChannelId, parsed.data.transferReference);
  } catch (error) {
    if (error instanceof ManualTransferError) {
      return { ...initialManualTransferActionState, message: error.message, status: "error" };
    }

    throw error;
  }

  revalidatePath("/app/assistant/payments");
  revalidatePath("/app/admin");
  revalidatePath("/app/guardian");
  revalidatePath("/app/student/payments");
  return { message: "Transfer submitted for staff review.", status: "submitted" };
}
