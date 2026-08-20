export const SESSION_COOKIE_NAME = "levelup_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 14;

export const sessionCookieOptions = {
  httpOnly: true,
  maxAge: SESSION_DURATION_SECONDS,
  path: "/",
  priority: "high" as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};
