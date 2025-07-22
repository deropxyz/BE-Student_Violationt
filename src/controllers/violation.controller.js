const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Ambil semua data pelanggaran
const getAllViolations = async (req, res) => {
  try {
    const violations = await prisma.violation.findMany();
    res.json(violations);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil data pelanggaran" });
  }
};

// Ambil detail pelanggaran
const getViolationDetail = async (req, res) => {
  const { id } = req.params;
  try {
    const violation = await prisma.violation.findUnique({
      where: { id: parseInt(id) },
    });
    if (!violation)
      return res.status(404).json({ error: "Pelanggaran tidak ditemukan" });
    res.json(violation);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil detail pelanggaran" });
  }
};

// Tambah pelanggaran
const createViolation = async (req, res) => {
  const { name, category, point } = req.body;
  try {
    const violation = await prisma.violation.create({
      data: { name, category, point },
    });
    res.status(201).json(violation);
  } catch (err) {
    res.status(500).json({ error: "Gagal menambah pelanggaran" });
  }
};

// Update pelanggaran
const updateViolation = async (req, res) => {
  const { id } = req.params;
  const { name, category, point } = req.body;
  try {
    const violation = await prisma.violation.update({
      where: { id: parseInt(id) },
      data: { name, category, point },
    });
    res.json(violation);
  } catch (err) {
    res.status(500).json({ error: "Gagal update pelanggaran" });
  }
};

// Hapus pelanggaran
const deleteViolation = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.violation.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Pelanggaran berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ error: "Gagal hapus pelanggaran" });
  }
};

module.exports = {
  getAllViolations,
  getViolationDetail,
  createViolation,
  updateViolation,
  deleteViolation,
};
