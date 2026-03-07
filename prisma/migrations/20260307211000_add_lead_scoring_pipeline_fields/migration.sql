-- CreateEnum
CREATE TYPE "PipelineStatus" AS ENUM (
  'NUEVO',
  'ENRIQUECIDO',
  'SCORED',
  'INVESTIGADO',
  'CITADO',
  'LLAMADO',
  'PROPUESTA_ENVIADA',
  'CERRADO_GANADO',
  'CERRADO_PERDIDO',
  'DESCARTADO'
);

-- AlterTable
ALTER TABLE "Lead"
ADD COLUMN "industry" TEXT,
ADD COLUMN "pipelineStatus" "PipelineStatus" NOT NULL DEFAULT 'NUEVO',
ADD COLUMN "score" INTEGER,
ADD COLUMN "scoreReason" TEXT,
ADD COLUMN "recommendedService" TEXT,
ADD COLUMN "urgency" TEXT,
ADD COLUMN "estimatedBudget" TEXT,
ADD COLUMN "bestTimeToCall" TEXT,
ADD COLUMN "brief" TEXT;
