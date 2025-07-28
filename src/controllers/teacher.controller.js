// src/controllers/teacher.controller.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

const getAllTeachers = async (req, res) => {
  const teachers = await prisma.teacher.findMany({
    include: {
      user: true,
      classrooms: true,
    },
    orderBy: { user: { name: "asc" } },
  });
  res.json(teachers);
};

const createTeacher = async (req, res) => {
  const { name, email, nip, noHp, alamat } = req.body;
  // Validasi email unik
  const emailExist = await prisma.user.findUnique({ where: { email } });
  if (emailExist) {
    return res.status(400).json({ error: "Email sudah digunakan" });
  }

  // Validasi NIP unik
  const nipExist = await prisma.teacher.findUnique({ where: { nip } });
  if (nipExist) {
    return res.status(400).json({ error: "NIP sudah digunakan" });
  }

  const defaultPassword = "smkn14@garut";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "guru",
      },
    });

    const teacher = await prisma.teacher.create({
      data: {
        userId: user.id,
        nip,
        noHp,
        alamat,
      },
    });

    res.status(201).json({ user, teacher });
  } catch (err) {
    res.status(500).json({ error: "Gagal menambah guru" });
  }
};

const updateTeacher = async (req, res) => {
  const { id } = req.params;
  const { name, email, nip, noHp, alamat } = req.body;
  try {
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

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { name, email },
    });

    // Update teacher data
    const teacher = await prisma.teacher.findUnique({
      where: { userId: parseInt(id) },
    });

    if (teacher) {
      await prisma.teacher.update({
        where: { id: teacher.id },
        data: { nip, noHp, alamat },
      });
    }

    res.json({ message: "Guru berhasil diupdate", user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: "Gagal update guru" });
  }
};

const deleteTeacher = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Guru berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ error: "Gagal hapus guru" });
  }
};

// Ambil detail guru berdasarkan ID
const getTeacherDetail = async (req, res) => {
  const { id } = req.params;
  try {
    const teacher = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });
    if (!teacher || teacher.role !== "guru")
      return res.status(404).json({ error: "Guru tidak ditemukan" });
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil detail guru" });
  }
};

// Pencarian guru berdasarkan nama atau email
const searchTeacher = async (req, res) => {
  const { q } = req.query;
  try {
    const teachers = await prisma.user.findMany({
      where: {
        role: "guru",
        OR: [
          { name: { contains: q || "", mode: "insensitive" } },
          { email: { contains: q || "", mode: "insensitive" } },
        ],
      },
    });
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ error: "Gagal mencari guru" });
  }
};

// Reset password guru
const resetTeacherPassword = async (req, res) => {
  const { id } = req.params;
  try {
    const defaultPassword = "smkn14@garut";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { password: hashedPassword },
    });
    res.json({
      message: "Password guru berhasil direset ke default",
      defaultPassword,
    });
  } catch (err) {
    res.status(500).json({ error: "Gagal reset password guru" });
  }
};

module.exports = {
  getAllTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getTeacherDetail,
  searchTeacher,
  resetTeacherPassword,
};
