const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkKajur() {
  try {
    const teachers = await prisma.teacher.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        jurusan: { select: { id: true, kodeJurusan: true, namaJurusan: true } },
        classrooms: {
          select: {
            id: true,
            namaKelas: true,
            jurusan: { select: { kodeJurusan: true, namaJurusan: true } },
          },
        },
      },
    });

    console.log("=== Data Guru dan Tugasnya ===");
    teachers.forEach((teacher) => {
      console.log(
        `\nGuru: ${teacher.user.name} (email: ${teacher.user.email})`
      );

      if (teacher.jurusan) {
        console.log(
          `  - Kajur: ${teacher.jurusan.kodeJurusan} - ${teacher.jurusan.namaJurusan}`
        );
      }

      if (teacher.classrooms.length > 0) {
        console.log("  - Wali Kelas:");
        teacher.classrooms.forEach((classroom) => {
          console.log(
            `    * ${classroom.namaKelas} (${classroom.jurusan.kodeJurusan})`
          );
        });
      }

      if (!teacher.jurusan && teacher.classrooms.length === 0) {
        console.log("  - Belum diberi tugas");
      }
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkKajur();
