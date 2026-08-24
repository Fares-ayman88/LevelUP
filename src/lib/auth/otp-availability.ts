import "server-only";

import { getServerEnvironment } from "@/lib/env/server";

export function isEmailOtpConfigured(): boolean {
  try {
    const environment = getServerEnvironment();
    return environment.EMAIL_OTP_PROVIDER === "resend" || environment.NODE_ENV !== "production";
  } catch {
    return false;
  }
}

export function isWhatsAppOtpConfigured(): boolean {
  try {
    return getServerEnvironment().OTP_PROVIDER === "meta_whatsapp";
  } catch {
    return false;
  }
}
