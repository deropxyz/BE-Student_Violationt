const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Ambil semua siswa di kelas wali kelas yang sedang login (dengan pagination & search)
const getStudentsInMyClass = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search ? req.query.search.trim() : "";
    // Cari guru dan kelas yang diwalikan
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: { classrooms: true },
    });
    if (!teacher || !teacher.classrooms.length) {
      return res
        .status(404)
        .json({ error: "Anda tidak menjadi wali kelas manapun" });
    }
    const classroom = teacher.classrooms[0];
    // Filter search by nama/nisn
    const whereClause = {
      classroomId: classroom.id,
      ...(search && {
        OR: [
          { nisn: { contains: search } },
          { user: { name: { contains: search, mode: "insensitive" } } },
        ],
      }),
    };
    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where: whereClause,
        include: {
          user: { select: { name: true, email: true } },
          angkatan: true,
        },
        orderBy: { nisn: "asc" },
        skip: offset,
        take: limit,
      }),
      prisma.student.count({ where: whereClause }),
    ]);
    res.json({ classroom: classroom.namaKelas, students, total });
  } catch (err) {
    console.error("Error getStudentsInMyClass:", err);
    res.status(500).json({ error: "Gagal mengambil data siswa kelas" });
  }
};

// Ambil detail siswa di kelas wali kelas
const getStudentDetailInMyClass = async (req, res) => {
  try {
    const userId = req.user.id;
    const { nisn } = req.params;
    // Cari guru dan kelas yang diwalikan
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: { classrooms: true },
    });
    if (!teacher || !teacher.classrooms.length) {
      return res
        .status(404)
        .json({ error: "Anda tidak menjadi wali kelas manapun" });
    }
    const classroom = teacher.classrooms[0];
    // Pastikan siswa ada di kelas wali kelas
    const student = await prisma.student.findFirst({
      where: { nisn, classroomId: classroom.id },
      include: { user: true, angkatan: true },
    });
    if (!student) {
      return res
        .status(404)
        .json({ error: "Siswa tidak ditemukan di kelas Anda" });
    }
    res.json({ student });
  } catch (err) {
    console.error("Error getStudentDetailInMyClass:", err);
    res.status(500).json({ error: "Gagal mengambil detail siswa" });
  }
};

// Ambil daftar laporan seluruh siswa di kelas wali kelas (dengan pagination & search)
const getReportsInMyClass = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search ? req.query.search.trim() : "";
    // Cari guru dan kelas yang diwalikan
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: { classrooms: true },
    });
    if (!teacher || !teacher.classrooms.length) {
      return res
        .status(404)
        .json({ error: "Anda tidak menjadi wali kelas manapun" });
    }
    const classroom = teacher.classrooms[0];
    // Filter search by nama/nisn
    const whereClause = {
      status: "approved", // Only show approved reports
      student: {
        classroomId: classroom.id,
        ...(search && {
          OR: [
            { nisn: { contains: search } },
            { user: { name: { contains: search, mode: "insensitive" } } },
          ],
        }),
      },
    };
    const [reports, total] = await Promise.all([
      prisma.studentReport.findMany({
        where: whereClause,
        include: {
          student: { select: { nisn: true, user: { select: { name: true } } } },
          item: true,
          reporter: { select: { name: true, role: true } },
        },
        orderBy: { tanggal: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.studentReport.count({ where: whereClause }),
    ]);
    res.json({ classroom: classroom.namaKelas, reports, total });
  } catch (err) {
    console.error("Error getReportsInMyClass:", err);
    res.status(500).json({ error: "Gagal mengambil daftar laporan kelas" });
  }
};

// Cek apakah user adalah wali kelas
const checkIsWaliKelas = async (req, res) => {
  try {
    const userId = req.user.id;
    // Cari teacher berdasarkan userId
    const teacher = await prisma.teacher.findUnique({ where: { userId } });
    if (!teacher) return res.json({ isWaliKelas: false });
    // Cek classroom yang waliKelasId = teacher.id
    const classroom = await prisma.classroom.findFirst({
      where: { waliKelasId: teacher.id },
    });
    if (!classroom) return res.json({ isWaliKelas: false });
    res.json({ isWaliKelas: true });
  } catch (err) {
    console.error("Error checkIsWaliKelas:", err);
    res
      .status(500)
      .json({ isWaliKelas: false, error: "Internal server error" });
  }
};

module.exports = {
  getStudentsInMyClass,
  getStudentDetailInMyClass,
  getReportsInMyClass,
  checkIsWaliKelas,
};
