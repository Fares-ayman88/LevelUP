"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { initialPaymentActionState, type PaymentActionState } from "@/lib/workspace/payment-action-state";
import {
  confirmManualTransfer,
  extendPaymentSeatHold,
  PaymentOperationError,
  recordCashPayment,
  rejectManualTransfer,
  releaseUnpaidSeat,
} from "@/lib/workspace/payment-operations";

const obligationIdSchema = z.object({ obligationId: z.string().uuid() });
const holdSchema = obligationIdSchema.extend({
  expiresAt: z.coerce.date(),
  reason: z.string().trim().min(3, "Add a short reason.").max(240, "Keep the reason under 240 characters."),
});
const releaseSchema = obligationIdSchema.extend({
  reason: z.string().trim().min(3, "Add a short reason.").max(240, "Keep the reason under 240 characters."),
});

function invalidState(message: string): PaymentActionState {
  return { ...initialPaymentActionState, message, status: "error" };
}

function paymentErrorState(error: unknown): PaymentActionState {
  if (error instanceof PaymentOperationError) return invalidState(error.message);
  throw error;
}

export async function recordCashPaymentAction(
  _previousState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const parsed = obligationIdSchema.safeParse({ obligationId: formData.get("obligationId") });
  if (!parsed.success) return invalidState("That payment is no longer available.");

  try {
    await recordCashPayment(parsed.data.obligationId);
  } catch (error) {
    return paymentErrorState(error);
  }

  revalidatePath("/app/assistant/payments");
  return { message: "Cash payment confirmed.", status: "success" };
}

export async function confirmManualTransferAction(
  _previousState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const parsed = obligationIdSchema.safeParse({ obligationId: formData.get("obligationId") });
  if (!parsed.success) return invalidState("That transfer is no longer available.");

  try {
    await confirmManualTransfer(parsed.data.obligationId);
  } catch (error) {
    return paymentErrorState(error);
  }

  revalidatePath("/app/assistant/payments");
  return { message: "Transfer confirmed.", status: "success" };
}

export async function rejectManualTransferAction(
  _previousState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const parsed = releaseSchema.safeParse({
    obligationId: formData.get("obligationId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return invalidState(parsed.error.issues[0]?.message ?? "Add a rejection reason.");

  try {
    await rejectManualTransfer(parsed.data.obligationId, parsed.data.reason);
  } catch (error) {
    return paymentErrorState(error);
  }

  revalidatePath("/app/assistant/payments");
  return { message: "Transfer rejected. The payment is overdue again.", status: "success" };
}

export async function extendPaymentSeatHoldAction(
  _previousState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const parsed = holdSchema.safeParse({
    expiresAt: formData.get("expiresAt"),
    obligationId: formData.get("obligationId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return invalidState(parsed.error.issues[0]?.message ?? "Check the hold details.");

  if (parsed.data.expiresAt > new Date(Date.now() + 31 * 24 * 60 * 60 * 1000)) {
    return invalidState("A seat hold can be extended by up to 31 days.");
  }

  try {
    await extendPaymentSeatHold(parsed.data.obligationId, parsed.data.expiresAt, parsed.data.reason);
  } catch (error) {
    return paymentErrorState(error);
  }

  revalidatePath("/app/assistant/payments");
  return { message: "Seat hold extended.", status: "success" };
}

export async function releaseUnpaidSeatAction(
  _previousState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const parsed = releaseSchema.safeParse({
    obligationId: formData.get("obligationId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return invalidState(parsed.error.issues[0]?.message ?? "Add a release reason.");

  try {
    await releaseUnpaidSeat(parsed.data.obligationId, parsed.data.reason);
  } catch (error) {
    return paymentErrorState(error);
  }

  revalidatePath("/app/assistant/payments");
  return { message: "Seat released and payment voided.", status: "success" };
}
