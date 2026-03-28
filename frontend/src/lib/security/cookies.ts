export const SESSION_COOKIE_NAME = "session";

const isProd = process.env.NODE_ENV === "production";

export type SessionCookieFlow = "default" | "sensitive";

export function getSessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

export function getClearSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}
