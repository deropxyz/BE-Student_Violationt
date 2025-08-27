/*
  Warnings:

  - You are about to drop the column `emailOrtu` on the `SuratPeringatan` table. All the data in the column will be lost.
  - Added the required column `tahunAjaranId` to the `SuratPeringatan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SuratPeringatan" DROP COLUMN "emailOrtu",
ADD COLUMN     "tahunAjaranId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "SuratPeringatan" ADD CONSTRAINT "SuratPeringatan_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
