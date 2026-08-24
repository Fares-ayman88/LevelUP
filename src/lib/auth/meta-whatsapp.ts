import type { OtpSender } from "./otp";

export type MetaWhatsAppOtpSenderOptions = {
  accessToken: string;
  graphApiVersion: string;
  phoneNumberId: string;
  templateLanguage: string;
  templateName: string;
};

type MetaWhatsAppResponse = {
  messages?: Array<{ id?: string }>;
};

async function readMetaWhatsAppResponse(response: Response): Promise<MetaWhatsAppResponse | null> {
  try {
    return await response.json() as MetaWhatsAppResponse;
  } catch {
    return null;
  }
}

/** Sends an OTP through an approved Meta WhatsApp authentication template. */
export function createMetaWhatsAppOtpSender(options: MetaWhatsAppOtpSenderOptions): OtpSender {
  const endpoint = `https://graph.facebook.com/${options.graphApiVersion}/${options.phoneNumberId}/messages`;

  return {
    async send(challenge) {
      const response = await fetch(endpoint, {
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: challenge.destination.replace(/^\+/, ""),
          type: "template",
          template: {
            name: options.templateName,
            language: { code: options.templateLanguage },
            components: [
              {
                type: "body",
                parameters: [{ type: "text", text: challenge.code }],
              },
              {
                type: "button",
                sub_type: "url",
                index: "0",
                parameters: [{ type: "text", text: challenge.code }],
              },
            ],
          },
        }),
        headers: {
          Authorization: `Bearer ${options.accessToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: AbortSignal.timeout(10_000),
      });
      const body = await readMetaWhatsAppResponse(response);
      const providerMessageId = body?.messages?.[0]?.id;

      if (!response.ok || !providerMessageId) {
        throw new Error("Meta WhatsApp OTP delivery failed.");
      }

      return {
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        providerMessageId,
      };
    },
  };
}
