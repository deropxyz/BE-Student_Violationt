const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Ambil semua kelas
const getAllClassroom = async (req, res) => {
  try {
    const classrooms = await prisma.classroom.findMany({
      include: {
        students: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
    });
    res.json(classrooms);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil data kelas", error });
  }
};

// Tambah kelas baru
const createClassroom = async (req, res) => {
  const { name, batchYear } = req.body;
  try {
    const newClassroom = await prisma.classroom.create({
      data: { name, batchYear },
    });
    res.status(201).json(newClassroom);
  } catch (error) {
    res.status(500).json({ message: "Gagal menambahkan kelas", error });
  }
};

// Update kelas
const updateClassroom = async (req, res) => {
  const { id } = req.params;
  const { name, batchYear } = req.body;
  try {
    const updated = await prisma.classroom.update({
      where: { id: parseInt(id) },
      data: { name, batchYear },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengupdate kelas", error });
  }
};

// Hapus kelas
const deleteClassroom = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.classroom.delete({
      where: { id: parseInt(id) },
    });
    res.json({ message: "Kelas berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ message: "Gagal menghapus kelas", error });
  }
};

// Assign satu siswa ke kelas
const assignStudentToClass = async (req, res) => {
  const { classroomId, studentId } = req.params;

  try {
    const updatedStudent = await prisma.student.update({
      where: { id: parseInt(studentId) },
      data: {
        classroom: {
          connect: { id: parseInt(classroomId) },
        },
      },
    });

    res.json({ message: "Siswa berhasil dipindahkan", updatedStudent });
  } catch (error) {
    res.status(500).json({ message: "Gagal memindahkan siswa", error });
  }
};

// Lihat semua siswa dalam kelas
const getStudentsInClass = async (req, res) => {
  const { id } = req.params;

  try {
    const students = await prisma.student.findMany({
      where: { classroomId: parseInt(id) },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    res.json(students);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil data siswa", error });
  }
};

// Pindahkan semua siswa ke kelas baru
const moveStudentsToNewClass = async (req, res) => {
  const { fromClassId, toClassId } = req.body;

  try {
    const updated = await prisma.student.updateMany({
      where: { classroomId: parseInt(fromClassId) },
      data: { classroomId: parseInt(toClassId) },
    });

    res.json({ message: `${updated.count} siswa berhasil dipindahkan` });
  } catch (error) {
    res.status(500).json({ message: "Gagal memindahkan siswa", error });
  }
};

module.exports = {
  getAllClassroom,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  assignStudentToClass,
  getStudentsInClass,
  moveStudentsToNewClass,
};
