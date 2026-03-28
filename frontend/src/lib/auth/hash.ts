import { createHash, randomBytes } from "crypto";

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function generateInvitationToken() {
  return randomBytes(32).toString("hex");
}

export function hashPassword(password: string) {
  return sha256(password);
}
