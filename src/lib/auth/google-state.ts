import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { getServerEnvironment } from "@/lib/env/server";

export const GOOGLE_OAUTH_STATE_COOKIE_NAME = "levelup_google_oauth_state";
export const GOOGLE_OAUTH_STATE_DURATION_SECONDS = 10 * 60;

export const googleOAuthStateCookieOptions = {
  httpOnly: true,
  maxAge: GOOGLE_OAUTH_STATE_DURATION_SECONDS,
  path: "/api/auth/google",
  priority: "high" as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export type GoogleOAuthState = {
  codeVerifier: string;
  intent: GoogleOAuthIntent;
  nonce: string;
  state: string;
};

export type GoogleOAuthIntent = "sign_in" | "sign_up";

type SignedGoogleOAuthState = GoogleOAuthState & {
  expiresAt: number;
};

function signPayload(payload: string): string {
  return createHmac("sha256", getServerEnvironment().SESSION_SECRET)
    .update(`google-oauth-state:${payload}`)
    .digest("base64url");
}

function signatureMatches(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function createGoogleOAuthState(intent: GoogleOAuthIntent = "sign_in"): { cookieValue: string; state: GoogleOAuthState } {
  const state = {
    codeVerifier: randomBytes(32).toString("base64url"),
    intent,
    nonce: randomBytes(32).toString("base64url"),
    state: randomBytes(32).toString("base64url"),
  };
  const payload = Buffer.from(JSON.stringify({
    ...state,
    expiresAt: Date.now() + (GOOGLE_OAUTH_STATE_DURATION_SECONDS * 1000),
  })).toString("base64url");

  return { cookieValue: `${payload}.${signPayload(payload)}`, state };
}

export function readGoogleOAuthState(cookieValue: string | undefined): GoogleOAuthState | null {
  if (!cookieValue) return null;

  const [payload, signature, ...rest] = cookieValue.split(".");
  if (!payload || !signature || rest.length || !signatureMatches(signPayload(payload), signature)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SignedGoogleOAuthState;
    if (
      !parsed.state
      || !parsed.nonce
      || !parsed.codeVerifier
      || (parsed.intent !== "sign_in" && parsed.intent !== "sign_up")
      || !Number.isFinite(parsed.expiresAt)
      || parsed.expiresAt <= Date.now()
    ) {
      return null;
    }

    return {
      codeVerifier: parsed.codeVerifier,
      intent: parsed.intent,
      nonce: parsed.nonce,
      state: parsed.state,
    };
  } catch {
    return null;
  }
}

export function matchesGoogleOAuthState(expected: string, received: string): boolean {
  return signatureMatches(expected, received);
}

export function createGoogleCodeChallenge(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}
