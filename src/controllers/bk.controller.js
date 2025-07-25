const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getAllBK = async (req, res) => {
  const bk = await prisma.user.findMany({
    where: { role: "bk" },
    orderBy: { name: "asc" },
  });
  res.json(bk);
};

const bcrypt = require("bcrypt");

const createBK = async (req, res) => {
  const { name, email } = req.body;
  // Validasi email unik
  const emailExist = await prisma.user.findUnique({ where: { email } });
  if (emailExist) {
    return res.status(400).json({ error: "Email sudah digunakan" });
  }
  const defaultPassword = "smkn14@garut";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);
  const newBK = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "bk",
    },
  });
  res.status(201).json(newBK);
};

const updateBK = async (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;
  // Validasi email unik jika diupdate
  if (email) {
    const emailExist = await prisma.user.findFirst({
      where: {
        email,
        id: { not: parseInt(id) },
      },
    });
    if (emailExist) {
      return res.status(400).json({ error: "Email sudah digunakan" });
    }
  }
  const updated = await prisma.user.update({
    where: { id: parseInt(id) },
    data: { name, email },
  });
  res.json(updated);
};

const deleteBK = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.json({ message: "BK berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ error: "Gagal hapus BK" });
  }
};

const getBKDetail = async (req, res) => {
  const { id } = req.params;
  try {
    const BK = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });
    if (!BK || BK.role !== "bk")
      return res.status(404).json({ error: "BK tidak ditemukan" });
    res.json(BK);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil detail BK" });
  }
};

// Pencarian BK berdasarkan nama atau email
const searchBK = async (req, res) => {
  const { q } = req.query;
  try {
    const BKs = await prisma.user.findMany({
      where: {
        role: "BK",
        OR: [
          { name: { contains: q || "", mode: "insensitive" } },
          { email: { contains: q || "", mode: "insensitive" } },
        ],
      },
    });
    res.json(BKs);
  } catch (err) {
    res.status(500).json({ error: "Gagal mencari BK" });
  }
};

// Reset password BK
const resetBKPassword = async (req, res) => {
  const { id } = req.params;
  try {
    const defaultPassword = "smkn14@garut";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { password: hashedPassword },
    });
    res.json({
      message: "Password BK berhasil direset ke default",
      defaultPassword,
    });
  } catch (err) {
    res.status(500).json({ error: "Gagal reset password BK" });
  }
};

module.exports = {
  getAllBK,
  createBK,
  updateBK,
  deleteBK,
  getBKDetail,
  searchBK,
  resetBKPassword,
};
