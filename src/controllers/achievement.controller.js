const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Ambil semua data prestasi
const getAllAchievements = async (req, res) => {
  try {
    const achievements = await prisma.achievement.findMany({
      orderBy: [
        {
          kategori: "asc",
        },
        {
          point: "asc",
        },
      ],
    });
    res.json(achievements);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil data prestasi" });
  }
};

// Ambil detail prestasi
const getAchievementDetail = async (req, res) => {
  const { id } = req.params;
  try {
    const achievement = await prisma.achievement.findUnique({
      where: { id: parseInt(id) },
    });
    if (!achievement)
      return res.status(404).json({ error: "Prestasi tidak ditemukan" });
    res.json(achievement);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil detail prestasi" });
  }
};

// Tambah prestasi
const createAchievement = async (req, res) => {
  const { nama, kategori, point } = req.body;
  try {
    const achievement = await prisma.achievement.create({
      data: {
        nama,
        kategori,
        point: parseInt(point),
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
  const { nama, kategori, point } = req.body;
  try {
    const achievement = await prisma.achievement.update({
      where: { id: parseInt(id) },
      data: {
        nama,
        kategori,
        point: point ? parseInt(point) : undefined,
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
    await prisma.achievement.delete({ where: { id: parseInt(id) } });
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
