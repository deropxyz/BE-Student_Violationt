-- CreateTable
CREATE TABLE "Konsultasi" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "bkId" INTEGER NOT NULL,
    "judul" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Konsultasi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Konsultasi_studentId_idx" ON "Konsultasi"("studentId");

-- CreateIndex
CREATE INDEX "Konsultasi_bkId_idx" ON "Konsultasi"("bkId");

-- CreateIndex
CREATE INDEX "Konsultasi_tanggal_idx" ON "Konsultasi"("tanggal");

-- AddForeignKey
ALTER TABLE "Konsultasi" ADD CONSTRAINT "Konsultasi_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Konsultasi" ADD CONSTRAINT "Konsultasi_bkId_fkey" FOREIGN KEY ("bkId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
