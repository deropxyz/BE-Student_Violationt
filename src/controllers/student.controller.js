const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const XLSX = require("xlsx");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const getAllSiswa = async (req, res) => {
  // Ambil classroomId dari params jika ada, fallback ke query
  const classroomId = req.params.classroomId || req.query.classroomId;
  let filter = {};
  if (classroomId) {
    filter = { classroomId: parseInt(classroomId) };
  }
  try {
    const siswa = await prisma.student.findMany({
      where: filter,
      include: {
        user: true,
        classroom: true,
        angkatan: true,
        orangTua: { include: { user: true } },
        violations: {
          include: {
            violation: true,
          },
        },
      },
      orderBy: { nisn: "asc" },
    });
    res.json(siswa);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil data siswa" });
  }
};

const createSiswa = async (req, res) => {
  const {
    nisn,
    name,
    gender,
    tempatLahir,
    tglLahir,
    alamat,
    noHp,
    classroomId,
    angkatanId,
    orangTuaId,
  } = req.body;
  const email = `${nisn}@smk14.sch.id`;
  const defaultPassword = "smkn14garut";
  const bcrypt = require("bcrypt");
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);
  try {
    // Cek apakah NISN sudah ada
    const nisnExist = await prisma.student.findUnique({
      where: { nisn },
    });
    if (nisnExist) {
      return res.status(400).json({ error: "NISN sudah ada" });
    }
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: "siswa" },
    });
    const student = await prisma.student.create({
      data: {
        userId: user.id,
        nisn,
        gender,
        tempatLahir,
        tglLahir: new Date(tglLahir),
        alamat,
        noHp,
        classroomId: parseInt(classroomId),
        angkatanId: parseInt(angkatanId),
        orangTuaId: orangTuaId ? parseInt(orangTuaId) : null,
      },
    });
    res.json(student);
  } catch (err) {
    // Handle error unik NISN dari Prisma
    if (err.code === "P2002" && err.meta?.target?.includes("nisn")) {
      return res.status(400).json({ error: "NISN sudah ada" });
    }
    res.status(500).json({ error: "Gagal menambah siswa" });
  }
};

const updateSiswa = async (req, res) => {
  const { id } = req.params;
  const {
    nisn,
    name,
    gender,
    tempatLahir,
    tglLahir,
    alamat,
    noHp,
    classroomId,
    angkatanId,
    orangTuaId,
  } = req.body;
  try {
    const student = await prisma.student.update({
      where: { id: parseInt(id) },
      data: {
        nisn,
        gender,
        tempatLahir,
        tglLahir: tglLahir ? new Date(tglLahir) : undefined,
        alamat,
        noHp,
        classroomId: classroomId ? parseInt(classroomId) : undefined,
        angkatanId: angkatanId ? parseInt(angkatanId) : undefined,
        orangTuaId: orangTuaId ? parseInt(orangTuaId) : null,
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

const importSiswa = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "File tidak ditemukan" });

  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const siswaList = XLSX.utils.sheet_to_json(sheet);

    const bcrypt = require("bcrypt");
    for (const siswa of siswaList) {
      const { nis, name, kelas } = siswa;
      const email = `${nis}@smk14.sch.id`;
      const defaultPassword = "smkn14garut";
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      // Cari kelas berdasarkan nama
      let classroom = await prisma.classroom.findUnique({
        where: { name: kelas },
      });
      // Buat user dan student
      await prisma.user
        .create({
          data: { name, email, password: hashedPassword, role: "siswa" },
        })
        .then(async (user) => {
          await prisma.student.create({
            data: {
              userId: user.id,
              nis,
              class: "",
              classroomId: classroom.id,
            },
          });
        });
    }
    res.json({ message: "Import siswa berhasil" });
  } catch (err) {
    res.status(500).json({ error: "Gagal import siswa" });
  }
};

// Ambil detail satu siswa berdasarkan ID
const getDetailSiswa = async (req, res) => {
  const { id } = req.params;
  try {
    const siswa = await prisma.student.findUnique({
      where: { id: parseInt(id) },
      include: { user: true, classroom: true },
    });
    if (!siswa) return res.status(404).json({ error: "Siswa tidak ditemukan" });
    res.json(siswa);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil detail siswa" });
  }
};

// Pencarian siswa berdasarkan nama atau NIS
const searchSiswa = async (req, res) => {
  const { q } = req.query;
  try {
    const siswa = await prisma.student.findMany({
      where: {
        OR: [
          { nisn: { contains: q || "", mode: "insensitive" } },
          { user: { name: { contains: q || "", mode: "insensitive" } } },
        ],
      },
      include: {
        user: true,
        classroom: true,
        angkatan: true,
        orangTua: { include: { user: true } },
      },
    });
    res.json(siswa);
  } catch (err) {
    res.status(500).json({ error: "Gagal mencari siswa" });
  }
};

// Export data siswa ke Excel
const exportSiswa = async (req, res) => {
  try {
    const siswa = await prisma.student.findMany({
      include: { user: true, classroom: true },
    });
    const data = siswa.map((s) => ({
      Nama: s.user?.name,
      NIS: s.nis,
      Email: s.user?.email,
      Kelas: s.classroom?.name,
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Siswa");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", "attachment; filename=siswa.xlsx");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: "Gagal export data siswa" });
  }
};

// Get profile siswa yang sedang login
const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id; // Dari middleware authentication

    const siswa = await prisma.student.findUnique({
      where: { userId: userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
        classroom: {
          include: {
            waliKelas: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        angkatan: true,
        orangTua: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        violations: {
          include: {
            violation: true,
            reporter: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 5, // Ambil 5 pelanggaran terbaru
        },
        achievements: {
          include: {
            achievement: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 5, // Ambil 5 prestasi terbaru
        },
      },
    });

    if (!siswa) {
      return res.status(404).json({ error: "Data siswa tidak ditemukan" });
    }

    // Hitung statistik
    const totalViolations = await prisma.studentViolation.count({
      where: { studentId: siswa.id },
    });

    const totalAchievements = await prisma.studentAchievement.count({
      where: { studentId: siswa.id },
    });

    // Tambahkan statistik ke response
    const response = {
      ...siswa,
      statistics: {
        totalViolations,
        totalAchievements,
        currentScore: siswa.totalScore,
      },
    };

    res.json(response);
  } catch (err) {
    console.error("Error getting student profile:", err);
    res.status(500).json({ error: "Gagal mengambil profile siswa" });
  }
};

// Get riwayat pelanggaran siswa yang login
const getMyViolations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Cari student berdasarkan userId
    const student = await prisma.student.findUnique({
      where: { userId: userId },
    });

    if (!student) {
      return res.status(404).json({ error: "Data siswa tidak ditemukan" });
    }

    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [violations, total] = await Promise.all([
      prisma.studentViolation.findMany({
        where: { studentId: student.id },
        include: {
          violation: true,
          reporter: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: parseInt(limit),
      }),
      prisma.studentViolation.count({
        where: { studentId: student.id },
      }),
    ]);

    res.json({
      data: violations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Error getting student violations:", err);
    res.status(500).json({ error: "Gagal mengambil riwayat pelanggaran" });
  }
};

// Get riwayat prestasi siswa yang login
const getMyAchievements = async (req, res) => {
  try {
    const userId = req.user.id;

    // Cari student berdasarkan userId
    const student = await prisma.student.findUnique({
      where: { userId: userId },
    });

    if (!student) {
      return res.status(404).json({ error: "Data siswa tidak ditemukan" });
    }

    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [achievements, total] = await Promise.all([
      prisma.studentAchievement.findMany({
        where: { studentId: student.id },
        include: {
          achievement: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: parseInt(limit),
      }),
      prisma.studentAchievement.count({
        where: { studentId: student.id },
      }),
    ]);

    res.json({
      data: achievements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Error getting student achievements:", err);
    res.status(500).json({ error: "Gagal mengambil riwayat prestasi" });
  }
};

module.exports = {
  getAllSiswa,
  createSiswa,
  updateSiswa,
  deleteSiswa,
  importSiswa,
  getDetailSiswa,
  searchSiswa,
  exportSiswa,
  getMyProfile,
  getMyViolations,
  getMyAchievements,
};
