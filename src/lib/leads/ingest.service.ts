import { prisma } from "@/lib/prisma";
import { LeadSourceType, BusinessType, Lead } from "@prisma/client";
import {
  normalizeEmail,
  normalizePhone,
  cleanText,
  inferCompanyName,
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
  whatsapp?: string;

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
    input.sourceType === LeadSourceType.SCRAPER
      ? cleanName
      : cleanText(input.name) || inferCompanyName(cleanEmail, input.website);

  // 2. CLASSIFY
  let businessType = input.businessType;
  if (!businessType && input.sourceType === LeadSourceType.SCRAPER) {
    businessType = classifyBusinessByCategory(input.category) || undefined;
  }

  // VALIDATION: BusinessType is required for persist
  if (!businessType && input.sourceType === LeadSourceType.MANUAL) {
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
      !!input.whatsapp ||
      (!!cleanPhone && input.sourceType === LeadSourceType.SCRAPER),
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

  if (input.sourceType === LeadSourceType.SCRAPER && input.googlePlaceId) {
    return prisma.lead.upsert({
      where: { googlePlaceId: input.googlePlaceId },
      update: data,
      create: data,
    });
  }

  return prisma.lead.create({
    data,
  });
}
