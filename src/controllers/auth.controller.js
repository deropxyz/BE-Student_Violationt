const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const login = async (req, res) => {
  const { email, nisn, password } = req.body;

  try {
    let user;

    // Login guru, bk, superadmin, orangtua pakai email
    if (email) {
      user = await prisma.user.findUnique({ where: { email } });
      if (!user)
        return res.status(404).json({ message: "Email tidak ditemukan" });
    }

    // Login siswa pakai NISN
    if (nisn) {
      const student = await prisma.student.findUnique({
        where: { nisn },
        include: {
          user: true,
          classroom: true,
          angkatan: true,
          orangTua: {
            include: { user: true },
          },
        },
      });
      if (!student)
        return res.status(404).json({ message: "NISN tidak ditemukan" });
      user = student.user;

      // Include student data in response for student login
      if (user.role === "siswa") {
        user.studentData = student;
      }
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Password salah" });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const responseData = {
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        email: user.email,
      },
    };

    // Add student specific data if user is student
    if (user.role === "siswa" && user.studentData) {
      responseData.user.studentId = user.studentData.id;
      responseData.user.nisn = user.studentData.nisn;
      responseData.user.classroom = user.studentData.classroom;
      responseData.user.totalScore = user.studentData.totalScore;
    }

    res.json(responseData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Login gagal" });
  }
};

module.exports = { login };

// Reset password by email (admin or forgot password flow)
const resetPassword = async (req, res) => {
  const { email } = req.body;
  const defaultPassword = process.env.DEFAULT_PASSWORD;
  if (!email) {
    return res.status(400).json({ message: "Email wajib diisi" });
  }
  if (!defaultPassword) {
    return res
      .status(500)
      .json({ message: "DEFAULT_PASSWORD belum diatur di .env" });
  }
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }
    const hashed = await bcrypt.hash(defaultPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hashed },
    });
    res.json({ message: "Password berhasil direset ke default" });
  } catch (err) {
    console.error("Error resetting password:", err);
    res.status(500).json({ message: "Gagal reset password" });
  }
};

module.exports = {
  login,
  resetPassword,
};
