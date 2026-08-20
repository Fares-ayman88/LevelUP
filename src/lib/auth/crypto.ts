import "server-only";

import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

import { getServerEnvironment } from "@/lib/env/server";

function hash(value: string): string {
  return createHmac("sha256", getServerEnvironment().SESSION_SECRET).update(value).digest("hex");
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return hash(`session:${token}`);
}

export function createOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashOtpCode(challengeId: string, phoneE164: string, code: string): string {
  return hash(`otp:${challengeId}:${phoneE164}:${code}`);
}

export function hashEmailSignUpOtpCode(challengeId: string, email: string, code: string): string {
  return hash(`email-sign-up-otp:${challengeId}:${email}:${code}`);
}

export function normalizeRegistrationCode(code: string): string {
  return code.trim().toUpperCase().replace(/[\s_]+/g, "-");
}

export function hashRegistrationCode(code: string): string {
  return hash(`registration-code:${normalizeRegistrationCode(code)}`);
}

export function createRegistrationCode(): string {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const segment = () => Array.from({ length: 4 }, () => alphabet[randomInt(0, alphabet.length)]).join("");
  return `LU-${segment()}-${segment()}-${segment()}`;
}

export function safelyMatchesHash(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");

  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}
