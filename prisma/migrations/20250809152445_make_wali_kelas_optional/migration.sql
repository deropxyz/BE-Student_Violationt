-- DropForeignKey
ALTER TABLE "Classroom" DROP CONSTRAINT "Classroom_waliKelasId_fkey";

-- AlterTable
ALTER TABLE "Classroom" ALTER COLUMN "waliKelasId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_waliKelasId_fkey" FOREIGN KEY ("waliKelasId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
