-- Alter existing enrichment shape
UPDATE "Lead"
SET "technologies" = '[]'::jsonb
WHERE "technologies" IS NULL;

ALTER TABLE "Lead"
ALTER COLUMN "technologies" TYPE TEXT[]
USING CASE
  WHEN "technologies" IS NULL THEN ARRAY[]::TEXT[]
  WHEN jsonb_typeof("technologies") = 'array' THEN ARRAY(SELECT jsonb_array_elements_text("technologies"))
  ELSE ARRAY[]::TEXT[]
END;

ALTER TABLE "Lead"
ALTER COLUMN "technologies" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "technologies" SET NOT NULL;

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
