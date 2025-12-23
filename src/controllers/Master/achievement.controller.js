const { PrismaClient } = require("@prisma/client");
const {
  paginateResponse,
  calculatePagination,
} = require("../../utils/paginationUtils");
const prisma = new PrismaClient();

// Ambil semua data prestasi with pagination
const getAllAchievements = async (req, res) => {
  try {
    const { page = 1, limit = 50, kategoriId, isActive } = req.query;

    const where = { tipe: "prestasi" };
    if (kategoriId) {
      where.kategoriId = parseInt(kategoriId);
    }
    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    const pagination = calculatePagination(page, limit, 0);

    const [achievements, total] = await prisma.$transaction([
      prisma.reportItem.findMany({
        where,
        include: { kategori: true },
        orderBy: [{ kategoriId: "asc" }, { point: "asc" }],
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.reportItem.count({ where }),
    ]);

    res.json(paginateResponse(achievements, page, limit, total));
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil data prestasi" });
  }
};

// Ambil detail prestasi
const getAchievementDetail = async (req, res) => {
  const { id } = req.params;
  try {
    const achievement = await prisma.reportItem.findUnique({
      where: { id: parseInt(id) },
      include: { kategori: true },
    });
    if (!achievement || achievement.tipe !== "prestasi")
      return res.status(404).json({ error: "Prestasi tidak ditemukan" });
    res.json(achievement);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil detail prestasi" });
  }
};

// Tambah prestasi
const createAchievement = async (req, res) => {
  const { nama, kategoriId, point, isActive, jenis } = req.body;
  try {
    const achievement = await prisma.reportItem.create({
      data: {
        nama,
        tipe: "prestasi",
        kategoriId: parseInt(kategoriId),
        point: parseInt(point),
        isActive: isActive !== undefined ? isActive : true,
        jenis: jenis || null,
      },
    });
    res.status(201).json(achievement);
  } catch (err) {
    res.status(500).json({ error: "Gagal menambah prestasi" });
  }
};

// Update prestasi
const updateAchievement = async (req, res) => {
  const { id } = req.params;
  const { nama, kategoriId, point, isActive, jenis } = req.body;
  try {
    const achievement = await prisma.reportItem.update({
      where: { id: parseInt(id) },
      data: {
        nama,
        kategoriId: kategoriId ? parseInt(kategoriId) : undefined,
        point: point !== undefined ? parseInt(point) : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        jenis: jenis !== undefined ? jenis : undefined,
      },
    });
    res.json(achievement);
  } catch (err) {
    res.status(500).json({ error: "Gagal update prestasi" });
  }
};

// Hapus prestasi
const deleteAchievement = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.reportItem.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Prestasi berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ error: "Gagal hapus prestasi" });
  }
};

module.exports = {
  getAllAchievements,
  getAchievementDetail,
  createAchievement,
  updateAchievement,
  deleteAchievement,
};
