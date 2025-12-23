-- CreateTable
CREATE TABLE "KenaikanKelasDetail" (
    "id" SERIAL NOT NULL,
    "kenaikanKelasId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "studentName" TEXT NOT NULL,
    "nisn" TEXT NOT NULL,
    "fromClass" TEXT NOT NULL,
    "toClass" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KenaikanKelasDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KenaikanKelasDetail_kenaikanKelasId_idx" ON "KenaikanKelasDetail"("kenaikanKelasId");

-- CreateIndex
CREATE INDEX "KenaikanKelasDetail_studentId_idx" ON "KenaikanKelasDetail"("studentId");

-- CreateIndex
CREATE INDEX "KenaikanKelasDetail_type_idx" ON "KenaikanKelasDetail"("type");

-- AddForeignKey
ALTER TABLE "KenaikanKelasDetail" ADD CONSTRAINT "KenaikanKelasDetail_kenaikanKelasId_fkey" FOREIGN KEY ("kenaikanKelasId") REFERENCES "KenaikanKelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
