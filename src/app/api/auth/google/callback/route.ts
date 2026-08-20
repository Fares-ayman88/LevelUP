import { NextResponse, type NextRequest } from "next/server";

import { GoogleOAuthError, exchangeGoogleAuthorizationCode } from "@/lib/auth/google";
import {
  GOOGLE_OAUTH_STATE_COOKIE_NAME,
  googleOAuthStateCookieOptions,
  matchesGoogleOAuthState,
  readGoogleOAuthState,
  type GoogleOAuthIntent,
} from "@/lib/auth/google-state";
import { AccountUnavailableError } from "@/lib/auth/errors";
import { signInWithGoogleIdentity, signUpWithGoogleIdentity } from "@/lib/auth/service";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth/session";

export const runtime = "nodejs";

function clearGoogleState(response: NextResponse): NextResponse {
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE_NAME, "", { ...googleOAuthStateCookieOptions, maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function redirectToAuthentication(request: NextRequest, error: string, intent: GoogleOAuthIntent): NextResponse {
  const url = new URL(intent === "sign_up" ? "/sign-up" : "/sign-in", request.url);
  url.searchParams.set("error", error);
  return clearGoogleState(NextResponse.redirect(url));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const providerError = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const receivedState = request.nextUrl.searchParams.get("state");
  const savedState = readGoogleOAuthState(request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE_NAME)?.value);
  const intent = savedState?.intent ?? "sign_in";

  if (providerError) return redirectToAuthentication(request, "google_access_denied", intent);
  if (!code || !receivedState || !savedState || !matchesGoogleOAuthState(savedState.state, receivedState)) {
    return redirectToAuthentication(request, "google_failed", intent);
  }

  try {
    const identity = await exchangeGoogleAuthorizationCode({
      code,
      codeVerifier: savedState.codeVerifier,
      nonce: savedState.nonce,
    });
    const result = savedState.intent === "sign_up"
      ? await signUpWithGoogleIdentity(identity)
      : await signInWithGoogleIdentity(identity);
    const destination = result.requiresOnboarding ? "/onboarding" : result.organizationId ? "/app" : "/select-organization";
    const response = NextResponse.redirect(new URL(destination, request.url));
    response.cookies.set(SESSION_COOKIE_NAME, result.sessionToken, sessionCookieOptions);
    return clearGoogleState(response);
  } catch (error) {
    if (error instanceof AccountUnavailableError) return redirectToAuthentication(request, "google_unavailable", intent);
    if (error instanceof GoogleOAuthError) return redirectToAuthentication(request, "google_failed", intent);
    return redirectToAuthentication(request, "google_failed", intent);
  }
}
