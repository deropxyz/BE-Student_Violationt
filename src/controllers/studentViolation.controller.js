const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Ambil semua laporan pelanggaran siswa
const getAllStudentViolations = async (req, res) => {
  try {
    const violations = await prisma.studentViolation.findMany({
      include: {
        student: { include: { user: true, classroom: true } },
        violation: true,
        reporter: true,
      },
    });
    res.json(violations);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Gagal mengambil data laporan pelanggaran siswa" });
  }
};

// Ambil detail laporan pelanggaran siswa
const getStudentViolationDetail = async (req, res) => {
  const { id } = req.params;
  try {
    const violation = await prisma.studentViolation.findUnique({
      where: { id: parseInt(id) },
      include: {
        student: { include: { user: true, classroom: true } },
        violation: true,
        reporter: true,
      },
    });
    if (!violation)
      return res.status(404).json({ error: "Laporan tidak ditemukan" });
    res.json(violation);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil detail laporan" });
  }
};

// Input laporan pelanggaran siswa
const createStudentViolation = async (req, res) => {
  const { studentId, violationId, tanggal, waktu, deskripsi, evidenceUrl } =
    req.body;
  try {
    // Get violation details untuk point
    const violation = await prisma.violation.findUnique({
      where: { id: parseInt(violationId) },
    });

    if (!violation) {
      return res.status(404).json({ error: "Pelanggaran tidak ditemukan" });
    }

    // Get current student data
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
    });

    if (!student) {
      return res.status(404).json({ error: "Siswa tidak ditemukan" });
    }

    // Calculate new score
    const currentScore = student.totalScore;
    const newScore =
      violation.tipe === "pelanggaran"
        ? currentScore + violation.point
        : currentScore - violation.point;

    // Create violation record
    const report = await prisma.studentViolation.create({
      data: {
        studentId: parseInt(studentId),
        violationId: parseInt(violationId),
        reporterId: req.user.id,
        tanggal: tanggal ? new Date(tanggal) : new Date(),
        waktu: waktu ? new Date(waktu) : null,
        deskripsi,
        evidenceUrl,
        pointSaat: violation.point,
      },
    });

    // Update student total score
    await prisma.student.update({
      where: { id: parseInt(studentId) },
      data: { totalScore: Math.max(0, newScore) }, // Ensure score doesn't go below 0
    });

    // Create score history
    await prisma.scoreHistory.create({
      data: {
        studentId: parseInt(studentId),
        pointLama: currentScore,
        pointBaru: Math.max(0, newScore),
        alasan: `${
          violation.tipe === "pelanggaran" ? "Pelanggaran" : "Prestasi"
        }: ${violation.nama}`,
      },
    });

    res.status(201).json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal input pelanggaran siswa" });
  }
};

// Update laporan pelanggaran siswa
const updateStudentViolation = async (req, res) => {
  const { id } = req.params;
  const { tanggal, waktu, deskripsi, evidenceUrl } = req.body;
  try {
    const violation = await prisma.studentViolation.update({
      where: { id: parseInt(id) },
      data: {
        tanggal: tanggal ? new Date(tanggal) : undefined,
        waktu: waktu ? new Date(waktu) : undefined,
        deskripsi,
        evidenceUrl,
      },
    });
    res.json(violation);
  } catch (err) {
    res.status(500).json({ error: "Gagal update laporan pelanggaran siswa" });
  }
};

// Hapus laporan pelanggaran siswa
const deleteStudentViolation = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.studentViolation.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Laporan pelanggaran siswa berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ error: "Gagal hapus laporan pelanggaran siswa" });
  }
};

module.exports = {
  getAllStudentViolations,
  getStudentViolationDetail,
  createStudentViolation,
  updateStudentViolation,
  deleteStudentViolation,
};
