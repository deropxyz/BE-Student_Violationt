/*
  Warnings:

  - You are about to drop the column `evidenceUrl` on the `StudentAchievement` table. All the data in the column will be lost.
  - You are about to drop the column `evidenceUrl` on the `StudentViolation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "StudentAchievement" DROP COLUMN "evidenceUrl",
ADD COLUMN     "bukti" TEXT;

-- AlterTable
ALTER TABLE "StudentViolation" DROP COLUMN "evidenceUrl",
ADD COLUMN     "bukti" TEXT;
