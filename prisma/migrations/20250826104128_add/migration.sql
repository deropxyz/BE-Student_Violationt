/*
  Warnings:

  - Added the required column `updatedAt` to the `Angkatan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ReportEvidence` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ReportItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `StudentReport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `TahunAjaran` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Teacher` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `kategori` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Angkatan" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ReportEvidence" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ReportItem" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "StudentReport" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "TahunAjaran" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "kategori" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
