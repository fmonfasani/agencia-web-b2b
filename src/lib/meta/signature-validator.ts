import crypto from "crypto";

export function validateMetaSignature(
  payload: string,
  signature: string,
): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    console.error("[Security] WHATSAPP_APP_SECRET is not defined.");
    return process.env.NODE_ENV !== "production";
  }

  if (!signature) {
    console.error("[Security] No signature header found in request");
    return false;
  }

  const parts = signature.split("=");
  if (parts.length !== 2 || parts[0] !== "sha256") {
    console.error("[Security] Invalid signature format");
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", appSecret)
    .update(payload)
    .digest("hex");

  const provided = Buffer.from(parts[1], "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");
  if (provided.length !== expected.length) return false;

  return crypto.timingSafeEqual(provided, expected);
}
