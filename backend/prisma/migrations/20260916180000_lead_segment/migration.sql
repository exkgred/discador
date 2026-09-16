-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "company" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Lead" ADD COLUMN "city" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Lead" ADD COLUMN "segment" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Lead" ADD COLUMN "activity" TEXT NOT NULL DEFAULT '';
CREATE INDEX "Lead_segment_idx" ON "Lead"("segment");

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN "segment" TEXT;
