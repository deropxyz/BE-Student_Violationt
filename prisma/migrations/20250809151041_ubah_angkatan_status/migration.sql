/*
  Warnings:

  - You are about to drop the column `lulusDate` on the `Angkatan` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "StatusAngkatan" AS ENUM ('aktif', 'lulus');

-- AlterTable
ALTER TABLE "Angkatan" DROP COLUMN "lulusDate",
ADD COLUMN     "status" "StatusAngkatan" NOT NULL DEFAULT 'aktif';
