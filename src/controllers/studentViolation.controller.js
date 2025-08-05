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

    // Calculate new score (pelanggaran menambah poin)
    const currentScore = student.totalScore;
    const newScore = currentScore + violation.point;

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
      data: { totalScore: newScore },
    });

    // Create score history
    await prisma.scoreHistory.create({
      data: {
        studentId: parseInt(studentId),
        pointLama: currentScore,
        pointBaru: newScore,
        alasan: `Pelanggaran: ${violation.nama}`,
        tanggal: new Date(),
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
  const { violationId, tanggal, waktu, deskripsi, evidenceUrl } = req.body;
  try {
    // Get current violation record
    const currentRecord = await prisma.studentViolation.findUnique({
      where: { id: parseInt(id) },
      include: {
        violation: true,
        student: true,
      },
    });

    if (!currentRecord) {
      return res
        .status(404)
        .json({ error: "Laporan pelanggaran tidak ditemukan" });
    }

    let updatedData = {
      tanggal: tanggal ? new Date(tanggal) : undefined,
      waktu: waktu ? new Date(waktu) : undefined,
      deskripsi,
      evidenceUrl,
    };

    // Jika violationId berubah, perlu recalkulasi skor
    if (violationId && parseInt(violationId) !== currentRecord.violationId) {
      // Get new violation details
      const newViolation = await prisma.violation.findUnique({
        where: { id: parseInt(violationId) },
      });

      if (!newViolation) {
        return res
          .status(404)
          .json({ error: "Pelanggaran baru tidak ditemukan" });
      }

      // Calculate score difference
      const oldPoint = currentRecord.violation.point;
      const newPoint = newViolation.point;
      const pointDifference = newPoint - oldPoint;

      // Update student total score
      const newTotalScore = currentRecord.student.totalScore + pointDifference;
      await prisma.student.update({
        where: { id: currentRecord.studentId },
        data: { totalScore: newTotalScore },
      });

      // Create score history for the change
      await prisma.scoreHistory.create({
        data: {
          studentId: currentRecord.studentId,
          pointLama: currentRecord.student.totalScore,
          pointBaru: newTotalScore,
          alasan: `Update pelanggaran: ${currentRecord.violation.nama} → ${newViolation.nama}`,
          tanggal: new Date(),
        },
      });

      // Add violation update to data
      updatedData.violationId = parseInt(violationId);
      updatedData.pointSaat = newPoint;
    }

    // Update violation record
    const updatedViolation = await prisma.studentViolation.update({
      where: { id: parseInt(id) },
      data: updatedData,
      include: {
        student: { include: { user: true, classroom: true } },
        violation: true,
        reporter: true,
      },
    });

    res.json(updatedViolation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal update laporan pelanggaran siswa" });
  }
};

// Hapus laporan pelanggaran siswa
const deleteStudentViolation = async (req, res) => {
  const { id } = req.params;
  try {
    // Get violation record before deletion
    const violationRecord = await prisma.studentViolation.findUnique({
      where: { id: parseInt(id) },
      include: {
        violation: true,
        student: true,
      },
    });

    if (!violationRecord) {
      return res
        .status(404)
        .json({ error: "Laporan pelanggaran tidak ditemukan" });
    }

    // Calculate new score (subtract violation point)
    const currentScore = violationRecord.student.totalScore;
    const newScore = currentScore - violationRecord.violation.point;

    // Update student total score
    await prisma.student.update({
      where: { id: violationRecord.studentId },
      data: { totalScore: newScore },
    });

    // Create score history
    await prisma.scoreHistory.create({
      data: {
        studentId: violationRecord.studentId,
        pointLama: currentScore,
        pointBaru: newScore,
        alasan: `Hapus pelanggaran: ${violationRecord.violation.nama}`,
        tanggal: new Date(),
      },
    });

    // Delete violation record
    await prisma.studentViolation.delete({ where: { id: parseInt(id) } });

    res.json({
      message: "Laporan pelanggaran siswa berhasil dihapus",
      scoreUpdate: {
        scoreLama: currentScore,
        scoreBaru: newScore,
        pointDikurangi: violationRecord.violation.point,
      },
    });
  } catch (err) {
    console.error(err);
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
