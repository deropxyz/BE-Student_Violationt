const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const JWT_SECRET = process.env.JWT_SECRET;
const prisma = new PrismaClient();

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Token tidak ditemukan atau format salah" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // berisi { id, role }
    next();
  } catch (err) {
    return res.status(403).json({ message: "Token tidak valid" });
  }
};

// Optional: middleware pembatasan role
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Akses ditolak. Role tidak diizinkan." });
    }
    next();
  };
};

const isSuperadmin = (req, res, next) => {
  if (req.user?.role !== "superadmin") {
    return res
      .status(403)
      .json({ message: "Akses ditolak. Hanya untuk superadmin." });
  }
  next();
};

// Middleware: cek apakah user (guru/bk) adalah wali kelas
const isWalikelas = async (req, res, next) => {
  try {
    if (!req.user || (req.user.role !== "guru" && req.user.role !== "bk")) {
      return res.status(403).json({
        message: "Akses ditolak. Hanya untuk wali kelas (guru/bk).",
      });
    }
    // Cari teacher berdasarkan userId
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.id },
    });
    if (!teacher) {
      return res
        .status(403)
        .json({ message: "Akses ditolak. Anda bukan wali kelas." });
    }
    // Cek apakah ada classroom yang waliKelasId = teacher.id
    const classroom = await prisma.classroom.findFirst({
      where: { waliKelasId: teacher.id },
    });
    if (!classroom) {
      return res
        .status(403)
        .json({ message: "Akses ditolak. Anda bukan wali kelas." });
    }
    req.teacher = teacher;
    req.classroomWali = classroom;
    next();
  } catch (err) {
    console.error("isWalikelas middleware error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const isBKOrWalikelas = async (req, res, next) => {
  if (req.user.role === "bk" || req.user.role === "superadmin") {
    return next();
  }
  if (req.user.role === "guru") {
    // cek wali kelas seperti isWalikelas
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.id },
    });
    if (!teacher) {
      return res
        .status(403)
        .json({ message: "Akses ditolak. Anda bukan wali kelas." });
    }
    const classroom = await prisma.classroom.findFirst({
      where: { waliKelasId: teacher.id },
    });
    if (!classroom) {
      return res
        .status(403)
        .json({ message: "Akses ditolak. Anda bukan wali kelas." });
    }
    req.teacher = teacher;
    req.classroomWali = classroom;
    return next();
  }
  return res.status(403).json({ message: "Akses ditolak." });
};

module.exports = {
  authenticate,
  requireRole,
  isSuperadmin,
  isWalikelas,
  isBKOrWalikelas,
};
