/*
  Warnings:

  - Added the required column `tahunAjaranId` to the `PointAdjustment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PointAdjustment" ADD COLUMN     "tahunAjaranId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "PointAdjustment_tahunAjaranId_idx" ON "PointAdjustment"("tahunAjaranId");

-- AddForeignKey
ALTER TABLE "PointAdjustment" ADD CONSTRAINT "PointAdjustment_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
