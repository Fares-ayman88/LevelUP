"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { paymentChannelKinds } from "@/lib/payments/payment-channel-rules";
import {
  PaymentChannelError,
  savePaymentChannel,
} from "@/lib/workspace/payment-channels";
import {
  initialPaymentChannelActionState,
  type PaymentChannelActionState,
} from "@/lib/workspace/payment-channel-state";

const paymentChannelSchema = z.object({
  accountHolder: z.string().trim().max(160, "Keep the account holder under 160 characters."),
  accountIdentifier: z.string().trim().max(160, "Keep the payment detail under 160 characters."),
  instructions: z.string().trim().max(400, "Keep the instructions under 400 characters."),
  isActive: z.boolean(),
  kind: z.enum(paymentChannelKinds),
  label: z.string().trim().min(2, "Add a clear payment method name.").max(100, "Keep the label under 100 characters."),
});

function emptyToNull(value: string): string | null {
  return value || null;
}

export async function savePaymentChannelAction(
  _previousState: PaymentChannelActionState,
  formData: FormData,
): Promise<PaymentChannelActionState> {
  const parsed = paymentChannelSchema.safeParse({
    accountHolder: formData.get("accountHolder"),
    accountIdentifier: formData.get("accountIdentifier"),
    instructions: formData.get("instructions"),
    isActive: formData.get("isActive") === "on",
    kind: formData.get("kind"),
    label: formData.get("label"),
  });

  if (!parsed.success) {
    return {
      ...initialPaymentChannelActionState,
      message: parsed.error.issues[0]?.message ?? "Check the payment channel details.",
      status: "error",
    };
  }

  if (parsed.data.isActive && !parsed.data.accountIdentifier) {
    return {
      ...initialPaymentChannelActionState,
      message: parsed.data.kind === "cash" ? "Add the cash desk location." : "Add the wallet, account, or bank detail.",
      status: "error",
    };
  }

  try {
    await savePaymentChannel({
      accountHolder: emptyToNull(parsed.data.accountHolder),
      accountIdentifier: emptyToNull(parsed.data.accountIdentifier),
      instructions: emptyToNull(parsed.data.instructions),
      isActive: parsed.data.isActive,
      kind: parsed.data.kind,
      label: parsed.data.label,
    });
  } catch (error) {
    if (error instanceof PaymentChannelError) {
      return { ...initialPaymentChannelActionState, message: error.message, status: "error" };
    }

    throw error;
  }

  revalidatePath("/app/admin");
  revalidatePath("/app/assistant/payments");
  revalidatePath("/app/guardian");
  revalidatePath("/app/student/payments");
  return { message: "Payment instructions saved.", status: "success" };
}
