const { PrismaClient } = require("@prisma/client");
const {
  validateActiveAcademicYear,
  getTargetAcademicYear,
  canCreateReports,
} = require("../../utils/academicYearUtils");
const { checkAndTriggerSuratPeringatan } = require("../bk/automasi.controller");
const prisma = new PrismaClient();

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

// ==================== NEW STUDENT REPORT FUNCTIONS ====================

// Get all student reports (violation + achievement) with filtering and pagination
const getAllStudentReports = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      studentId,
      classroomId,
      tipe, // pelanggaran atau prestasi
      startDate,
      endDate,
      kategoriId,
      jenis,
      tahunAjaranId, // Filter by academic year
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {};
    if (studentId) where.studentId = parseInt(studentId);

    // Filter search by nama siswa atau nisn
    if (req.query.search) {
      const search = req.query.search;
      where.OR = [
        { student: { nisn: { contains: search, mode: "insensitive" } } },
        {
          student: {
            user: { name: { contains: search, mode: "insensitive" } },
          },
        },
      ];
    }

    // Tahun ajaran: jika 'all' atau tidak dikirim, ambil semua; jika tidak, filter aktif jika tidak ada param
    if (tahunAjaranId && tahunAjaranId !== "all") {
      where.tahunAjaranId = parseInt(tahunAjaranId);
    } else if (!tahunAjaranId) {
      // Default: tahun ajaran aktif
      const activeYear = await prisma.tahunAjaran.findFirst({
        where: { isActive: true },
      });
      if (!activeYear) {
        return res.status(400).json({
          error: "Tidak ada tahun ajaran aktif, data tidak dapat ditampilkan.",
          code: "NO_ACTIVE_YEAR",
          data: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            totalPages: 0,
          },
        });
      }
      where.tahunAjaranId = activeYear.id;
    }

    // Filter by student's classroom
    if (classroomId) {
      where.student = { classroomId: parseInt(classroomId) };
    }

    // Filter by report item type
    if (tipe) {
      where.item = { tipe };
    }

    // Filter by category
    if (kategoriId) {
      where.item = { ...where.item, kategoriId: parseInt(kategoriId) };
    }

    // Filter by jenis (subkategori)
    if (jenis) {
      where.item = { ...where.item, jenis };
    }

    if (startDate || endDate) {
      where.tanggal = {};
      if (startDate) where.tanggal.gte = new Date(startDate);
      if (endDate) where.tanggal.lte = new Date(endDate);
    }

    const [reports, total] = await Promise.all([
      prisma.studentReport.findMany({
        where,
        include: {
          student: {
            include: {
              user: { select: { name: true, email: true } },
              classroom: { select: { namaKelas: true, kodeKelas: true } },
              angkatan: { select: { tahun: true } },
            },
          },
          item: { include: { kategori: true } },
          reporter: { select: { name: true, role: true } },
          // HAPUS: bukti: true,
        },
        orderBy: { tanggal: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.studentReport.count({ where }),
    ]);

    const formattedReports = reports.map((r) => ({
      id: r.id,
      student: {
        id: r.student.id,
        nama: r.student.user.name,
        email: r.student.user.email,
        nisn: r.student.nisn,
        kelas: r.student.classroom?.namaKelas,
        kodeKelas: r.student.classroom?.kodeKelas,
        angkatan: r.student.angkatan?.tahun,
        totalScore: r.student.totalScore,
      },
      item: {
        id: r.item.id,
        nama: r.item.nama,
        tipe: r.item.tipe,
        kategori: r.item.kategori.nama,
        jenis: r.item.jenis,
        point: r.item.point,
      },
      tanggal: r.tanggal,
      waktu: r.waktu,
      deskripsi: r.deskripsi,
      bukti: r.bukti,
      pointSaat: r.pointSaat,
      reporter: r.reporter.name,
      reporterRole: r.reporter.role,
      createdAt: r.createdAt,
    }));

    res.json({
      data: formattedReports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Error getting student reports:", err);
    res.status(500).json({ error: "Gagal mengambil data laporan siswa" });
  }
};

// Get student report by ID
const getStudentReportById = async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await prisma.studentReport.findUnique({
      where: { id: parseInt(reportId) },
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } },
            classroom: { select: { namaKelas: true, kodeKelas: true } },
            angkatan: { select: { tahun: true } },
          },
        },
        item: {
          include: {
            kategori: true,
          },
        },
        reporter: { select: { name: true, role: true } },
      },
    });

    if (!report) {
      return res.status(404).json({ error: "Laporan siswa tidak ditemukan" });
    }

    const formattedReport = {
      id: report.id,
      student: {
        id: report.student.id,
        nama: report.student.user.name,
        email: report.student.user.email,
        nisn: report.student.nisn,
        kelas: report.student.classroom?.namaKelas,
        kodeKelas: report.student.classroom?.kodeKelas,
        angkatan: report.student.angkatan?.tahun,
        totalScore: report.student.totalScore,
      },
      item: {
        id: report.item.id,
        nama: report.item.nama,
        tipe: report.item.tipe,
        kategori: report.item.kategori.nama,
        jenis: report.item.jenis,
        point: report.item.point,
      },
      tanggal: report.tanggal,
      waktu: report.waktu,
      deskripsi: report.deskripsi,
      bukti: report.bukti,
      pointSaat: report.pointSaat,
      reporter: report.reporter.name,
      reporterRole: report.reporter.role,
      createdAt: report.createdAt,
    };

    res.json({
      success: true,
      data: formattedReport,
    });
  } catch (err) {
    console.error("Error getting student report:", err);
    res.status(500).json({ error: "Gagal mengambil detail laporan siswa" });
  }
};

// Create student report (violation or achievement)
const createStudentReport = async (req, res) => {
  const reporterId = req.user.id;

  try {
    const file = req.file;
    let buktiPath = null;
    if (file) {
      buktiPath = `/uploads/bukti/${file.filename}`;
    }
    const { studentId, itemId, tanggal, waktu, deskripsi, point } = req.body;

    // Validate active academic year for creating new reports
    let activeYear;
    try {
      activeYear = await validateActiveAcademicYear();
    } catch (error) {
      if (error.code === "ACADEMIC_YEAR_REQUIRED") {
        return res.status(400).json({
          error: "Belum ada tahun ajaran Aktif",
          message:
            "Tidak dapat membuat laporan baru. Silakan hubungi administrator untuk mengatur tahun ajaran aktif.",
        });
      }
      throw error;
    }

    // Validate input
    if (!itemId) {
      return res.status(400).json({
        error: "itemId wajib diisi",
      });
    }

    // Validate student exists
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
      include: { user: true, classroom: true },
    });

    if (!student) {
      return res.status(404).json({ error: "Siswa tidak ditemukan" });
    }

    // Check if student is archived (graduated)
    if (student.isArchived) {
      return res.status(400).json({
        error: "Tidak dapat membuat laporan untuk siswa yang sudah lulus",
        message: "Siswa ini sudah lulus dan tidak dapat dilaporkan lagi",
      });
    }

    // Validate ReportItem exists and is active
    const reportItem = await prisma.reportItem.findUnique({
      where: { id: parseInt(itemId) },
      include: { kategori: true },
    });

    if (!reportItem) {
      return res.status(404).json({ error: "Item laporan tidak ditemukan" });
    }

    if (!reportItem.isActive) {
      return res.status(400).json({ error: "Item laporan sudah tidak aktif" });
    }

    reportItem.point;

    // Validate and parse waktu
    let parsedWaktu = null;
    if (waktu) {
      // If waktu is just time (HH:MM), combine with tanggal
      if (waktu.includes(":") && !waktu.includes("T")) {
        parsedWaktu = new Date(`${tanggal}T${waktu}:00.000Z`);
      } else {
        parsedWaktu = new Date(waktu);
      }

      // Check if the date is valid
      if (isNaN(parsedWaktu.getTime())) {
        parsedWaktu = null;
      }
    }

    // Create student report record
    const studentReport = await prisma.studentReport.create({
      data: {
        studentId: parseInt(studentId),
        reporterId,
        itemId: parseInt(itemId),
        tahunAjaranId: activeYear.id,
        tanggal: new Date(tanggal),
        waktu: waktu ? new Date(waktu) : null,
        deskripsi,
        pointSaat: reportItem.point,
        classAtTime: student.classroom ? student.classroom.namaKelas : "-",
        bukti: buktiPath, // simpan path file di sini
      },
      include: {
        student: { include: { user: true, classroom: true } },
        item: { include: { kategori: true } },
        reporter: { select: { name: true, role: true } },
      },
    });

    // Update student total score
    const oldTotalScore = student.totalScore;
    let newTotalScore;

    if (reportItem.tipe === "pelanggaran") {
      await prisma.student.update({
        where: { id: parseInt(studentId) },
        data: { totalScore: { decrement: reportItem.point } },
      });
      newTotalScore = oldTotalScore - reportItem.point;
    } else {
      await prisma.student.update({
        where: { id: parseInt(studentId) },
        data: { totalScore: { increment: reportItem.point } },
      });
      newTotalScore = oldTotalScore + reportItem.point;
    }

    // Trigger automasi surat peringatan jika ini adalah pelanggaran
    if (reportItem.tipe === "pelanggaran") {
      await checkAndTriggerSuratPeringatan(
        studentId,
        newTotalScore,
        oldTotalScore
      );
    }

    // Create score history
    const newScore = newTotalScore;

    // Create notification for student
    const notificationTitle =
      reportItem.tipe === "pelanggaran" ? "Pelanggaran Baru" : "Prestasi Baru";
    const notificationMessage =
      reportItem.tipe === "pelanggaran"
        ? `Anda telah melakukan pelanggaran: ${reportItem.nama}. Poin: -${reportItem.point}`
        : `Selamat! Anda meraih prestasi: ${reportItem.nama}. Poin: +${reportItem.point}`;

    await prisma.notification.create({
      data: {
        studentId: parseInt(studentId),
        judul: notificationTitle,
        pesan: notificationMessage,
        isRead: false,
      },
    });

    res.status(201).json({
      success: true,
      message: `Laporan ${
        reportItem.tipe === "pelanggaran" ? "pelanggaran" : "prestasi"
      } berhasil dibuat`,
      data: {
        id: studentReport.id,
        student: {
          nama: studentReport.student.user.name,
          nisn: studentReport.student.nisn,
          kelas: studentReport.student.classroom?.namaKelas,
        },
        item: {
          nama: reportItem.nama,
          tipe: reportItem.tipe,
          kategori: reportItem.kategori.nama,
          point: reportItem.point,
        },
        tanggal: studentReport.tanggal,
        reporter: studentReport.reporter.name,
        bukti: studentReport.bukti, // path file
      },
    });
  } catch (err) {
    console.error("Error creating student report:", err);
    res.status(500).json({ error: "Gagal membuat laporan siswa" });
  }
};

// Update student report
const updateStudentReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { studentId, itemId, tanggal, waktu, deskripsi, pointSaat } =
      req.body;
    // Check if report exists
    const existingReport = await prisma.studentReport.findUnique({
      where: { id: parseInt(reportId) },
      include: {
        student: true,
        item: { include: { kategori: true } },
      },
    });
    if (!existingReport) {
      return res.status(404).json({ error: "Laporan tidak ditemukan" });
    }
    let newReportItem = existingReport.item;
    let finalPointSaat = pointSaat;
    // If itemId changed, validate new ReportItem
    if (itemId && parseInt(itemId) !== existingReport.itemId) {
      newReportItem = await prisma.reportItem.findUnique({
        where: { id: parseInt(itemId) },
        include: { kategori: true },
      });
      if (!newReportItem) {
        return res
          .status(404)
          .json({ error: "Item laporan baru tidak ditemukan" });
      }
      if (!newReportItem.isActive) {
        return res
          .status(400)
          .json({ error: "Item laporan baru sudah tidak aktif" });
      }
    }
    finalPointSaat = pointSaat || newReportItem.point;
    const oldPoints = existingReport.pointSaat;
    const pointDifference = finalPointSaat - oldPoints;
    // Validate and parse waktu for update
    let parsedWaktu = undefined;
    if (waktu !== undefined) {
      if (waktu) {
        if (waktu.includes(":") && !waktu.includes("T")) {
          const dateToUse =
            tanggal || existingReport.tanggal.toISOString().split("T")[0];
          parsedWaktu = new Date(`${dateToUse}T${waktu}:00.000Z`);
        } else {
          parsedWaktu = new Date(waktu);
        }
        if (isNaN(parsedWaktu.getTime())) {
          parsedWaktu = null;
        }
      } else {
        parsedWaktu = null;
      }
    }
    // Update report record
    const updatedReport = await prisma.studentReport.update({
      where: { id: parseInt(reportId) },
      data: {
        studentId: studentId ? parseInt(studentId) : undefined,
        itemId: itemId ? parseInt(itemId) : undefined,
        tanggal: tanggal ? new Date(tanggal) : undefined,
        waktu: parsedWaktu,
        deskripsi,
        pointSaat: finalPointSaat,
      },
      include: {
        student: { include: { user: true, classroom: true } },
        item: { include: { kategori: true } },
        reporter: { select: { name: true, role: true } },
      },
    });
    // Update student total score if points changed
    if (pointDifference !== 0) {
      const scoreIncrement =
        newReportItem.tipe === "pelanggaran"
          ? -pointDifference
          : pointDifference;
      await prisma.student.update({
        where: { id: existingReport.studentId },
        data: { totalScore: { increment: scoreIncrement } },
      });
    }
    res.json({
      success: true,
      message: "Laporan berhasil diperbarui",
      data: updatedReport,
    });
  } catch (err) {
    console.error("Error updating student report:", err);
    res.status(500).json({ error: "Gagal memperbarui laporan" });
  }
};

// Delete student report
const deleteStudentReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const existingReport = await prisma.studentReport.findUnique({
      where: { id: parseInt(reportId) },
      include: {
        student: true,
        item: { include: { kategori: true } },
      },
    });
    if (!existingReport) {
      return res.status(404).json({ error: "Laporan tidak ditemukan" });
    }
    // Restore student points before deleting
    if (existingReport.item.tipe === "pelanggaran") {
      await prisma.student.update({
        where: { id: existingReport.studentId },
        data: { totalScore: { increment: existingReport.pointSaat } },
      });
    } else {
      await prisma.student.update({
        where: { id: existingReport.studentId },
        data: { totalScore: { decrement: existingReport.pointSaat } },
      });
    }
    // Delete the report record
    await prisma.studentReport.delete({
      where: { id: parseInt(reportId) },
    });
    res.json({
      success: true,
      message: "Laporan berhasil dihapus",
    });
  } catch (err) {
    console.error("Error deleting student report:", err);
    res.status(500).json({ error: "Gagal menghapus laporan" });
  }
};

// Recalculate all student total scores based on actual reports
const recalculateAllTotalScores = async (req, res) => {
  try {
    // Get all students
    const students = await prisma.student.findMany({
      include: {
        user: { select: { name: true } },
      },
    });

    console.log(`Starting recalculation for ${students.length} students...`);

    let updatedCount = 0;
    const results = [];

    for (const student of students) {
      // Calculate actual total score from reports
      const reports = await prisma.studentReport.findMany({
        where: {
          studentId: student.id,
        },
        include: {
          item: true,
        },
      });

      // Calculate correct total score
      let correctTotalScore = 0;

      reports.forEach((report) => {
        if (report.item.tipe === "pelanggaran") {
          correctTotalScore -= report.pointSaat;
        } else {
          correctTotalScore += report.pointSaat;
        }
      });

      const currentTotalScore = student.totalScore;

      if (correctTotalScore !== currentTotalScore) {
        // Update student total score
        await prisma.student.update({
          where: { id: student.id },
          data: { totalScore: correctTotalScore },
        });

        updatedCount++;
        results.push({
          studentId: student.id,
          studentName: student.user.name,
          oldScore: currentTotalScore,
          newScore: correctTotalScore,
          difference: correctTotalScore - currentTotalScore,
          totalReports: reports.length,
        });

        console.log(
          `Updated ${student.user.name}: ${currentTotalScore} → ${correctTotalScore}`
        );
      }
    }

    res.json({
      message: "Total score recalculation completed",
      totalStudents: students.length,
      updatedStudents: updatedCount,
      results: results,
    });
  } catch (err) {
    console.error("Error recalculating total scores:", err);
    res.status(500).json({ error: "Gagal melakukan recalculation" });
  }
};

module.exports = {
  // New Student Report Functions (Combined)
  getAllStudentReports,
  getStudentReportById,
  createStudentReport,
  updateStudentReport,
  deleteStudentReport,

  // Point Adjustments
  adjustStudentPoints,
  getPointAdjustmentHistory,

  // Utility Functions
  recalculateAllTotalScores,

  // Helper Endpoints
  getAllStudents,
};
