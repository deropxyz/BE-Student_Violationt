const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function updateClassroomNames() {
  try {
    console.log("Memulai update nama kelas...");

    // Ambil semua kelas
    const classrooms = await prisma.classroom.findMany({
      orderBy: { kodeKelas: "asc" },
    });

    console.log(`Ditemukan ${classrooms.length} kelas`);

    let updated = 0;
    for (const classroom of classrooms) {
      // Parse kodeKelas: X-RPL-1 -> X RPL 1
      const parts = classroom.kodeKelas.split("-");
      if (parts.length === 3) {
        const tingkat = parts[0]; // X, XI, XII
        const jurusan = parts[1]; // RPL, MPLB, dll
        const nomor = parts[2]; // 1, 2, dll

        const newNamaKelas = `${tingkat} ${jurusan} ${nomor}`;

        // Update jika berbeda
        if (classroom.namaKelas !== newNamaKelas) {
          await prisma.classroom.update({
            where: { id: classroom.id },
            data: { namaKelas: newNamaKelas },
          });
          console.log(
            `Updated: ${classroom.kodeKelas} | ${classroom.namaKelas} -> ${newNamaKelas}`
          );
          updated++;
        } else {
          console.log(`Skip: ${classroom.kodeKelas} sudah benar`);
        }
      }
    }

    console.log(`\n✅ Selesai! ${updated} kelas diupdate.`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

updateClassroomNames();
