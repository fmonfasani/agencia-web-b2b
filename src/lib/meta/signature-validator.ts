import crypto from "crypto";

/**
 * Validates the X-Hub-Signature-256 header sent by Meta to ensure the request
 * originates from their servers and hasn't been tampered with.
 *
 * @param payload - The raw request body as a string
 * @param signature - The value of the x-hub-signature-256 header
 * @returns boolean - True if the signature is valid
 */
export function validateMetaSignature(
  payload: string,
  signature: string,
): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    console.warn(
      "[Security] WHATSAPP_APP_SECRET is not defined. Skipping validation (NOT RECOMMENDED).",
    );
    return true; // Or false, depending on how strict you want to be during dev
  }

  if (!signature) {
    console.error("[Security] No signature header found in request");
    return false;
  }

  // Signature format is 'sha256=...'
  const parts = signature.split("=");
  if (parts.length !== 2 || parts[0] !== "sha256") {
    console.error("[Security] Invalid signature format");
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", appSecret)
    .update(payload)
    .digest("hex");

  return parts[1] === expectedSignature;
}
