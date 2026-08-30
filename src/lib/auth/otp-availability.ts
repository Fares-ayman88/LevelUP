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
    const provider = getServerEnvironment().OTP_PROVIDER;
    return provider === "meta_whatsapp" || provider === "waha";
  } catch {
    return false;
  }
}
