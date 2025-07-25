const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getAllBK = async (req, res) => {
  const bk = await prisma.user.findMany({ where: { role: "bk" } });
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
      role: "BK",
    },
  });
  res.status(201).json(newBK);
};

const updateBK = async (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;
  const updated = await prisma.user.update({
    where: { id },
    data: { name, email },
  });
  res.json(updated);
};

const deleteBK = async (req, res) => {
  const { id } = req.params;
  await prisma.user.delete({ where: { id } });
  res.json({ message: "BK berhasil dihapus" });
};

const getBKDetail = async (req, res) => {
  const { id } = req.params;
  try {
    const BK = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });
    if (!BK || BK.role !== "BK")
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
  const { password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { password: hashedPassword },
    });
    res.json({ message: "Password BK berhasil direset" });
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
