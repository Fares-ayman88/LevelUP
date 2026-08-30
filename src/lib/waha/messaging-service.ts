import "server-only";

import { createWahaClient, phoneE164ToChatId, type WahaClient } from "./client";
import { WahaApiError } from "./types";
import { getServerEnvironment } from "@/lib/env/server";

/** Delay between messages in a bulk send (milliseconds). */
const BULK_SEND_DELAY_MS = 2_000;

export type MessageRecipient = {
  /** Message text to send. */
  message: string;
  /** Phone number in E.164 format (e.g. "+201234567890"). */
  phoneE164: string;
};

export type MessageDeliveryResult = {
  error?: string;
  phoneE164: string;
  status: "delivered" | "failed";
};

function getWahaClient(): WahaClient {
  const environment = getServerEnvironment();

  if (!environment.WAHA_API_URL) {
    throw new Error("WAHA_API_URL is not configured. Cannot send WhatsApp messages.");
  }

  return createWahaClient({
    apiKey: environment.WAHA_API_KEY,
    apiUrl: environment.WAHA_API_URL,
    sessionName: environment.WAHA_SESSION_NAME,
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send a single WhatsApp message via WAHA.
 *
 * Returns a delivery result with status and optional error detail.
 */
export async function sendWhatsAppMessage(
  phoneE164: string,
  message: string,
): Promise<MessageDeliveryResult> {
  const client = getWahaClient();
  const chatId = phoneE164ToChatId(phoneE164);

  try {
    await client.sendText(chatId, message);
    return { phoneE164, status: "delivered" };
  } catch (error) {
    const errorMessage = error instanceof WahaApiError
      ? error.message
      : "Unknown delivery failure.";
    return { error: errorMessage, phoneE164, status: "failed" };
  }
}

/**
 * Send WhatsApp messages to multiple recipients with rate limiting.
 *
 * Messages are sent sequentially with a configurable delay between each
 * to respect WhatsApp's anti-spam policies.
 */
export async function sendBulkWhatsAppMessages(
  recipients: MessageRecipient[],
): Promise<MessageDeliveryResult[]> {
  const results: MessageDeliveryResult[] = [];

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    const result = await sendWhatsAppMessage(recipient.phoneE164, recipient.message);
    results.push(result);

    // Rate limiting: pause between messages (skip delay after the last one)
    if (i < recipients.length - 1) {
      await delay(BULK_SEND_DELAY_MS);
    }
  }

  return results;
}

/**
 * Check whether the WAHA instance is connected and ready to send messages.
 */
export async function getWahaConnectionStatus(): Promise<{
  connected: boolean;
  sessionName: string;
  status: string;
}> {
  try {
    const client = getWahaClient();
    const session = await client.getSessionStatus();
    return {
      connected: session.status === "WORKING",
      sessionName: session.name,
      status: session.status,
    };
  } catch (error) {
    return {
      connected: false,
      sessionName: getServerEnvironment().WAHA_SESSION_NAME,
      status: error instanceof WahaApiError ? `ERROR (${error.statusCode})` : "UNREACHABLE",
    };
  }
}
