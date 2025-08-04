const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Ambil semua laporan prestasi siswa
const getAllStudentAchievements = async (req, res) => {
  try {
    const achievements = await prisma.studentAchievement.findMany({
      include: {
        student: { include: { user: true, classroom: true } },
        achievement: true,
        reporter: true,
      },
      orderBy: { tanggal: "desc" },
    });
    res.json(achievements);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Gagal mengambil data laporan prestasi siswa" });
  }
};

// Ambil detail laporan prestasi siswa
const getStudentAchievementDetail = async (req, res) => {
  const { id } = req.params;
  try {
    const achievement = await prisma.studentAchievement.findUnique({
      where: { id: parseInt(id) },
      include: {
        student: { include: { user: true, classroom: true } },
        achievement: true,
        reporter: true,
      },
    });
    if (!achievement)
      return res
        .status(404)
        .json({ error: "Laporan prestasi tidak ditemukan" });
    res.json(achievement);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil detail laporan prestasi" });
  }
};

// Input laporan prestasi siswa
const createStudentAchievement = async (req, res) => {
  const { studentId, achievementId, tanggal, waktu, deskripsi, evidenceUrl } =
    req.body;
  try {
    // Get achievement details untuk point
    const achievement = await prisma.achievement.findUnique({
      where: { id: parseInt(achievementId) },
    });

    if (!achievement) {
      return res.status(404).json({ error: "Prestasi tidak ditemukan" });
    }

    // Get current student data
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
    });

    if (!student) {
      return res.status(404).json({ error: "Siswa tidak ditemukan" });
    }

    // Calculate new score (prestasi mengurangi poin)
    const currentScore = student.totalScore;
    const newScore = Math.max(0, currentScore - achievement.point); // Prestasi mengurangi poin, tidak boleh negatif

    // Create achievement record
    const report = await prisma.studentAchievement.create({
      data: {
        studentId: parseInt(studentId),
        achievementId: parseInt(achievementId),
        reporterId: req.user.id,
        tanggal: tanggal ? new Date(tanggal) : new Date(),
        waktu: waktu ? new Date(waktu) : null,
        deskripsi,
        evidenceUrl,
        pointSaat: achievement.point,
      },
    });

    // Update student total score
    await prisma.student.update({
      where: { id: parseInt(studentId) },
      data: { totalScore: newScore },
    });

    // Create score history
    await prisma.scoreHistory.create({
      data: {
        studentId: parseInt(studentId),
        pointLama: currentScore,
        pointBaru: newScore,
        alasan: `Prestasi: ${achievement.nama}`,
        tanggal: new Date(),
      },
    });

    res.status(201).json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal menambah laporan prestasi" });
  }
};

// Update laporan prestasi siswa
const updateStudentAchievement = async (req, res) => {
  const { id } = req.params;
  const { tanggal, waktu, deskripsi, evidenceUrl } = req.body;
  try {
    const achievement = await prisma.studentAchievement.update({
      where: { id: parseInt(id) },
      data: {
        tanggal: tanggal ? new Date(tanggal) : undefined,
        waktu: waktu ? new Date(waktu) : undefined,
        deskripsi,
        evidenceUrl,
      },
    });
    res.json(achievement);
  } catch (err) {
    res.status(500).json({ error: "Gagal update laporan prestasi" });
  }
};

// Hapus laporan prestasi siswa
const deleteStudentAchievement = async (req, res) => {
  const { id } = req.params;
  try {
    // Get achievement data before deletion for score recalculation
    const achievementRecord = await prisma.studentAchievement.findUnique({
      where: { id: parseInt(id) },
      include: { student: true, achievement: true },
    });

    if (!achievementRecord) {
      return res
        .status(404)
        .json({ error: "Laporan prestasi tidak ditemukan" });
    }

    // Recalculate score (add back the achievement points)
    const newScore =
      achievementRecord.student.totalScore + achievementRecord.pointSaat;

    // Delete the achievement record
    await prisma.studentAchievement.delete({ where: { id: parseInt(id) } });

    // Update student score
    await prisma.student.update({
      where: { id: achievementRecord.studentId },
      data: { totalScore: newScore },
    });

    // Create score history
    await prisma.scoreHistory.create({
      data: {
        studentId: achievementRecord.studentId,
        pointLama: achievementRecord.student.totalScore,
        pointBaru: newScore,
        alasan: `Hapus Prestasi: ${achievementRecord.achievement.nama}`,
        tanggal: new Date(),
      },
    });

    res.json({ message: "Laporan prestasi berhasil dihapus" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal hapus laporan prestasi" });
  }
};

module.exports = {
  getAllStudentAchievements,
  getStudentAchievementDetail,
  createStudentAchievement,
  updateStudentAchievement,
  deleteStudentAchievement,
};
