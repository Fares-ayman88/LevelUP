import { NextResponse, type NextRequest } from "next/server";

import { createGoogleAuthorizationUrl, isGoogleSignInConfigured } from "@/lib/auth/google";
import {
  createGoogleOAuthState,
  GOOGLE_OAUTH_STATE_COOKIE_NAME,
  type GoogleOAuthIntent,
  googleOAuthStateCookieOptions,
} from "@/lib/auth/google-state";

export const runtime = "nodejs";

function redirectToAuthentication(request: NextRequest, error: string, intent: GoogleOAuthIntent): NextResponse {
  const url = new URL(intent === "sign_up" ? "/sign-up" : "/sign-in", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export function GET(request: NextRequest): NextResponse {
  const intent: GoogleOAuthIntent = request.nextUrl.searchParams.get("intent") === "sign_up" ? "sign_up" : "sign_in";
  if (!isGoogleSignInConfigured()) return redirectToAuthentication(request, "google_not_configured", intent);

  const { cookieValue, state } = createGoogleOAuthState(intent);
  const response = NextResponse.redirect(createGoogleAuthorizationUrl(state));
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE_NAME, cookieValue, googleOAuthStateCookieOptions);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
