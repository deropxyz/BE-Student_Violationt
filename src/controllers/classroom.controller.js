const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Ambil semua kelas
const getAllClassroom = async (req, res) => {
  try {
    const classrooms = await prisma.classroom.findMany({
      include: {
        waliKelas: {
          include: {
            user: true,
          },
        },
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
  const { kodeKelas, namaKelas, waliKelasId } = req.body;
  try {
    // Validasi: Cek apakah guru sudah menjadi wali kelas di kelas lain
    if (waliKelasId) {
      const existingWaliKelas = await prisma.classroom.findFirst({
        where: { waliKelasId: parseInt(waliKelasId) },
      });

      if (existingWaliKelas) {
        return res.status(400).json({
          message: "Guru sudah menjadi wali kelas di kelas lain",
          error: "Satu guru hanya bisa menjadi wali kelas untuk satu kelas",
        });
      }
    }

    // Validasi: Cek apakah kode kelas sudah ada
    const existingKodeKelas = await prisma.classroom.findFirst({
      where: { kodeKelas },
    });

    if (existingKodeKelas) {
      return res.status(400).json({
        message: "Kode kelas sudah digunakan",
        error: "Silakan gunakan kode kelas yang berbeda",
      });
    }

    const newClassroom = await prisma.classroom.create({
      data: {
        kodeKelas,
        namaKelas,
        waliKelasId: parseInt(waliKelasId),
      },
    });
    res.status(201).json(newClassroom);
  } catch (error) {
    res.status(500).json({ message: "Gagal menambahkan kelas", error });
  }
};

// Update kelas
const updateClassroom = async (req, res) => {
  const { id } = req.params;
  const { kodeKelas, namaKelas, waliKelasId } = req.body;
  try {
    // Validasi: Cek apakah guru sudah menjadi wali kelas di kelas lain (kecuali kelas yang sedang diupdate)
    if (waliKelasId) {
      const existingWaliKelas = await prisma.classroom.findFirst({
        where: {
          waliKelasId: parseInt(waliKelasId),
          id: { not: parseInt(id) }, // Exclude kelas yang sedang diupdate
        },
      });

      if (existingWaliKelas) {
        return res.status(400).json({
          message: "Guru sudah menjadi wali kelas di kelas lain",
          error: "Satu guru hanya bisa menjadi wali kelas untuk satu kelas",
        });
      }
    }

    // Validasi: Cek apakah kode kelas sudah ada (kecuali kelas yang sedang diupdate)
    if (kodeKelas) {
      const existingKodeKelas = await prisma.classroom.findFirst({
        where: {
          kodeKelas,
          id: { not: parseInt(id) }, // Exclude kelas yang sedang diupdate
        },
      });

      if (existingKodeKelas) {
        return res.status(400).json({
          message: "Kode kelas sudah digunakan",
          error: "Silakan gunakan kode kelas yang berbeda",
        });
      }
    }

    const updated = await prisma.classroom.update({
      where: { id: parseInt(id) },
      data: {
        kodeKelas,
        namaKelas,
        waliKelasId: waliKelasId ? parseInt(waliKelasId) : undefined,
      },
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

// Ambil daftar guru yang belum menjadi wali kelas
const getAvailableTeachers = async (req, res) => {
  try {
    // Ambil semua ID guru yang sudah menjadi wali kelas
    const occupiedTeachers = await prisma.classroom.findMany({
      select: { waliKelasId: true },
      where: { waliKelasId: { not: null } },
    });

    const occupiedTeacherIds = occupiedTeachers.map(
      (classroom) => classroom.waliKelasId
    );

    // Ambil guru yang belum menjadi wali kelas
    const availableTeachers = await prisma.teacher.findMany({
      where: {
        id: { notIn: occupiedTeacherIds },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    res.json(availableTeachers);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Gagal mengambil data guru tersedia", error });
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
  getAvailableTeachers,
};
