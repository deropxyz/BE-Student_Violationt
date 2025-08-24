const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Ambil semua siswa di kelas wali kelas yang sedang login
const getStudentsInMyClass = async (req, res) => {
  try {
    const userId = req.user.id;
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
    const students = await prisma.student.findMany({
      where: { classroomId: classroom.id },
      include: {
        user: { select: { name: true, email: true } },
        angkatan: true,
      },
      orderBy: { nisn: "asc" },
    });
    res.json({ classroom: classroom.namaKelas, students });
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

// Ambil daftar laporan seluruh siswa di kelas wali kelas
const getReportsInMyClass = async (req, res) => {
  try {
    const userId = req.user.id;
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
    // Ambil semua laporan siswa di kelas ini
    const reports = await prisma.studentReport.findMany({
      where: { student: { classroomId: classroom.id } },
      include: {
        student: { select: { nisn: true, user: { select: { name: true } } } },
        item: true,
        reporter: { select: { name: true, role: true } },
      },
      orderBy: { tanggal: "desc" },
    });
    res.json({ classroom: classroom.namaKelas, reports });
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
