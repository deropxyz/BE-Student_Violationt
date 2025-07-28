const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get all tindakan otomatis
const getAllTindakanOtomatis = async (req, res) => {
  try {
    const tindakan = await prisma.tindakanOtomatis.findMany({
      orderBy: { minPoint: "asc" },
    });
    res.json(tindakan);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil data tindakan otomatis" });
  }
};

// Create new tindakan otomatis
const createTindakanOtomatis = async (req, res) => {
  const { minPoint, maxPoint, namaTindakan, deskripsi } = req.body;
  try {
    const tindakan = await prisma.tindakanOtomatis.create({
      data: {
        minPoint: parseInt(minPoint),
        maxPoint: maxPoint ? parseInt(maxPoint) : null,
        namaTindakan,
        deskripsi,
      },
    });
    res.status(201).json(tindakan);
  } catch (err) {
    res.status(500).json({ error: "Gagal menambah tindakan otomatis" });
  }
};

// Update tindakan otomatis
const updateTindakanOtomatis = async (req, res) => {
  const { id } = req.params;
  const { minPoint, maxPoint, namaTindakan, deskripsi, isActive } = req.body;
  try {
    const tindakan = await prisma.tindakanOtomatis.update({
      where: { id: parseInt(id) },
      data: {
        minPoint: minPoint ? parseInt(minPoint) : undefined,
        maxPoint: maxPoint ? parseInt(maxPoint) : undefined,
        namaTindakan,
        deskripsi,
        isActive,
      },
    });
    res.json(tindakan);
  } catch (err) {
    res.status(500).json({ error: "Gagal update tindakan otomatis" });
  }
};

// Delete tindakan otomatis
const deleteTindakanOtomatis = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.tindakanOtomatis.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Tindakan otomatis berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ error: "Gagal hapus tindakan otomatis" });
  }
};

module.exports = {
  getAllTindakanOtomatis,
  createTindakanOtomatis,
  updateTindakanOtomatis,
  deleteTindakanOtomatis,
};
