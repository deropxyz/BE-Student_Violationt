/*
  Warnings:

  - You are about to drop the column `name` on the `Classroom` table. All the data in the column will be lost.
  - You are about to drop the column `class` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `nis` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `StudentViolation` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `StudentViolation` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `StudentViolation` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `Violation` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Violation` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[kodeKelas]` on the table `Classroom` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[waliKelasId]` on the table `Classroom` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nisn]` on the table `Student` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `kodeKelas` to the `Classroom` table without a default value. This is not possible if the table is not empty.
  - Added the required column `namaKelas` to the `Classroom` table without a default value. This is not possible if the table is not empty.
  - Added the required column `waliKelasId` to the `Classroom` table without a default value. This is not possible if the table is not empty.
  - Added the required column `alamat` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `angkatanId` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gender` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nisn` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tempatLahir` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tglLahir` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pointSaat` to the `StudentViolation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jenis` to the `Violation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `kategori` to the `Violation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nama` to the `Violation` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('L', 'P');

-- CreateEnum
CREATE TYPE "JenisPelanggaran" AS ENUM ('kedisiplinan', 'akademik', 'lainnya');

-- CreateEnum
CREATE TYPE "KategoriPelanggaran" AS ENUM ('ringan', 'sedang', 'berat');

-- CreateEnum
CREATE TYPE "TipePoin" AS ENUM ('pelanggaran', 'prestasi');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'orangtua';

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_userId_fkey";

-- DropIndex
DROP INDEX "Classroom_name_key";

-- DropIndex
DROP INDEX "Student_nis_key";

-- AlterTable
ALTER TABLE "Classroom" DROP COLUMN "name",
ADD COLUMN     "jmlSiswa" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "kodeKelas" TEXT NOT NULL,
ADD COLUMN     "namaKelas" TEXT NOT NULL,
ADD COLUMN     "waliKelasId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "class",
DROP COLUMN "nis",
ADD COLUMN     "alamat" TEXT NOT NULL,
ADD COLUMN     "angkatanId" INTEGER NOT NULL,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "gender" "Gender" NOT NULL,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nisn" TEXT NOT NULL,
ADD COLUMN     "noHp" TEXT,
ADD COLUMN     "orangTuaId" INTEGER,
ADD COLUMN     "tempatLahir" TEXT NOT NULL,
ADD COLUMN     "tglLahir" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "totalScore" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "StudentViolation" DROP COLUMN "date",
DROP COLUMN "description",
DROP COLUMN "status",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deskripsi" TEXT,
ADD COLUMN     "pointSaat" INTEGER NOT NULL,
ADD COLUMN     "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "waktu" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Violation" DROP COLUMN "category",
DROP COLUMN "name",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "jenis" "JenisPelanggaran" NOT NULL,
ADD COLUMN     "kategori" "KategoriPelanggaran" NOT NULL,
ADD COLUMN     "nama" TEXT NOT NULL,
ADD COLUMN     "tipe" "TipePoin" NOT NULL DEFAULT 'pelanggaran';

-- CreateTable
CREATE TABLE "Teacher" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "nip" TEXT NOT NULL,
    "noHp" TEXT,
    "alamat" TEXT,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrangTua" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "noHp" TEXT,
    "alamat" TEXT,
    "pekerjaan" TEXT,

    CONSTRAINT "OrangTua_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Angkatan" (
    "id" SERIAL NOT NULL,
    "tahun" TEXT NOT NULL,
    "lulusDate" TIMESTAMP(3),

    CONSTRAINT "Angkatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TindakanOtomatis" (
    "id" SERIAL NOT NULL,
    "minPoint" INTEGER NOT NULL,
    "maxPoint" INTEGER,
    "namaTindakan" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TindakanOtomatis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Penanganan" (
    "id" SERIAL NOT NULL,
    "studentViolationId" INTEGER NOT NULL,
    "tindakanOtomatisId" INTEGER,
    "jenisPenanganan" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "tanggalPenanganan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "penanggungJawab" TEXT NOT NULL,
    "statusSelesai" BOOLEAN NOT NULL DEFAULT false,
    "catatanTambahan" TEXT,

    CONSTRAINT "Penanganan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "judul" TEXT NOT NULL,
    "pesan" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KenaikanKelas" (
    "id" SERIAL NOT NULL,
    "tahunAjaran" TEXT NOT NULL,
    "tanggalProses" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deskripsi" TEXT,
    "totalSiswa" INTEGER NOT NULL,
    "sukses" INTEGER NOT NULL,
    "gagal" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KenaikanKelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreHistory" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "pointLama" INTEGER NOT NULL,
    "pointBaru" INTEGER NOT NULL,
    "alasan" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_userId_key" ON "Teacher"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_nip_key" ON "Teacher"("nip");

-- CreateIndex
CREATE UNIQUE INDEX "OrangTua_userId_key" ON "OrangTua"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Angkatan_tahun_key" ON "Angkatan"("tahun");

-- CreateIndex
CREATE UNIQUE INDEX "Penanganan_studentViolationId_key" ON "Penanganan"("studentViolationId");

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_kodeKelas_key" ON "Classroom"("kodeKelas");

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_waliKelasId_key" ON "Classroom"("waliKelasId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_nisn_key" ON "Student"("nisn");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_angkatanId_fkey" FOREIGN KEY ("angkatanId") REFERENCES "Angkatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_orangTuaId_fkey" FOREIGN KEY ("orangTuaId") REFERENCES "OrangTua"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrangTua" ADD CONSTRAINT "OrangTua_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_waliKelasId_fkey" FOREIGN KEY ("waliKelasId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Penanganan" ADD CONSTRAINT "Penanganan_studentViolationId_fkey" FOREIGN KEY ("studentViolationId") REFERENCES "StudentViolation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Penanganan" ADD CONSTRAINT "Penanganan_tindakanOtomatisId_fkey" FOREIGN KEY ("tindakanOtomatisId") REFERENCES "TindakanOtomatis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
