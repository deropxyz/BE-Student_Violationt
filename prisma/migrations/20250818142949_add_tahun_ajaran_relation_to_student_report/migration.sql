/*
  Warnings:

  - Added the required column `tahunAjaranId` to the `StudentReport` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "StudentReport" ADD COLUMN     "tahunAjaranId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "StudentReport" ADD CONSTRAINT "StudentReport_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
