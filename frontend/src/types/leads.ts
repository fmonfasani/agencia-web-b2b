export interface Lead {
  id: string;
  name: string | null;
  companyName?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  description?: string | null;
  category?: string | null;
  rating?: number | null;
  reviewsCount?: number | null;
  googleMapsUrl?: string | null;
  googlePlaceId?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  whatsapp?: string | null;
  linkedin?: string | null;
  tiktok?: string | null;
  email?: string | null;
  status: string;
  priority?: string;
  potentialScore: number;
  sourceType: string;
  tenantId?: string | null;
  lastEnrichedAt?: Date | string | null;
  createdAt: string | Date;
  rawMetadata?: Record<string, unknown> | null;
  intelligence?: IntelligenceResult | null;
  pipelineStatus?: string;
}

export interface IntelligenceResult {
  id?: string;
  updatedAt?: string | Date;
  leadId?: string;
  analyzedAt?: string | Date;
  tier: string; // "HOT" | "WARM" | "COOL" | "COLD" or serialized string
  opportunityScore: number;
  demandScore: number;
  digitalGapScore: number;
  outreachScore: number;
  websiteLoads?: boolean | null;
  hasSSL?: boolean | null;
  hasContactForm?: boolean | null;
  hasBookingSystem?: boolean | null;
  hasChatbot?: boolean | null;
  hasWhatsappLink?: boolean | null;
  topProblem?: string | null;
  revenueEstimate?: number | null;
  bestChannel?: string | null;
  whatsappMsg?: string | null;
  emailSubject?: string | null;
  emailBody?: string | null;
  strategicBrief?: string | null;
  marketAnalysis?: string | null;
  nicheAnalysis?: string | null;
  interviewGuide?: string | null;
}
