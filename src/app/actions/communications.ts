"use server";

import { z } from "zod";

import { getCurrentCenterAdminWorkspace } from "@/lib/workspace/payment-channels";
import { dispatchViaWaha, dispatchBulkViaWaha } from "@/lib/communications/communication-service";
import { normalizeEgyptianMobile } from "@/lib/auth/phone";

export type SendMessageActionState = {
  error?: string;
  results?: Array<{ error?: string; phoneE164: string; status: "delivered" | "failed" }>;
  success: boolean;
};

const singleMessageSchema = z.object({
  message: z.string().trim().min(1, "Message text is required.").max(4096, "Message is too long."),
  phone: z.string().trim().min(1, "Phone number is required."),
});

const bulkMessageSchema = z.object({
  message: z.string().trim().min(1, "Message text is required.").max(4096, "Message is too long."),
  phones: z.array(z.string().trim().min(1)).min(1, "At least one phone number is required.").max(100, "Maximum 100 recipients per batch."),
});

/**
 * Send a single WhatsApp message via WAHA.
 */
export async function sendWahaMessageAction(
  _previousState: SendMessageActionState,
  formData: FormData,
): Promise<SendMessageActionState> {
  const workspace = await getCurrentCenterAdminWorkspace();
  if (!workspace) {
    return { error: "You must be a center admin to send messages.", success: false };
  }

  const parsed = singleMessageSchema.safeParse({
    message: formData.get("message"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };
  }

  let phoneE164: string;
  try {
    phoneE164 = normalizeEgyptianMobile(parsed.data.phone);
  } catch {
    return { error: "Invalid Egyptian mobile number.", success: false };
  }

  try {
    const result = await dispatchViaWaha(workspace, phoneE164, parsed.data.message);

    if (result.status === "failed") {
      return { error: result.error ?? "Message delivery failed.", success: false };
    }

    return { results: [result], success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to send message.",
      success: false,
    };
  }
}

/**
 * Send a WhatsApp message to multiple recipients via WAHA.
 */
export async function sendBulkWahaMessageAction(
  _previousState: SendMessageActionState,
  formData: FormData,
): Promise<SendMessageActionState> {
  const workspace = await getCurrentCenterAdminWorkspace();
  if (!workspace) {
    return { error: "You must be a center admin to send messages.", success: false };
  }

  const rawPhones = formData.get("phones");
  const phones = typeof rawPhones === "string" ? rawPhones.split(",").map((p) => p.trim()).filter(Boolean) : [];

  const parsed = bulkMessageSchema.safeParse({
    message: formData.get("message"),
    phones,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };
  }

  const recipients: Array<{ message: string; phoneE164: string }> = [];
  for (const phone of parsed.data.phones) {
    try {
      recipients.push({
        message: parsed.data.message,
        phoneE164: normalizeEgyptianMobile(phone),
      });
    } catch {
      // Skip invalid phone numbers
    }
  }

  if (recipients.length === 0) {
    return { error: "No valid phone numbers provided.", success: false };
  }

  try {
    const results = await dispatchBulkViaWaha(workspace, recipients);
    const failedCount = results.filter((r) => r.status === "failed").length;

    return {
      error: failedCount > 0 ? `${failedCount} of ${results.length} messages failed.` : undefined,
      results,
      success: failedCount === 0,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to send bulk messages.",
      success: false,
    };
  }
}
