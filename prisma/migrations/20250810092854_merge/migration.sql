/*
  Warnings:

  - A unique constraint covering the columns `[studentReportId]` on the table `Penanganan` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "TipeReport" AS ENUM ('violation', 'achievement');

-- DropForeignKey
ALTER TABLE "Penanganan" DROP CONSTRAINT "Penanganan_studentViolationId_fkey";

-- AlterTable
ALTER TABLE "Penanganan" ADD COLUMN     "studentReportId" INTEGER,
ALTER COLUMN "studentViolationId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "StudentReport" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "reporterId" INTEGER NOT NULL,
    "tipe" "TipeReport" NOT NULL,
    "violationId" INTEGER,
    "achievementId" INTEGER,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "waktu" TIMESTAMP(3),
    "deskripsi" TEXT,
    "bukti" TEXT,
    "pointSaat" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Penanganan_studentReportId_key" ON "Penanganan"("studentReportId");

-- AddForeignKey
ALTER TABLE "StudentReport" ADD CONSTRAINT "StudentReport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentReport" ADD CONSTRAINT "StudentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentReport" ADD CONSTRAINT "StudentReport_violationId_fkey" FOREIGN KEY ("violationId") REFERENCES "Violation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentReport" ADD CONSTRAINT "StudentReport_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Penanganan" ADD CONSTRAINT "Penanganan_studentViolationId_fkey" FOREIGN KEY ("studentViolationId") REFERENCES "StudentViolation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Penanganan" ADD CONSTRAINT "Penanganan_studentReportId_fkey" FOREIGN KEY ("studentReportId") REFERENCES "StudentReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
