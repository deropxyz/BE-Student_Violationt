-- AlterTable
ALTER TABLE "StudentReport" ADD COLUMN     "rejectionNote" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "validatedAt" TIMESTAMP(3),
ADD COLUMN     "validatedBy" INTEGER;

-- CreateIndex
CREATE INDEX "StudentReport_status_idx" ON "StudentReport"("status");

-- CreateIndex
CREATE INDEX "StudentReport_reporterId_idx" ON "StudentReport"("reporterId");
