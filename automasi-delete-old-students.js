// Scheduler untuk menghapus data siswa, report, penanganan, SP, dan user yang sudah lebih dari 5 tahun
// Jalankan dengan node automasi-delete-old-students.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Tahun ajaran sekarang (misal: 2025/2026)
  const tahunAjaranSekarang = "2025/2026";
  // Ambil tahun ajaran yang lebih dari 5 tahun dari sekarang
  const tahunAjaranHapus = "2020/2021";
  // Ambil angkatan yang tahun <= 2020
  const tahunAngkatanHapus = 2020;

  // 1. Cari semua siswa yang angkatannya <= 2020
  const oldStudents = await prisma.student.findMany({
    where: {
      angkatan: {
        tahun: { lte: tahunAngkatanHapus },
      },
    },
    select: { id: true, userId: true },
  });
  const studentIds = oldStudents.map((s) => s.id);
  const userIds = oldStudents.map((s) => s.userId);

  if (studentIds.length === 0) {
    console.log("Tidak ada siswa lama yang perlu dihapus.");
    return;
  }

  // 2. Hapus report siswa (student report)
  await prisma.report.deleteMany({
    where: { studentId: { in: studentIds } },
  });
  // 3. Hapus penanganan (pointAdjustment)
  await prisma.pointAdjustment.deleteMany({
    where: { studentId: { in: studentIds } },
  });
  // 4. Hapus surat peringatan (SP)
  await prisma.suratPeringatan.deleteMany({
    where: { studentId: { in: studentIds } },
  });
  // 5. Hapus siswa
  await prisma.student.deleteMany({
    where: { id: { in: studentIds } },
  });
  // 6. Hapus user
  await prisma.user.deleteMany({
    where: { id: { in: userIds } },
  });
  // 7. Hapus angkatan tahun 2020
  await prisma.angkatan.deleteMany({
    where: { tahun: { lte: tahunAngkatanHapus } },
  });

  console.log(
    `Berhasil menghapus data siswa, report, penanganan, SP, user, dan angkatan tahun <= ${tahunAngkatanHapus}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
