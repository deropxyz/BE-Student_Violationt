/*
  Warnings:

  - You are about to drop the column `tipe` on the `ReportEvidence` table. All the data in the column will be lost.
  - You are about to drop the column `orangTuaId` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the `OrangTua` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Penanganan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TindakanOtomatis` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "OrangTua" DROP CONSTRAINT "OrangTua_userId_fkey";

-- DropForeignKey
ALTER TABLE "Penanganan" DROP CONSTRAINT "Penanganan_studentReportId_fkey";

-- DropForeignKey
ALTER TABLE "Penanganan" DROP CONSTRAINT "Penanganan_tindakanOtomatisId_fkey";

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_orangTuaId_fkey";

-- AlterTable
ALTER TABLE "ReportEvidence" DROP COLUMN "tipe";

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "orangTuaId",
ADD COLUMN     "namaOrtu" TEXT,
ADD COLUMN     "nohpOrtu" TEXT;

-- DropTable
DROP TABLE "OrangTua";

-- DropTable
DROP TABLE "Penanganan";

-- DropTable
DROP TABLE "TindakanOtomatis";
