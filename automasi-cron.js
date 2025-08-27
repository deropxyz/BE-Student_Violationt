const cron = require("node-cron");
const { PrismaClient } = require("@prisma/client");
const {
  checkAndTriggerSuratPeringatan,
} = require("./src/controllers/bk/automasi.controller");

const prisma = new PrismaClient();

// Fungsi untuk trigger surat peringatan untuk semua siswa setiap jam
async function triggerSuratPeringatanSemuaSiswa() {
  try {
    const students = await prisma.student.findMany();
    // Import rekapTotalScoreStudent dari report.controller
    const {
      rekapTotalScoreStudent,
    } = require("./src/controllers/Master/report.controller");
    for (const student of students) {
      // Rekap total score siswa berdasarkan tahun ajaran aktif
      const newTotalScore = await rekapTotalScoreStudent(student.id);
      // Jalankan pengecekan trigger surat
      await checkAndTriggerSuratPeringatan(student.id, newTotalScore);
    }
    console.log(
      "[CRON] Rekap dan pengecekan surat peringatan otomatis selesai"
    );
  } catch (err) {
    console.error("[CRON] Error rekap/pengecekan surat peringatan:", err);
  }
}

// Jadwalkan setiap jam
cron.schedule("0 * * * *", () => {
  console.log("[CRON] Menjalankan pengecekan surat peringatan otomatis...");
  triggerSuratPeringatanSemuaSiswa();
});
