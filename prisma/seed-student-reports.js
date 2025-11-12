// Mengimpor PrismaClient
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Fungsi ini digunakan untuk mengisi (seed) databas    // PENINGKATAN: Mengambil rangkuman poin siswa dengan cara yang jauh lebih efisien.
    // Menggunakan `groupBy` untuk menghitung total poin langsung di database,
    // menghindari masalah N+1 query (query berulang dalam loop).
    console.log("\n👥 Ringkuman Poin Siswa:");
    const studentPoints = await prisma.studentReport.groupBy({
      by: ["studentId"],
      _sum: {
        pointSaat: true,
      },
      _count: {
        _all: true,
      },
    }); contoh
 * untuk laporan siswa (StudentReport).
 */
async function seedStudentReports() {
  // PERBAIKAN: Baris ini sebelumnya rusak secara sintaksis.
  // Sekarang dipisahkan menjadi console.log yang valid.
  console.log("🌱 Memulai proses seeding data laporan siswa...");

  try {
    // 1. Mengambil semua data yang diperlukan dari database secara paralel
    const [students, teachers, reportItems, academicYears] = await Promise.all([
      prisma.student.findMany({ include: { user: true } }),
      prisma.teacher.findMany({ include: { user: true } }),
      prisma.reportItem.findMany(),
      prisma.tahunAjaran.findMany(),
    ]);

    // 2. Validasi dependensi data
    if (
      students.length === 0 ||
      teachers.length === 0 ||
      reportItems.length === 0 ||
      academicYears.length === 0
    ) {
      console.error(
        "❌ Data siswa, guru, item laporan, atau tahun ajaran tidak ditemukan. Harap jalankan seeder lain terlebih dahulu."
      );
      return; // Menghentikan eksekusi jika data tidak ada
    }

    console.log(
      `📊 Data ditemukan: ${students.length} siswa, ${teachers.length} guru, ${reportItems.length} item laporan, ${academicYears.length} tahun ajaran.`
    );

    // 3. Menyiapkan data yang akan digunakan
    const activeAcademicYear =
      academicYears.find((ay) => ay.isActive) || academicYears[0];

    // PENINGKATAN: Menggunakan Map untuk pencarian item laporan yang lebih cepat (O(1))
    // daripada menggunakan .find() berulang kali di dalam array (O(n)).
    const reportItemsByName = new Map(
      reportItems.map((item) => [item.nama, item])
    );

    // 4. Mendefinisikan data contoh laporan
    const sampleReportsData = [
      // Laporan untuk siswa pertama
      {
        studentId: students[0].id,
        reporterId: teachers[0].user.id,
        reportItemName: "Terlambat datang ke sekolah",
        // PERBAIKAN: Menggunakan 'deskripsi' agar konsisten dengan kemungkinan nama kolom di schema
        deskripsi: "Terlambat 15 menit tanpa keterangan yang jelas.",
        tanggal: new Date("2024-09-01"),
      },
      {
        studentId: students[0].id,
        reporterId: teachers[0].user.id,
        reportItemName: "Juara 1 kelas",
        deskripsi: "Juara 1 kelas pada ujian tengah semester.",
        tanggal: new Date("2024-09-15"),
      },
      {
        studentId: students[0].id,
        // PENINGKATAN: Logika fallback jika guru kedua tidak ada
        reporterId: teachers[1]?.user.id || teachers[0].user.id,
        reportItemName: "Tidak mengerjakan tugas",
        deskripsi: "Tidak mengerjakan tugas mata pelajaran Matematika.",
        tanggal: new Date("2024-09-20"),
      },
    ];

    // Menambahkan data jika ada lebih dari 1 siswa
    if (students.length > 1) {
      sampleReportsData.push(
        {
          studentId: students[1].id,
          reporterId: teachers[0].user.id,
          reportItemName: "Kehadiran sempurna (1 semester)",
          deskripsi: "Kehadiran 100% selama satu semester penuh.",
          tanggal: new Date("2024-09-30"),
        },
        {
          studentId: students[1].id,
          reporterId: teachers[0].user.id,
          reportItemName: "Menggunakan HP saat pembelajaran",
          deskripsi: "Menggunakan HP saat pelajaran berlangsung.",
          tanggal: new Date("2024-09-25"),
        }
      );
    }

    // Menambahkan data jika ada lebih dari 2 siswa
    if (students.length > 2) {
      sampleReportsData.push(
        {
          studentId: students[2].id,
          reporterId: teachers[0].user.id,
          reportItemName: "Juara 1 LKS tingkat sekolah",
          deskripsi: "Juara 1 Lomba Kompetensi Siswa bidang Multimedia.",
          tanggal: new Date("2024-10-01"),
        },
        {
          studentId: students[2].id,
          reporterId: teachers[0].user.id,
          reportItemName: "Ketua kelas",
          deskripsi: "Terpilih menjadi ketua kelas periode 2024/2025.",
          tanggal: new Date("2024-08-15"),
        }
      );
    }

    // 5. Memfilter dan memetakan data laporan yang valid untuk dibuat
    const reportsToCreate = sampleReportsData
      .map((report) => {
        const reportItem = reportItemsByName.get(report.reportItemName);
        // Jika item laporan tidak ditemukan, kembalikan null
        if (!reportItem) {
          console.warn(
            `⚠️ Item laporan "${report.reportItemName}" tidak ditemukan, data dilewati.`
          );
          return null;
        }
        // Jika ditemukan, siapkan data lengkap untuk dimasukkan ke database
        return {
          studentId: report.studentId,
          reporterId: report.reporterId,
          itemId: reportItem.id,
          deskripsi: report.deskripsi,
          tanggal: report.tanggal,
          tahunAjaranId: activeAcademicYear.id,
          pointSaat: reportItem.point, // Field yang benar di schema
        };
      })
      .filter(Boolean); // Menghapus semua entri null dari array

    console.log(
      `📝 Akan membuat ${reportsToCreate.length} data laporan baru...`
    );

    // 6. Membuat semua laporan dalam satu transaksi untuk efisiensi
    await prisma.studentReport.createMany({
      data: reportsToCreate,
      skipDuplicates: true, // Melewatkan jika ada data duplikat (opsional)
    });

    console.log("✅ Data laporan siswa berhasil dibuat!");

    // 7. Menampilkan ringkasan hasil seeding
    const totalReports = await prisma.studentReport.count();
    const pelanggaranCount = await prisma.studentReport.count({
      where: {
        item: {
          tipe: "pelanggaran",
        },
      },
    });
    const prestasiCount = await prisma.studentReport.count({
      where: {
        item: {
          tipe: "prestasi",
        },
      },
    });

    console.log("\n📊 Ringkasan Laporan:");
    console.log(`- Total Laporan: ${totalReports}`);
    console.log(`- Laporan Pelanggaran: ${pelanggaranCount}`);
    console.log(`- Laporan Prestasi: ${prestasiCount}`);

    // PENINGKATAN: Mengambil rangkuman poin siswa dengan cara yang jauh lebih efisien.
    // Menggunakan `groupBy` untuk menghitung total poin langsung di database,
    // menghindari masalah N+1 query (query berulang dalam loop).
    console.log("\n👥 Ringkasan Poin Siswa:");
    const studentPoints = await prisma.studentReport.groupBy({
      by: ["studentId"],
      _sum: {
        point: true,
      },
      _count: {
        _all: true,
      },
    });

    // Membuat map untuk mencari nama siswa berdasarkan ID
    const studentIdToNameMap = new Map(
      students.map((s) => [s.id, s.user.name])
    );

    for (const summary of studentPoints) {
      const studentName =
        studentIdToNameMap.get(summary.studentId) || "Siswa tidak dikenal";
      console.log(
        `- ${studentName}: ${summary._sum.pointSaat} poin (${summary._count._all} laporan)`
      );
    }
  } catch (error) {
    console.error(
      "❌ Terjadi kesalahan saat seeding data laporan siswa:",
      error
    );
    // Melemparkan error agar proses utama tahu bahwa seeding gagal
    throw error;
  }
}

// Fungsi utama untuk menjalankan seeder
async function main() {
  try {
    await seedStudentReports();
  } catch (error) {
    console.error("❌ Proses seeding gagal secara keseluruhan.");
    process.exit(1);
  } finally {
    // Memastikan koneksi ke database selalu ditutup
    await prisma.$disconnect();
    console.log("🔌 Koneksi database ditutup.");
  }
}

// Menjalankan fungsi `main` jika file ini dieksekusi langsung
if (require.main === module) {
  main();
}

// Mengekspor fungsi seeder agar bisa digunakan di file lain jika perlu
module.exports = { seedStudentReports };
