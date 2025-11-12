const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkPoints() {
  try {
    console.log("=== PELANGGARAN ITEMS ===");
    const pelanggaran = await prisma.reportItem.findMany({
      where: { tipe: "pelanggaran" },
      select: { id: true, nama: true, point: true, jenis: true },
    });

    pelanggaran.forEach((item) => {
      console.log(
        `ID: ${item.id}, Nama: ${item.nama}, Point: ${item.point}, Jenis: ${item.jenis}`
      );
    });

    console.log("\n=== PRESTASI ITEMS (sample) ===");
    const prestasi = await prisma.reportItem.findMany({
      where: { tipe: "prestasi" },
      select: { id: true, nama: true, point: true, jenis: true },
      take: 5,
    });

    prestasi.forEach((item) => {
      console.log(
        `ID: ${item.id}, Nama: ${item.nama}, Point: ${item.point}, Jenis: ${item.jenis}`
      );
    });

    console.log("\n=== STUDENT REPORTS ===");
    const reports = await prisma.studentReport.findMany({
      include: {
        item: { select: { nama: true, point: true, tipe: true } },
        student: { select: { user: { select: { name: true } } } },
      },
    });

    reports.forEach((report) => {
      console.log(
        `Siswa: ${report.student.user.name}, Item: ${report.item.nama}, Point Item: ${report.item.point}, Point Saat: ${report.pointSaat}, Tipe: ${report.item.tipe}`
      );
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPoints();
