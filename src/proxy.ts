import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

export function proxy(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL(hasSession ? "/app" : "/sign-in", request.url));
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/app/:path*", "/onboarding", "/select-organization"],
};
