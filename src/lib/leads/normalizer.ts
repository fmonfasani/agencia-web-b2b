/**
 * Utility functions for lead data normalization and cleaning.
 */

export function normalizeEmail(
  email: string | null | undefined,
): string | null {
  if (!email) return null;
  return email.trim().toLowerCase();
}

export function normalizePhone(
  phone: string | null | undefined,
): string | null {
  if (!phone) return null;
  // Keep only digits and the '+' sign
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned || null;
}

export function extractDomain(
  urlOrEmail: string | null | undefined,
): string | null {
  if (!urlOrEmail) return null;

  try {
    if (urlOrEmail.includes("@")) {
      return urlOrEmail.split("@")[1].toLowerCase();
    }

    let url = urlOrEmail.trim().toLowerCase();
    if (!url.startsWith("http")) {
      url = "http://" + url;
    }
    const domain = new URL(url).hostname;
    return domain.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function inferCompanyName(
  email: string | null | undefined,
  website: string | null | undefined,
): string | null {
  const domain = extractDomain(website) || extractDomain(email);
  if (!domain) return null;

  // List of common generic domains to ignore
  const genericDomains = [
    "gmail.com",
    "outlook.com",
    "hotmail.com",
    "yahoo.com",
    "icloud.com",
  ];
  if (genericDomains.includes(domain)) return null;

  // Capitalize first letter of domain (simple inference)
  const name = domain.split(".")[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function isCorporateEmail(email: string | null | undefined): boolean {
  const domain = extractDomain(email);
  if (!domain) return false;

  const genericDomains = [
    "gmail.com",
    "outlook.com",
    "hotmail.com",
    "yahoo.com",
    "icloud.com",
    "live.com",
    "me.com",
    "msn.com",
  ];
  return !genericDomains.includes(domain);
}

export function cleanText(text: string | null | undefined): string | null {
  if (!text) return null;
  return text.trim().replace(/\s+/g, " ");
}
