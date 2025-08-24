-- CreateTable
CREATE TABLE "SuratPeringatan" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "jenisSurat" TEXT NOT NULL,
    "tingkatSurat" INTEGER NOT NULL,
    "totalScoreSaat" INTEGER NOT NULL,
    "judul" TEXT NOT NULL,
    "isiSurat" TEXT NOT NULL,
    "statusKirim" TEXT NOT NULL DEFAULT 'pending',
    "tanggalKirim" TIMESTAMP(3),
    "emailSiswa" TEXT,
    "emailOrtu" TEXT,
    "nomorHpOrtu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuratPeringatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomasiConfig" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "jenisSurat" TEXT NOT NULL,
    "tingkat" INTEGER NOT NULL,
    "judulTemplate" TEXT NOT NULL,
    "isiTemplate" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomasiConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SuratPeringatan_studentId_jenisSurat_idx" ON "SuratPeringatan"("studentId", "jenisSurat");

-- CreateIndex
CREATE INDEX "SuratPeringatan_statusKirim_idx" ON "SuratPeringatan"("statusKirim");

-- CreateIndex
CREATE UNIQUE INDEX "AutomasiConfig_nama_key" ON "AutomasiConfig"("nama");

-- AddForeignKey
ALTER TABLE "SuratPeringatan" ADD CONSTRAINT "SuratPeringatan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
