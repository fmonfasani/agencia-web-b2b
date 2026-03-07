-- Alter existing enrichment shape
ALTER TABLE "Lead"
ADD COLUMN "technologies_new" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Lead"
DROP COLUMN "technologies";

ALTER TABLE "Lead"
RENAME COLUMN "technologies_new" TO "technologies";

-- Add new enrichment and pipeline context fields
ALTER TABLE "Lead"
ADD COLUMN "hasAnalytics" BOOLEAN,
ADD COLUMN "hasPixel" BOOLEAN,
ADD COLUMN "hasSEO" BOOLEAN,
ADD COLUMN "isResponsive" BOOLEAN,
ADD COLUMN "websiteAge" TEXT,
ADD COLUMN "companySize" TEXT,
ADD COLUMN "mainProducts" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "competitors" JSONB,
ADD COLUMN "lastEnrichedAt" TIMESTAMP(3);
