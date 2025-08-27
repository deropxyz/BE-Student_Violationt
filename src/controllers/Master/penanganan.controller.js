const { PrismaClient } = require("@prisma/client");
const {
  validateActiveAcademicYear,
  getTargetAcademicYear,
  canCreateReports,
} = require("../../utils/academicYearUtils");
const { checkAndTriggerSuratPeringatan } = require("../bk/automasi.controller");
const prisma = new PrismaClient();

// Get riwayat penanganan siswa (dengan filter tahun ajaran)
const getRiwayatPenangananSiswa = async (req, res) => {
  try {
    const { nisn } = req.params;
    const { tahunAjaranId } = req.query;
    // Cari studentId dari nisn
    const student = await prisma.student.findUnique({
      where: { nisn },
    });
    if (!student) {
      return res.status(404).json({ error: "Siswa tidak ditemukan" });
    }
    // Filter by tahunAjaranId jika ada
    const where = { studentId: student.id };
    if (tahunAjaranId) {
      where.tahunAjaranId = parseInt(tahunAjaranId);
    }
    const history = await prisma.pointAdjustment.findMany({
      where,
      orderBy: { tanggal: "desc" },
      include: {
        teacher: { select: { name: true } },
      },
    });
    res.json({ data: history });
  } catch (err) {
    console.error("Error getRiwayatPenangananSiswa:", err);
    res.status(500).json({ error: "Gagal mengambil riwayat penanganan" });
  }
};

// Get detail riwayat penanganan by id
const getDetailRiwayatPenanganan = async (req, res) => {
  try {
    const { id } = req.params;
    const adj = await prisma.pointAdjustment.findUnique({
      where: { id: parseInt(id) },
      include: {
        teacher: { select: { name: true } },
        student: { select: { nisn: true, user: { select: { name: true } } } },
      },
    });
    if (!adj) return res.status(404).json({ error: "Data tidak ditemukan" });
    res.json({ data: adj });
  } catch (err) {
    console.error("Error getDetailRiwayatPenanganan:", err);
    res.status(500).json({ error: "Gagal mengambil detail penanganan" });
  }
};

// Adjust student points (BK can reduce violation points as a form of rehabilitation)
const adjustStudentPoints = async (req, res) => {
  const teacherId = req.user.id;
  try {
    const { studentId, pointAdjustment, alasan, keterangan } = req.body;
    if (!studentId || pointAdjustment === undefined || !alasan) {
      return res.status(400).json({
        error: "studentId, pointAdjustment, dan alasan wajib diisi",
      });
    }
    // Validate student exists
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
      include: {
        user: { select: { name: true } },
        classroom: { select: { namaKelas: true } },
      },
    });
    if (!student) {
      return res.status(404).json({ error: "Siswa tidak ditemukan" });
    }
    const pointChange = parseInt(pointAdjustment);
    const oldTotalScore = student.totalScore;
    const newTotalScore = oldTotalScore - Math.abs(pointChange);
    // Buat record PointAdjustment
    const adjustment = await prisma.pointAdjustment.create({
      data: {
        studentId: parseInt(studentId),
        teacherId,
        pointPengurangan: Math.abs(pointChange),
        alasan,
        keterangan,
        pointSebelum: oldTotalScore,
        pointSesudah: newTotalScore,
      },
    });
    // Update student total score
    await prisma.student.update({
      where: { id: parseInt(studentId) },
      data: {
        totalScore: newTotalScore,
      },
    });
    // Trigger automasi surat peringatan jika score turun (pelanggaran)
    await checkAndTriggerSuratPeringatan(
      studentId,
      newTotalScore,
      oldTotalScore
    );
    // Create notification for student
    const notificationMessage = `Poin pelanggaran Anda dikurangi ${Math.abs(
      pointChange
    )} oleh BK. Alasan: ${alasan}`;
    await prisma.notification.create({
      data: {
        studentId: parseInt(studentId),
        judul: "Penyesuaian Poin",
        pesan: notificationMessage,
        isRead: false,
      },
    });
    res.json({
      success: true,
      message: "Penyesuaian poin berhasil dilakukan",
      data: {
        student: {
          id: student.id,
          nama: student.user.name,
          nisn: student.nisn,
          kelas: student.classroom?.namaKelas,
        },
        adjustment,
      },
    });
  } catch (err) {
    console.error("Error adjusting student points:", err);
    res.status(500).json({ error: "Gagal melakukan penyesuaian poin" });
  }
};

// Get point adjustment history for a student
const getPointAdjustmentHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [history, total] = await Promise.all([
      prisma.pointAdjustment.findMany({
        where: { studentId: parseInt(studentId) },
        orderBy: { tanggal: "desc" },
        skip,
        take: parseInt(limit),
        include: {
          teacher: { select: { name: true } },
        },
      }),
      prisma.pointAdjustment.count({
        where: { studentId: parseInt(studentId) },
      }),
    ]);
    res.json({
      data: history,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Error getting point adjustment history:", err);
    res.status(500).json({ error: "Gagal mengambil riwayat penyesuaian poin" });
  }
};

// ==================== HELPER ENDPOINTS ====================

// Get all students with basic info for search/selection
const getAllStudents = async (req, res) => {
  try {
    const { search, classroomId, limit = 100 } = req.query;

    // Build where clause
    const where = {
      isArchived: false, // Only show non-graduated students
    };

    if (classroomId) where.classroomId = parseInt(classroomId);

    if (search) {
      where.OR = [
        { nisn: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        classroom: { select: { namaKelas: true, kodeKelas: true } },
      },
      orderBy: [{ classroom: { namaKelas: "asc" } }, { user: { name: "asc" } }],
      take: parseInt(limit),
    });

    const formattedStudents = students.map((student) => ({
      id: student.id,
      nisn: student.nisn,
      nama: student.user.name,
      kelas: student.classroom?.kodeKelas,
      classroomId: student.classroomId,
    }));

    res.json({
      data: formattedStudents,
      total: formattedStudents.length,
    });
  } catch (err) {
    console.error("Error getting students:", err);
    res.status(500).json({ error: "Gagal mengambil data siswa" });
  }
};

module.exports = {
  getAllStudents,
  getPointAdjustmentHistory,
  adjustStudentPoints,
  getRiwayatPenangananSiswa,
  getDetailRiwayatPenanganan,
};
