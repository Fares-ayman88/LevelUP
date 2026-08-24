export type OtpPurpose = "sign_in" | "sign_up" | "verify_phone";

export type OtpChallenge = {
  destination: string;
  code: string;
  purpose: OtpPurpose;
};

export type OtpDelivery = {
  providerMessageId: string;
  expiresAt: Date;
};

export interface OtpSender {
  send(challenge: OtpChallenge): Promise<OtpDelivery>;
}

export type InfobipOtpSenderOptions = {
  apiKey: string;
  baseUrl: string;
  senderId: string;
};

/**
 * Development only. It deliberately does not print OTP codes so logs cannot
 * become an accidental authentication channel.
 */
export const developmentOtpSender: OtpSender = {
  async send(challenge) {
    return {
      providerMessageId: `development:${challenge.purpose}:${challenge.destination}`,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    };
  },
};

type InfobipMessageResponse = {
  messages?: Array<{ messageId?: string }>;
};

function otpMessage(code: string): string {
  return `LevelUp verification code: ${code}. It expires in 5 minutes. Do not share it with anyone.`;
}

async function readInfobipResponse(response: Response): Promise<InfobipMessageResponse | null> {
  try {
    return await response.json() as InfobipMessageResponse;
  } catch {
    return null;
  }
}

/** Sends one OTP through Infobip's SMS v3 endpoint without logging the code. */
export function createInfobipOtpSender(options: InfobipOtpSenderOptions): OtpSender {
  const endpoint = `${options.baseUrl.replace(/\/$/, "")}/sms/3/messages`;

  return {
    async send(challenge) {
      const response = await fetch(endpoint, {
        body: JSON.stringify({
          messages: [
            {
              content: { text: otpMessage(challenge.code) },
              destinations: [{ to: challenge.destination.replace(/^\+/, "") }],
              sender: options.senderId,
            },
          ],
        }),
        headers: {
          Authorization: `App ${options.apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: AbortSignal.timeout(10_000),
      });
      const body = await readInfobipResponse(response);
      const providerMessageId = body?.messages?.[0]?.messageId;

      if (!response.ok || !providerMessageId) {
        throw new Error("Infobip OTP delivery failed.");
      }

      return {
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        providerMessageId,
      };
    },
  };
}
