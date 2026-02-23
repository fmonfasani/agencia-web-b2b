import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE_NAME = "admin_session";

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function createSignature(
  payload: string,
  secret: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );
  return toBase64Url(new Uint8Array(signature));
}

export async function isValidAdminSessionToken(
  token?: string | null,
): Promise<boolean> {
  if (!token) {
    return false;
  }

  const staticToken = process.env.ADMIN_SESSION_TOKEN;
  if (staticToken) {
    return token === staticToken;
  }

  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    return false;
  }

  const [expiresAtStr, signature] = token.split(".");
  if (!expiresAtStr || !signature) {
    return false;
  }

  const expiresAt = Number.parseInt(expiresAtStr, 10);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return false;
  }

  const expectedSignature = await createSignature(expiresAtStr, secret);
  return signature === expectedSignature;
}

export async function hasValidServerAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  return isValidAdminSessionToken(token);
}
