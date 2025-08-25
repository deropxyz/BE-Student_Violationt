-- CreateTable
CREATE TABLE "PointAdjustment" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "pointPengurangan" INTEGER NOT NULL,
    "alasan" TEXT NOT NULL,
    "keterangan" TEXT,
    "pointSebelum" INTEGER NOT NULL,
    "pointSesudah" INTEGER NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PointAdjustment_studentId_idx" ON "PointAdjustment"("studentId");

-- CreateIndex
CREATE INDEX "PointAdjustment_teacherId_idx" ON "PointAdjustment"("teacherId");

-- CreateIndex
CREATE INDEX "PointAdjustment_tanggal_idx" ON "PointAdjustment"("tanggal");

-- AddForeignKey
ALTER TABLE "PointAdjustment" ADD CONSTRAINT "PointAdjustment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointAdjustment" ADD CONSTRAINT "PointAdjustment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
