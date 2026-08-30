import type { OtpSender } from "./otp";
import { createWahaClient, phoneE164ToChatId } from "@/lib/waha/client";

export type WahaOtpSenderOptions = {
  /** API key for WAHA authentication. */
  apiKey?: string;
  /** Base URL of the WAHA instance. */
  apiUrl: string;
  /** WAHA session name. Defaults to "default". */
  sessionName?: string;
};

function otpMessage(code: string): string {
  return `LevelUp verification code: ${code}. It expires in 5 minutes. Do not share it with anyone.`;
}

/** Sends an OTP via WAHA (self-hosted WhatsApp HTTP API). */
export function createWahaOtpSender(options: WahaOtpSenderOptions): OtpSender {
  const client = createWahaClient({
    apiKey: options.apiKey,
    apiUrl: options.apiUrl,
    sessionName: options.sessionName,
  });

  return {
    async send(challenge) {
      const chatId = phoneE164ToChatId(challenge.destination);
      const result = await client.sendText(chatId, otpMessage(challenge.code));

      return {
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        providerMessageId: result.id ?? `waha:${challenge.purpose}:${challenge.destination}`,
      };
    },
  };
}
