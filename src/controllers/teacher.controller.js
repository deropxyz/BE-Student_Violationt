// src/controllers/teacher.controller.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

const getAllTeachers = async (req, res) => {
  const teachers = await prisma.user.findMany({
    where: { role: "guru" }, // atau TEACHER kalau enum-nya gitu
  });
  res.json(teachers);
};

const createTeacher = async (req, res) => {
  const { name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

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
  const updated = await prisma.user.update({
    where: { id },
    data: { name, email },
  });
  res.json(updated);
};

const deleteTeacher = async (req, res) => {
  const { id } = req.params;
  await prisma.user.delete({ where: { id } });
  res.json({ message: "Guru berhasil dihapus" });
};

module.exports = {
  getAllTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
};
