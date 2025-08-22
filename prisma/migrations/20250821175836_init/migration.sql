-- CreateEnum
CREATE TYPE "Role" AS ENUM ('superadmin', 'guru', 'bk', 'siswa', 'orangtua');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('L', 'P');

-- CreateEnum
CREATE TYPE "TipeReport" AS ENUM ('pelanggaran', 'prestasi');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "nisn" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "tempatLahir" TEXT NOT NULL,
    "tglLahir" TIMESTAMP(3) NOT NULL,
    "alamat" TEXT NOT NULL,
    "noHp" TEXT,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "classroomId" INTEGER,
    "angkatanId" INTEGER NOT NULL,
    "orangTuaId" INTEGER,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "Classroom" (
    "id" SERIAL NOT NULL,
    "kodeKelas" TEXT NOT NULL,
    "namaKelas" TEXT NOT NULL,
    "waliKelasId" INTEGER,

    CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Angkatan" (
    "id" SERIAL NOT NULL,
    "tahun" TEXT NOT NULL,

    CONSTRAINT "Angkatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kategori" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "tipe" "TipeReport" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kategori_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportItem" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "tipe" "TipeReport" NOT NULL,
    "kategoriId" INTEGER NOT NULL,
    "jenis" TEXT,
    "point" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentReport" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "reporterId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "tahunAjaranId" INTEGER NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "waktu" TIMESTAMP(3),
    "deskripsi" TEXT,
    "pointSaat" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportEvidence" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "tipe" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportEvidence_pkey" PRIMARY KEY ("id")
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
    "studentReportId" INTEGER,
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
CREATE TABLE "TahunAjaran" (
    "id" SERIAL NOT NULL,
    "tahunAjaran" TEXT NOT NULL,
    "tahunMulai" INTEGER NOT NULL,
    "tahunSelesai" INTEGER NOT NULL,
    "tanggalMulai" TIMESTAMP(3) NOT NULL,
    "tanggalSelesai" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TahunAjaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreHistory" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "pointLama" INTEGER NOT NULL,
    "pointBaru" INTEGER NOT NULL,
    "alasan" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_nisn_key" ON "Student"("nisn");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_userId_key" ON "Teacher"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_nip_key" ON "Teacher"("nip");

-- CreateIndex
CREATE UNIQUE INDEX "OrangTua_userId_key" ON "OrangTua"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_kodeKelas_key" ON "Classroom"("kodeKelas");

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_waliKelasId_key" ON "Classroom"("waliKelasId");

-- CreateIndex
CREATE UNIQUE INDEX "Angkatan_tahun_key" ON "Angkatan"("tahun");

-- CreateIndex
CREATE UNIQUE INDEX "Penanganan_studentReportId_key" ON "Penanganan"("studentReportId");

-- CreateIndex
CREATE UNIQUE INDEX "TahunAjaran_tahunAjaran_key" ON "TahunAjaran"("tahunAjaran");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_angkatanId_fkey" FOREIGN KEY ("angkatanId") REFERENCES "Angkatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_orangTuaId_fkey" FOREIGN KEY ("orangTuaId") REFERENCES "OrangTua"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrangTua" ADD CONSTRAINT "OrangTua_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_waliKelasId_fkey" FOREIGN KEY ("waliKelasId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportItem" ADD CONSTRAINT "ReportItem_kategoriId_fkey" FOREIGN KEY ("kategoriId") REFERENCES "kategori"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentReport" ADD CONSTRAINT "StudentReport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentReport" ADD CONSTRAINT "StudentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentReport" ADD CONSTRAINT "StudentReport_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ReportItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentReport" ADD CONSTRAINT "StudentReport_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportEvidence" ADD CONSTRAINT "ReportEvidence_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "StudentReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Penanganan" ADD CONSTRAINT "Penanganan_studentReportId_fkey" FOREIGN KEY ("studentReportId") REFERENCES "StudentReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Penanganan" ADD CONSTRAINT "Penanganan_tindakanOtomatisId_fkey" FOREIGN KEY ("tindakanOtomatisId") REFERENCES "TindakanOtomatis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreHistory" ADD CONSTRAINT "ScoreHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
