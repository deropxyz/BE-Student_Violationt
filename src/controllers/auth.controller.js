const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const login = async (req, res) => {
  const { email, nis, password } = req.body;

  try {
    let user;

    // Login guru, bk, superadmin pakai email
    if (email) {
      user = await prisma.user.findUnique({ where: { email } });
      if (!user)
        return res.status(404).json({ message: "Email tidak ditemukan" });
    }

    // Login siswa pakai NIS
    if (nis) {
      const student = await prisma.student.findUnique({
        where: { nis },
        include: { user: true },
      });
      if (!student)
        return res.status(404).json({ message: "NIS tidak ditemukan" });
      user = student.user;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Password salah" });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Login gagal" });
  }
};

module.exports = { login };
