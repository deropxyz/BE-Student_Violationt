const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getAllSiswa = async (req, res) => {
  const { classroomId } = req.query;
  const filter = classroomId ? { classroomId: parseInt(classroomId) } : {};
  const siswa = await prisma.student.findMany({
    where: filter,
    include: { user: true, classroom: true },
  });
  res.json(siswa);
};

const createSiswa = async (req, res) => {
  const { nis, name, email, password, classroomId } = req.body;
  try {
    const user = await prisma.user.create({
      data: { name, email, password, role: "siswa" },
    });
    const student = await prisma.student.create({
      data: {
        userId: user.id,
        nis,
        class: "",
        classroomId: parseInt(classroomId),
      },
    });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: "Gagal menambah siswa" });
  }
};

const updateSiswa = async (req, res) => {
  const { id } = req.params;
  const { nis, name, classroomId } = req.body;
  try {
    const student = await prisma.student.update({
      where: { id: parseInt(id) },
      data: {
        nis,
        classroomId: parseInt(classroomId),
      },
    });
    // Update nama user jika ada
    if (name) {
      await prisma.user.update({
        where: { id: student.userId },
        data: { name },
      });
    }
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: "Gagal update siswa" });
  }
};

const deleteSiswa = async (req, res) => {
  const { id } = req.params;
  try {
    const student = await prisma.student.delete({
      where: { id: parseInt(id) },
    });
    // Hapus user juga jika perlu
    await prisma.user.delete({ where: { id: student.userId } });
    res.json({ message: "Siswa dihapus" });
  } catch (err) {
    res.status(500).json({ error: "Gagal hapus siswa" });
  }
};

module.exports = {
  getAllSiswa,
  createSiswa,
  updateSiswa,
  deleteSiswa,
};
