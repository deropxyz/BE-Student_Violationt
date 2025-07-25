// src/controllers/teacher.controller.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

const getAllTeachers = async (req, res) => {
  const teachers = await prisma.user.findMany({
    where: { role: "guru" },
  });
  res.json(teachers);
};

const createTeacher = async (req, res) => {
  const { name, email } = req.body;
  // Validasi email unik
  const emailExist = await prisma.user.findUnique({ where: { email } });
  if (emailExist) {
    return res.status(400).json({ error: "Email sudah digunakan" });
  }
  const defaultPassword = "smkn14@garut";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);
  const newTeacher = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "guru",
    },
  });
  res.status(201).json(newTeacher);
};

const updateTeacher = async (req, res) => {
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

const deleteTeacher = async (req, res) => {
  const { id } = req.params;
  await prisma.user.delete({ where: { id } });
  res.json({ message: "Guru berhasil dihapus" });
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
  const { password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { password: hashedPassword },
    });
    res.json({ message: "Password guru berhasil direset" });
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
