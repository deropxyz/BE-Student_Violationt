const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getAllBK = async (req, res) => {
  const bk = await prisma.user.findMany({ where: { role: "bk" } });
  res.json(bk);
};

const createBK = async (req, res) => {
  const { name, email, password } = req.body;
  const user = await prisma.user.create({
    data: { name, email, password, role: "bk" },
  });
  res.status(201).json(user);
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

module.exports = {
  getAllBK,
  createBK,
  updateBK,
  deleteBK,
};
