/*
  Warnings:

  - You are about to drop the `ReportEvidence` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ReportEvidence" DROP CONSTRAINT "ReportEvidence_reportId_fkey";

-- AlterTable
ALTER TABLE "PointAdjustment" ADD COLUMN     "bukti" TEXT;

-- AlterTable
ALTER TABLE "StudentReport" ADD COLUMN     "bukti" TEXT;

-- DropTable
DROP TABLE "ReportEvidence";
