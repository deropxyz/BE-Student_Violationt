const cron = require("node-cron");
const { PrismaClient } = require("@prisma/client");
const {
  checkAndTriggerSuratPeringatan,
} = require("./src/controllers/bk/automasi.controller");
const { exec } = require("child_process");

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
//("* * * * *") untuk setiap menit
// Jadwalkan setiap jam
cron.schedule("0 * * * *", () => {
  console.log("[CRON] Menjalankan pengecekan surat peringatan otomatis...");
  triggerSuratPeringatanSemuaSiswa();
});

// Jadwalkan penghapusan data siswa lama setiap hari jam 01:00
cron.schedule("0 1 * * *", () => {
  console.log("[CRON] Menjalankan penghapusan data siswa lama...");
  exec("node automasi-delete-old-students.js", (error, stdout, stderr) => {
    if (error) {
      console.error(`[CRON] Error hapus siswa lama: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`[CRON] Stderr hapus siswa lama: ${stderr}`);
    }
    console.log(`[CRON] Output hapus siswa lama: ${stdout}`);
  });
});
