const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");

const getAllUsers = async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
  });
  res.json(users);
};

const createUser = async (req, res) => {
  const { name, email, password, role } = req.body;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    return res.status(400).json({ message: "Email sudah digunakan" });

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role },
  });
  res.status(201).json({ message: "User berhasil dibuat", user });
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, role } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: { name, role },
  });
  res.json({ message: "User berhasil diupdate", user });
};

const deleteUser = async (req, res) => {
  const { id } = req.params;
  await prisma.user.delete({ where: { id } });
  res.json({ message: "User berhasil dihapus" });
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
};
