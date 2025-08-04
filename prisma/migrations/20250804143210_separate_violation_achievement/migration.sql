/*
  Warnings:

  - You are about to drop the column `tipe` on the `Violation` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "KategoriPrestasi" AS ENUM ('akademik', 'non_akademik', 'olahraga', 'kesenian', 'lainnya');

-- AlterTable
ALTER TABLE "Violation" DROP COLUMN "tipe";

-- DropEnum
DROP TYPE "TipePoin";

-- CreateTable
CREATE TABLE "Achievement" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "kategori" "KategoriPrestasi" NOT NULL,
    "point" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAchievement" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "achievementId" INTEGER NOT NULL,
    "reporterId" INTEGER NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "waktu" TIMESTAMP(3),
    "deskripsi" TEXT,
    "evidenceUrl" TEXT,
    "pointSaat" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentAchievement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StudentAchievement" ADD CONSTRAINT "StudentAchievement_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAchievement" ADD CONSTRAINT "StudentAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAchievement" ADD CONSTRAINT "StudentAchievement_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
