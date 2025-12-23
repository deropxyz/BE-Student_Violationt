const { PrismaClient } = require("@prisma/client");
const {
  paginateResponse,
  calculatePagination,
} = require("../../utils/paginationUtils");
const prisma = new PrismaClient();

// GET all kategori with pagination
const getAllKategori = async (req, res) => {
  try {
    const { page = 1, limit = 50, tipe } = req.query;

    const where = {};
    if (tipe) {
      where.tipe = tipe;
    }

    const pagination = calculatePagination(page, limit, 0);

    const [kategori, total] = await prisma.$transaction([
      prisma.kategori.findMany({
        where,
        include: { items: true },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.kategori.count({ where }),
    ]);

    res.json(paginateResponse(kategori, page, limit, total));
  } catch (error) {
    res.status(500).json({ error: "gagal mengambil data kategori" });
  }
};

// CREATE kategori
const createKategori = async (req, res) => {
  try {
    const { nama, tipe } = req.body;
    const kategori = await prisma.kategori.create({
      data: { nama, tipe },
    });
    res.status(201).json(kategori);
  } catch (error) {
    res.status(400).json({ error: "gagal menambah kategori" });
  }
};

// GET kategori by id
const getKategoriById = async (req, res) => {
  try {
    const { id } = req.params;
    const kategori = await prisma.kategori.findUnique({
      where: { id: Number(id) },
      include: { items: true },
    });
    if (!kategori)
      return res.status(404).json({ error: "Kategori tidak ditemukan" });
    res.json(kategori);
  } catch (error) {
    res.status(500).json({ error: "gagal mengambil data kategori" });
  }
};

// UPDATE kategori
const updateKategori = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, tipe } = req.body;
    const kategori = await prisma.kategori.update({
      where: { id: Number(id) },
      data: { nama, tipe },
    });
    res.json(kategori);
  } catch (error) {
    res.status(400).json({ error: "gagal memperbarui kategori" });
  }
};

// DELETE kategori
const deleteKategori = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.kategori.delete({
      where: { id: Number(id) },
    });
    res.json({ message: "Kategori berhasil dihapus" });
  } catch (error) {
    res.status(400).json({ error: "gagal menghapus kategori" });
  }
};

// GET kategori by tipe (pelanggaran/prestasi)
const getKategoriByTipe = async (req, res) => {
  try {
    const { tipe } = req.params;
    if (!["pelanggaran", "prestasi"].includes(tipe)) {
      return res
        .status(400)
        .json({ error: "Tipe harus pelanggaran atau prestasi" });
    }
    const kategori = await prisma.kategori.findMany({
      where: { tipe },
      include: { items: true },
    });
    res.json(kategori);
  } catch (error) {
    res
      .status(500)
      .json({ error: "gagal mengambil data kategori berdasarkan tipe" });
  }
};

module.exports = {
  createKategori,
  getAllKategori,
  getKategoriById,
  updateKategori,
  deleteKategori,
  getKategoriByTipe,
};
