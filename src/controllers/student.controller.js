const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getAllSiswa = async (req, res) => {
  const siswa = await prisma.user.findMany({ where: { role: "siswa" } });
  res.json(siswa);
};

const createSiswa = async (req, res) => {
  const { nis, name, password } = req.body;
};

const updateSiswa = async (req, res) => {
  const { id } = req.params;
  const { nis, name } = req.body;
  // ...
};

const deleteSiswa = async (req, res) => {
  const { id } = req.params;
  // ...
};

module.exports = {
  getAllSiswa,
  createSiswa,
  updateSiswa,
  deleteSiswa,
};
