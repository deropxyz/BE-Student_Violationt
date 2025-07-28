const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get all angkatan
const getAllAngkatan = async (req, res) => {
  try {
    const angkatan = await prisma.angkatan.findMany({
      include: {
        students: {
          include: {
            user: true,
            classroom: true,
          },
        },
      },
      orderBy: { tahun: "desc" },
    });
    res.json(angkatan);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil data angkatan" });
  }
};

// Create new angkatan
const createAngkatan = async (req, res) => {
  const { tahun, lulusDate } = req.body;
  try {
    const angkatan = await prisma.angkatan.create({
      data: {
        tahun,
        lulusDate: lulusDate ? new Date(lulusDate) : null,
      },
    });
    res.status(201).json(angkatan);
  } catch (err) {
    res.status(500).json({ error: "Gagal menambah angkatan" });
  }
};

// Update angkatan
const updateAngkatan = async (req, res) => {
  const { id } = req.params;
  const { tahun, lulusDate } = req.body;
  try {
    const angkatan = await prisma.angkatan.update({
      where: { id: parseInt(id) },
      data: {
        tahun,
        lulusDate: lulusDate ? new Date(lulusDate) : null,
      },
    });
    res.json(angkatan);
  } catch (err) {
    res.status(500).json({ error: "Gagal update angkatan" });
  }
};

// Delete angkatan
const deleteAngkatan = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.angkatan.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Angkatan berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ error: "Gagal hapus angkatan" });
  }
};

module.exports = {
  getAllAngkatan,
  createAngkatan,
  updateAngkatan,
  deleteAngkatan,
};
