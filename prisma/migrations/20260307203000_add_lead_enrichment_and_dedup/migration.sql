-- AlterTable
ALTER TABLE "Lead"
ADD COLUMN "technologies" JSONB,
ADD COLUMN "websiteScore" INTEGER,
ADD COLUMN "socialPresence" JSONB,
ADD COLUMN "designQuality" TEXT,
ADD COLUMN "estimatedCompanySize" TEXT,
ADD COLUMN "lastEnriched" TIMESTAMP(3),
ADD COLUMN "enrichmentStatus" TEXT;

-- Normalize empty dedup keys to NULL so they don't collide on unique indexes.
UPDATE "Lead"
SET "website" = NULL
WHERE "website" IS NOT NULL AND btrim("website") = '';

UPDATE "Lead"
SET "phone" = NULL
WHERE "phone" IS NOT NULL AND btrim("phone") = '';

-- Keep the earliest row per tenant+website and null out duplicates.
WITH ranked_websites AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "tenantId", "website"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS rn
  FROM "Lead"
  WHERE "website" IS NOT NULL
)
UPDATE "Lead" l
SET "website" = NULL
FROM ranked_websites rw
WHERE l."id" = rw."id" AND rw.rn > 1;

-- Keep the earliest row per tenant+phone and null out duplicates.
WITH ranked_phones AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "tenantId", "phone"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS rn
  FROM "Lead"
  WHERE "phone" IS NOT NULL
)
UPDATE "Lead" l
SET "phone" = NULL
FROM ranked_phones rp
WHERE l."id" = rp."id" AND rp.rn > 1;

-- CreateIndex
CREATE UNIQUE INDEX "Lead_tenantId_website_key" ON "Lead"("tenantId", "website");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_tenantId_phone_key" ON "Lead"("tenantId", "phone");
