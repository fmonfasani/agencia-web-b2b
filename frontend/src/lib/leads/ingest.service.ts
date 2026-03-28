import { prisma } from "@/lib/prisma";
// Fallback types for Prisma generated types
type LeadSourceType = "SCRAPER" | "MANUAL" | "API" | "ADS";
type BusinessType = "SERVICIO" | "INDUSTRIA" | "COMERCIO" | "OFICIO";
import { Lead } from "@prisma/client";
import {
  normalizeEmail,
  normalizePhone,
  cleanText,
  inferCompanyName,
  isCorporateEmail,
} from "./normalizer";
import { classifyBusinessByCategory } from "./classifier";
import {
  calculateLeadScore,
  determinePriority,
  calculateCompleteness,
} from "./scoring";

export interface LeadIngestInput {
  tenantId: string;
  sourceType: LeadSourceType;
  businessType?: BusinessType;

  // RAW Data
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  tiktok?: string;
  whatsapp?: string;

  // Manual Overrides / Quality Flags
  isEmailCorp?: boolean;
  isWebFunctional?: boolean;

  // Scraper Context
  googlePlaceId?: string;
  googleMapsUrl?: string;
  category?: string;
  rating?: number;
  reviewsCount?: number;
  address?: string;
  description?: string;

  // Custom Metadata
  rawMetadata?: any;
}

/**
 * Main service to ingest and process leads with normalization and scoring.
 */
export async function ingestLead(input: LeadIngestInput): Promise<Lead> {
  // 1. CLEAN & NORMALIZE
  const cleanEmail = normalizeEmail(input.email);
  const cleanPhone = normalizePhone(input.phone);
  const cleanName = cleanText(input.name);
  const cleanCompany =
    input.sourceType === "SCRAPER"
      ? cleanName
      : cleanText(input.name) || inferCompanyName(cleanEmail, input.website);

  // 2. CLASSIFY
  let businessType = input.businessType;
  if (!businessType && input.sourceType === "SCRAPER") {
    businessType = (classifyBusinessByCategory(input.category) ||
      undefined) as BusinessType;
  }

  // VALIDATION: BusinessType is required for persist
  if (!businessType && input.sourceType === "MANUAL") {
    // We could either default or throw. The requirement says "No permitir guardar sin business_type"
    throw new Error("Business type is required for manual leads.");
  }

  // 3. SCORE
  const score = calculateLeadScore({
    rating: input.rating,
    reviewsCount: input.reviewsCount,
    hasWebsite: !!input.website,
    hasEmail: !!cleanEmail,
    hasPhone: !!cleanPhone,
    hasWhatsapp:
      !!input.whatsapp || (!!cleanPhone && input.sourceType === "SCRAPER"),
  });

  const completeness = calculateCompleteness({
    email: cleanEmail,
    phone: cleanPhone,
    company: cleanCompany,
    web: input.website,
    address: input.address,
    category: input.category,
  });

  // 4. PERSIST (UPSERT if scraper, else CREATE)
  const data = {
    tenantId: input.tenantId,
    sourceType: input.sourceType,
    businessType: businessType || null,

    name: cleanName,
    companyName: cleanCompany,
    email: cleanEmail,
    phone: cleanPhone,
    whatsapp: input.whatsapp || cleanPhone, // Default whatsapp to phone if available

    website: input.website,
    instagram: input.instagram,
    facebook: input.facebook,
    linkedin: input.linkedin,
    tiktok: input.tiktok,

    isEmailCorp: input.isEmailCorp ?? isCorporateEmail(cleanEmail),
    isWebFunctional: input.isWebFunctional ?? true,

    googlePlaceId: input.googlePlaceId,
    googleMapsUrl: input.googleMapsUrl,
    category: input.category,
    rating: input.rating,
    reviewsCount: input.reviewsCount,
    address: input.address,

    description: input.description,
    potentialScore: score,
    priority: determinePriority(score),
    completeness: completeness,

    rawMetadata: input.rawMetadata || {},
    source: input.sourceType.toLowerCase(), // Legacy compatibility
  };

  if (input.sourceType === "SCRAPER" && input.googlePlaceId) {
    return (prisma.lead as any).upsert({
      where: { googlePlaceId: input.googlePlaceId },
      update: data,
      create: data,
    });
  }

  return (prisma.lead as any).create({
    data,
  });
}
