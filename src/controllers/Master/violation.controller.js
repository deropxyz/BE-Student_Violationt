const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Ambil semua data pelanggaran
const getAllViolations = async (req, res) => {
  try {
    const violations = await prisma.reportItem.findMany({
      where: { tipe: "pelanggaran" },
      include: { kategori: true },
      orderBy: [
        {
          kategoriId: "asc",
        },
        {
          point: "asc",
        },
      ],
    });
    res.json(violations);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil data pelanggaran" });
  }
};

// Ambil detail pelanggaran
const getViolationDetail = async (req, res) => {
  const { id } = req.params;
  try {
    const violation = await prisma.reportItem.findUnique({
      where: { id: parseInt(id) },
      include: { kategori: true },
    });
    if (!violation || violation.tipe !== "pelanggaran")
      return res.status(404).json({ error: "Pelanggaran tidak ditemukan" });
    res.json(violation);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil detail pelanggaran" });
  }
};

// Tambah pelanggaran
const createViolation = async (req, res) => {
  const { nama, kategoriId, point, isActive, jenis } = req.body;
  try {
    const violation = await prisma.reportItem.create({
      data: {
        nama,
        tipe: "pelanggaran",
        kategoriId: parseInt(kategoriId),
        point: parseInt(point),
        isActive: isActive !== undefined ? isActive : true,
        jenis: jenis || null,
      },
    });
    res.status(201).json(violation);
  } catch (err) {
    res.status(500).json({ error: "Gagal menambah pelanggaran" });
  }
};

// Update pelanggaran
const updateViolation = async (req, res) => {
  const { id } = req.params;
  const { nama, kategoriId, jenis, point, isActive } = req.body;
  try {
    const violation = await prisma.reportItem.update({
      where: { id: parseInt(id) },
      data: {
        nama,
        kategoriId: kategoriId ? parseInt(kategoriId) : undefined,
        point: point !== undefined ? parseInt(point) : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        jenis: jenis !== undefined ? jenis : undefined,
      },
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
    await prisma.reportItem.delete({ where: { id: parseInt(id) } });
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
