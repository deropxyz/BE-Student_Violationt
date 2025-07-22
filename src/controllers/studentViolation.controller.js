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
  const { studentId, violationId, description, evidenceUrl } = req.body;
  try {
    const report = await prisma.studentViolation.create({
      data: {
        studentId: parseInt(studentId),
        violationId: parseInt(violationId),
        reporterId: req.user.id,
        description,
        evidenceUrl,
        status: "pending",
      },
    });
    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ error: "Gagal input pelanggaran siswa" });
  }
};

// Update laporan pelanggaran siswa
const updateStudentViolation = async (req, res) => {
  const { id } = req.params;
  const { status, description, evidenceUrl } = req.body;
  try {
    const violation = await prisma.studentViolation.update({
      where: { id: parseInt(id) },
      data: { status, description, evidenceUrl },
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

const approveStudentViolation = async (req, res) => {
  const { id } = req.params;
  try {
    const violation = await prisma.studentViolation.update({
      where: { id: parseInt(id) },
      data: { status: "approved" },
    });
    res.json({ message: "Pelanggaran disetujui", violation });
  } catch (err) {
    res.status(500).json({ error: "Gagal approval pelanggaran" });
  }
};

const rejectStudentViolation = async (req, res) => {
  const { id } = req.params;
  try {
    const violation = await prisma.studentViolation.update({
      where: { id: parseInt(id) },
      data: { status: "rejected" },
    });
    res.json({ message: "Pelanggaran ditolak", violation });
  } catch (err) {
    res.status(500).json({ error: "Gagal reject pelanggaran" });
  }
};

module.exports = {
  getAllStudentViolations,
  getStudentViolationDetail,
  createStudentViolation,
  updateStudentViolation,
  deleteStudentViolation,
  approveStudentViolation,
  rejectStudentViolation,
};
