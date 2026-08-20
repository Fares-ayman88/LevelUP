export type EmailOtpPurpose = "sign_up";

export type EmailOtpChallenge = {
  code: string;
  destination: string;
  idempotencyKey: string;
  purpose: EmailOtpPurpose;
};

export type EmailOtpDelivery = {
  providerMessageId: string;
};

export interface EmailOtpSender {
  send(challenge: EmailOtpChallenge): Promise<EmailOtpDelivery>;
}

export type ResendEmailOtpSenderOptions = {
  apiKey: string;
  from: string;
};

/**
 * Development only. It deliberately does not print OTP codes so logs cannot
 * become an accidental authentication channel.
 */
export const developmentEmailOtpSender: EmailOtpSender = {
  async send(challenge) {
    return {
      providerMessageId: "development:" + challenge.purpose + ":" + challenge.destination,
    };
  },
};

type ResendResponse = {
  id?: string;
};

function emailText(code: string): string {
  return "Your LevelUp verification code is " + code + ". It expires in 5 minutes. Do not share it with anyone.";
}

function emailHtml(code: string): string {
  return [
    "<!doctype html>",
    '<html lang="en">',
    '<body style="margin:0;background:#0a0c12;color:#ffffff;font-family:Arial,sans-serif;">',
    '<main style="max-width:520px;margin:0 auto;padding:40px 24px;">',
    '<p style="margin:0 0 12px;color:#9db2ff;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">LevelUp</p>',
    '<h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;">Verify your email</h1>',
    '<p style="margin:0 0 24px;color:#cbd5e1;font-size:16px;line-height:1.6;">Use this code to finish creating your LevelUp account.</p>',
    '<p style="margin:0 0 24px;padding:18px 20px;background:#171b27;border:1px solid #34415f;color:#ffffff;font-family:monospace;font-size:30px;font-weight:700;letter-spacing:8px;text-align:center;">' + code + "</p>",
    '<p style="margin:0;color:#94a3b8;font-size:14px;line-height:1.6;">This code expires in 5 minutes. Never share it with anyone.</p>',
    "</main>",
    "</body>",
    "</html>",
  ].join("");
}

async function readResendResponse(response: Response): Promise<ResendResponse | null> {
  try {
    return await response.json() as ResendResponse;
  } catch {
    return null;
  }
}

/** Sends one sign-up OTP through Resend without logging the code. */
export function createResendEmailOtpSender(options: ResendEmailOtpSenderOptions): EmailOtpSender {
  return {
    async send(challenge) {
      const response = await fetch("https://api.resend.com/emails", {
        body: JSON.stringify({
          from: options.from,
          html: emailHtml(challenge.code),
          subject: "Your LevelUp verification code",
          text: emailText(challenge.code),
          to: [challenge.destination],
        }),
        headers: {
          Authorization: "Bearer " + options.apiKey,
          "Content-Type": "application/json",
          "Idempotency-Key": "levelup-email-otp:" + challenge.idempotencyKey,
        },
        method: "POST",
        signal: AbortSignal.timeout(10_000),
      });
      const body = await readResendResponse(response);

      if (!response.ok || !body?.id) {
        throw new Error("Resend email OTP delivery failed.");
      }

      return { providerMessageId: body.id };
    },
  };
}
