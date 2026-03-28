/**
 * Scoring and priority logic for Leads.
 */

export interface ScoringFactors {
  rating?: number | null;
  reviewsCount?: number | null;
  hasWebsite?: boolean;
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasWhatsapp?: boolean;
}

export function calculateLeadScore(factors: ScoringFactors): number {
  let score = 0;

  // 1. Rating Weight (Max 30 pts)
  if (factors.rating) {
    score += (factors.rating / 5) * 30;
  }

  // 2. Volume Weight (Max 20 pts)
  if (factors.reviewsCount) {
    if (factors.reviewsCount > 100) score += 20;
    else if (factors.reviewsCount > 50) score += 15;
    else if (factors.reviewsCount > 10) score += 10;
    else if (factors.reviewsCount > 0) score += 5;
  }

  // 3. Tech Weight (Max 25 pts)
  if (factors.hasWebsite) {
    score += 25;
  }

  // 4. Contact Weight (Max 25 pts)
  let contactScore = 0;
  if (factors.hasEmail) contactScore += 10;
  if (factors.hasPhone) contactScore += 5;
  if (factors.hasWhatsapp) contactScore += 10;
  score += Math.min(contactScore, 25);

  return Math.round(score);
}

export function determinePriority(score: number): "LOW" | "MEDIUM" | "HIGH" {
  if (score >= 80) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

export function calculateCompleteness(factors: Record<string, any>): number {
  const fields = Object.values(factors);
  if (fields.length === 0) return 0;

  const filledFields = fields.filter(
    (val) => val !== null && val !== undefined && val !== "",
  ).length;
  return Number((filledFields / fields.length).toFixed(2));
}
