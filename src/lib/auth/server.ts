import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export async function getSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!rawToken) {
    return null;
  }

  return verifySessionToken(rawToken);
}

export async function requireSession(locale: string) {
  const session = await getSession();

  if (!session) {
    redirect(`/${locale}/login`);
  }

  return session;
}
