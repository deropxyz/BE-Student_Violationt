/*
  Warnings:

  - Added the required column `jurusanId` to the `Classroom` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN     "jurusanId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Jurusan" (
    "id" SERIAL NOT NULL,
    "kodeJurusan" TEXT NOT NULL,
    "namaJurusan" TEXT NOT NULL,
    "deskripsi" TEXT,
    "kajurId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jurusan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Jurusan_kodeJurusan_key" ON "Jurusan"("kodeJurusan");

-- CreateIndex
CREATE UNIQUE INDEX "Jurusan_kajurId_key" ON "Jurusan"("kajurId");

-- AddForeignKey
ALTER TABLE "Jurusan" ADD CONSTRAINT "Jurusan_kajurId_fkey" FOREIGN KEY ("kajurId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_jurusanId_fkey" FOREIGN KEY ("jurusanId") REFERENCES "Jurusan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
