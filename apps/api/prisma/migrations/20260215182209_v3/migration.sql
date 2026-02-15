-- AlterTable
ALTER TABLE "GoogleAccount" ADD COLUMN     "isDestination" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPrimarySource" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "GoogleAccount_isPrimarySource_idx" ON "GoogleAccount"("isPrimarySource");

-- CreateIndex
CREATE INDEX "GoogleAccount_isDestination_idx" ON "GoogleAccount"("isDestination");
