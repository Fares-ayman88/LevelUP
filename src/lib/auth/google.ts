import "server-only";

import { createRemoteJWKSet, jwtVerify } from "jose";

import { getServerEnvironment } from "@/lib/env/server";

import { createGoogleCodeChallenge, type GoogleOAuthState } from "./google-state";

const GOOGLE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const googleJwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export class GoogleOAuthError extends Error {
  constructor(message = "Google sign-in could not be completed. Please try again.") {
    super(message);
    this.name = "GoogleOAuthError";
  }
}

export type GoogleIdentity = {
  email: string;
  name: string;
  subject: string;
};

type GoogleOAuthConfiguration = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

function configuration(): GoogleOAuthConfiguration | null {
  try {
    const environment = getServerEnvironment();
    if (!environment.GOOGLE_CLIENT_ID || !environment.GOOGLE_CLIENT_SECRET) return null;

    const baseAppUrl = environment.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    return {
      clientId: environment.GOOGLE_CLIENT_ID,
      clientSecret: environment.GOOGLE_CLIENT_SECRET,
      redirectUri: new URL("/api/auth/google/callback", baseAppUrl).toString(),
    };
  } catch {
    return null;
  }
}

export function isGoogleSignInConfigured(): boolean {
  try {
    return Boolean(configuration());
  } catch {
    return false;
  }
}

export function createGoogleAuthorizationUrl(state: GoogleOAuthState): string {
  const config = configuration();
  if (!config) throw new GoogleOAuthError("Google sign-in has not been configured yet.");

  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("code_challenge", createGoogleCodeChallenge(state.codeVerifier));
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("nonce", state.nonce);
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state.state);
  return url.toString();
}

export async function exchangeGoogleAuthorizationCode(input: {
  code: string;
  codeVerifier: string;
  nonce: string;
}): Promise<GoogleIdentity> {
  const config = configuration();
  if (!config) throw new GoogleOAuthError("Google sign-in has not been configured yet.");

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: input.code,
      code_verifier: input.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
    cache: "no-store",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
  const payload = await response.json().catch(() => null) as { id_token?: unknown } | null;

  if (!response.ok || !payload || typeof payload.id_token !== "string") {
    throw new GoogleOAuthError();
  }

  let verified;
  try {
    verified = await jwtVerify(payload.id_token, googleJwks, {
      audience: config.clientId,
      issuer: ["https://accounts.google.com", "accounts.google.com"],
    });
  } catch {
    throw new GoogleOAuthError();
  }

  const { email, email_verified: emailVerified, name, nonce, sub } = verified.payload;
  if (
    typeof email !== "string"
    || emailVerified !== true
    || typeof nonce !== "string"
    || nonce !== input.nonce
    || typeof sub !== "string"
    || !sub
  ) {
    throw new GoogleOAuthError();
  }

  return { email, name: typeof name === "string" && name.trim() ? name.trim() : email, subject: sub };
}
