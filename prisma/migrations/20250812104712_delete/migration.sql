/*
  Warnings:

  - You are about to drop the column `studentViolationId` on the `Penanganan` table. All the data in the column will be lost.
  - You are about to drop the `StudentAchievement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StudentViolation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Penanganan" DROP CONSTRAINT "Penanganan_studentViolationId_fkey";

-- DropForeignKey
ALTER TABLE "StudentAchievement" DROP CONSTRAINT "StudentAchievement_achievementId_fkey";

-- DropForeignKey
ALTER TABLE "StudentAchievement" DROP CONSTRAINT "StudentAchievement_reporterId_fkey";

-- DropForeignKey
ALTER TABLE "StudentAchievement" DROP CONSTRAINT "StudentAchievement_studentId_fkey";

-- DropForeignKey
ALTER TABLE "StudentViolation" DROP CONSTRAINT "StudentViolation_reporterId_fkey";

-- DropForeignKey
ALTER TABLE "StudentViolation" DROP CONSTRAINT "StudentViolation_studentId_fkey";

-- DropForeignKey
ALTER TABLE "StudentViolation" DROP CONSTRAINT "StudentViolation_violationId_fkey";

-- DropIndex
DROP INDEX "Penanganan_studentViolationId_key";

-- AlterTable
ALTER TABLE "Penanganan" DROP COLUMN "studentViolationId";

-- DropTable
DROP TABLE "StudentAchievement";

-- DropTable
DROP TABLE "StudentViolation";
