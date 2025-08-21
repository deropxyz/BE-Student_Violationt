const { PrismaClient } = require("@prisma/client");
const {
  validateActiveAcademicYear,
  getTargetAcademicYear,
  canCreateReports,
} = require("../../utils/academicYearUtils");
const prisma = new PrismaClient();

// Adjust student points (BK can reduce violation points as a form of rehabilitation)
const adjustStudentPoints = async (req, res) => {
  const adjustedBy = req.user.id;

  try {
    const { studentId, pointAdjustment, alasan, kategori } = req.body;

    // Validate input
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
    const newTotalScore = oldTotalScore + pointChange;

    // Update student total score
    await prisma.student.update({
      where: { id: parseInt(studentId) },
      data: {
        totalScore: newTotalScore,
      },
    });

    // Create score history for tracking
    await prisma.scoreHistory.create({
      data: {
        studentId: parseInt(studentId),
        pointLama: oldTotalScore,
        pointBaru: newTotalScore,
        alasan: `${kategori || "Penyesuaian"} BK: ${alasan}`,
        tanggal: new Date(),
      },
    });

    // Create notification for student
    const notificationMessage =
      pointChange > 0
        ? `Poin Anda ditambah ${pointChange} oleh BK. Alasan: ${alasan}`
        : `Poin pelanggaran Anda dikurangi ${Math.abs(
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
        adjustment: {
          pointLama: oldTotalScore,
          pointBaru: newTotalScore,
          perubahan: pointChange,
          alasan,
          kategori: kategori || "Penyesuaian",
          tanggal: new Date(),
        },
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
      prisma.scoreHistory.findMany({
        where: { studentId: parseInt(studentId) },
        orderBy: { tanggal: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.scoreHistory.count({
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
      kelas: student.classroom?.namaKelas,
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
      tipe, // violation atau achievement
      startDate,
      endDate,
      kategori,
      jenis,
      tahunAjaranId, // Filter by academic year
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {};
    if (studentId) where.studentId = parseInt(studentId);
    if (tipe) where.tipe = tipe;
    if (classroomId) where.student = { classroomId: parseInt(classroomId) };
    if (tahunAjaranId) where.tahunAjaranId = parseInt(tahunAjaranId);

    // Filter by violation or achievement category
    if (kategori) {
      if (tipe === "violation") {
        where.violation = { kategori };
      } else if (tipe === "achievement") {
        where.achievement = { kategori };
      }
    }

    if (jenis && tipe === "violation") {
      where.violation = { ...where.violation, jenis };
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
          violation: true,
          achievement: true,
          reporter: { select: { name: true, role: true } },
          penanganan: true,
        },
        orderBy: { tanggal: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.studentReport.count({ where }),
    ]);

    const formattedReports = reports.map((r) => ({
      id: r.id,
      tipe: r.tipe,
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
      violation: r.violation
        ? {
            id: r.violation.id,
            nama: r.violation.nama,
            kategori: r.violation.kategori,
            jenis: r.violation.jenis,
            point: r.violation.point,
          }
        : null,
      achievement: r.achievement
        ? {
            id: r.achievement.id,
            nama: r.achievement.nama,
            kategori: r.achievement.kategori,
            point: r.achievement.point,
          }
        : null,
      tanggal: r.tanggal,
      waktu: r.waktu,
      deskripsi: r.deskripsi,
      bukti: r.bukti,
      pointSaat: r.pointSaat,
      reporter: r.reporter.name,
      reporterRole: r.reporter.role,
      penanganan: r.penanganan,
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
        violation: true,
        achievement: true,
        reporter: { select: { name: true, role: true } },
        penanganan: true,
      },
    });

    if (!report) {
      return res.status(404).json({ error: "Laporan siswa tidak ditemukan" });
    }

    const formattedReport = {
      id: report.id,
      tipe: report.tipe,
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
      violation: report.violation
        ? {
            id: report.violation.id,
            nama: report.violation.nama,
            kategori: report.violation.kategori,
            jenis: report.violation.jenis,
            point: report.violation.point,
          }
        : null,
      achievement: report.achievement
        ? {
            id: report.achievement.id,
            nama: report.achievement.nama,
            kategori: report.achievement.kategori,
            point: report.achievement.point,
          }
        : null,
      tanggal: report.tanggal,
      waktu: report.waktu,
      deskripsi: report.deskripsi,
      bukti: report.bukti,
      pointSaat: report.pointSaat,
      reporter: report.reporter.name,
      reporterRole: report.reporter.role,
      penanganan: report.penanganan,
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
    // ✅ NEW: Validate active academic year for creating new reports
    let activeYear;
    try {
      activeYear = await validateActiveAcademicYear();
    } catch (error) {
      if (error.code === "ACADEMIC_YEAR_REQUIRED") {
        return res.status(400).json({
          error: "No active academic year found",
          message:
            "Cannot create new reports. Please contact administrator to set active academic year.",
        });
      }
      throw error;
    }

    const {
      studentId,
      tipe, // 'violation' or 'achievement'
      violationId,
      achievementId,
      tanggal,
      waktu,
      deskripsi,
      bukti,
      pointSaat,
    } = req.body;

    // Validate input
    if (!tipe || !["violation", "achievement"].includes(tipe)) {
      return res.status(400).json({
        error: "Tipe laporan harus 'violation' atau 'achievement'",
      });
    }

    if (tipe === "violation" && !violationId) {
      return res.status(400).json({
        error: "violationId wajib untuk tipe violation",
      });
    }

    if (tipe === "achievement" && !achievementId) {
      return res.status(400).json({
        error: "achievementId wajib untuk tipe achievement",
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

    let violation = null;
    let achievement = null;
    let finalPointSaat = pointSaat;

    if (tipe === "violation") {
      violation = await prisma.violation.findUnique({
        where: { id: parseInt(violationId) },
      });
      if (!violation) {
        return res
          .status(404)
          .json({ error: "Jenis pelanggaran tidak ditemukan" });
      }
      finalPointSaat = pointSaat || violation.point;
    } else {
      achievement = await prisma.achievement.findUnique({
        where: { id: parseInt(achievementId) },
      });
      if (!achievement) {
        return res
          .status(404)
          .json({ error: "Jenis prestasi tidak ditemukan" });
      }
      finalPointSaat = pointSaat || achievement.point;
    }

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
        tipe,
        violationId: tipe === "violation" ? parseInt(violationId) : null,
        achievementId: tipe === "achievement" ? parseInt(achievementId) : null,
        tahunAjaranId: activeYear.id, // ✅ NEW: Add academic year relation
        tanggal: new Date(tanggal),
        waktu: parsedWaktu,
        deskripsi,
        bukti,
        pointSaat: finalPointSaat,
      },
      include: {
        student: { include: { user: true, classroom: true } },
        violation: true,
        achievement: true,
        reporter: { select: { name: true, role: true } },
      },
    });

    // Update student total score
    if (tipe === "violation") {
      await prisma.student.update({
        where: { id: parseInt(studentId) },
        data: { totalScore: { decrement: finalPointSaat } },
      });
    } else {
      await prisma.student.update({
        where: { id: parseInt(studentId) },
        data: { totalScore: { increment: finalPointSaat } },
      });
    }

    // Create score history
    const newScore =
      tipe === "violation"
        ? student.totalScore - finalPointSaat
        : student.totalScore + finalPointSaat;

    await prisma.scoreHistory.create({
      data: {
        studentId: parseInt(studentId),
        pointLama: student.totalScore,
        pointBaru: newScore,
        alasan:
          tipe === "violation"
            ? `Pelanggaran: ${violation.nama}`
            : `Prestasi: ${achievement.nama}`,
        tanggal: new Date(),
      },
    });

    // Create notification for student
    const notificationTitle =
      tipe === "violation" ? "Pelanggaran Baru" : "Prestasi Baru";
    const notificationMessage =
      tipe === "violation"
        ? `Anda telah melakukan pelanggaran: ${violation.nama}. Poin: -${finalPointSaat}`
        : `Selamat! Anda meraih prestasi: ${achievement.nama}. Poin: +${finalPointSaat}`;

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
        tipe === "violation" ? "pelanggaran" : "prestasi"
      } berhasil dibuat`,
      data: {
        id: studentReport.id,
        tipe: studentReport.tipe,
        student: {
          nama: studentReport.student.user.name,
          nisn: studentReport.student.nisn,
          kelas: studentReport.student.classroom?.namaKelas,
        },
        violation: studentReport.violation,
        achievement: studentReport.achievement,
        tanggal: studentReport.tanggal,
        reporter: studentReport.reporter.name,
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
    const {
      studentId,
      tipe,
      violationId,
      achievementId,
      tanggal,
      waktu,
      deskripsi,
      bukti,
      pointSaat,
    } = req.body;

    // Check if report exists
    const existingReport = await prisma.studentReport.findUnique({
      where: { id: parseInt(reportId) },
      include: {
        student: true,
        violation: true,
        achievement: true,
      },
    });

    if (!existingReport) {
      return res.status(404).json({ error: "Laporan tidak ditemukan" });
    }

    let newViolation = existingReport.violation;
    let newAchievement = existingReport.achievement;
    let finalPointSaat = pointSaat;

    // If type changed or IDs changed, validate new records
    if (tipe && tipe !== existingReport.tipe) {
      return res.status(400).json({
        error: "Tipe laporan tidak dapat diubah setelah dibuat",
      });
    }

    if (existingReport.tipe === "violation") {
      if (violationId && parseInt(violationId) !== existingReport.violationId) {
        newViolation = await prisma.violation.findUnique({
          where: { id: parseInt(violationId) },
        });
        if (!newViolation) {
          return res
            .status(404)
            .json({ error: "Jenis pelanggaran baru tidak ditemukan" });
        }
      }
      finalPointSaat = pointSaat || newViolation.point;
    } else {
      if (
        achievementId &&
        parseInt(achievementId) !== existingReport.achievementId
      ) {
        newAchievement = await prisma.achievement.findUnique({
          where: { id: parseInt(achievementId) },
        });
        if (!newAchievement) {
          return res
            .status(404)
            .json({ error: "Jenis prestasi baru tidak ditemukan" });
        }
      }
      finalPointSaat = pointSaat || newAchievement.point;
    }

    const oldPoints = existingReport.pointSaat;
    const pointDifference = finalPointSaat - oldPoints;

    // Validate and parse waktu for update
    let parsedWaktu = undefined;
    if (waktu !== undefined) {
      if (waktu) {
        // If waktu is just time (HH:MM), combine with tanggal
        if (waktu.includes(":") && !waktu.includes("T")) {
          const dateToUse =
            tanggal || existingReport.tanggal.toISOString().split("T")[0];
          parsedWaktu = new Date(`${dateToUse}T${waktu}:00.000Z`);
        } else {
          parsedWaktu = new Date(waktu);
        }

        // Check if the date is valid
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
        violationId: violationId ? parseInt(violationId) : undefined,
        achievementId: achievementId ? parseInt(achievementId) : undefined,
        tanggal: tanggal ? new Date(tanggal) : undefined,
        waktu: parsedWaktu,
        deskripsi,
        bukti,
        pointSaat: finalPointSaat,
      },
      include: {
        student: { include: { user: true, classroom: true } },
        violation: true,
        achievement: true,
        reporter: { select: { name: true, role: true } },
      },
    });

    // Update student total score if points changed
    if (pointDifference !== 0) {
      const scoreIncrement =
        existingReport.tipe === "violation"
          ? -pointDifference // For violations, more points = more deduction
          : pointDifference; // For achievements, more points = more addition

      await prisma.student.update({
        where: { id: existingReport.studentId },
        data: { totalScore: { increment: scoreIncrement } },
      });

      // Create score history
      const newScore = existingReport.student.totalScore + scoreIncrement;
      await prisma.scoreHistory.create({
        data: {
          studentId: existingReport.studentId,
          pointLama: existingReport.student.totalScore,
          pointBaru: newScore,
          alasan: `Update ${
            existingReport.tipe === "violation" ? "pelanggaran" : "prestasi"
          }: ${
            updatedReport.violation?.nama || updatedReport.achievement?.nama
          }`,
          tanggal: new Date(),
        },
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
        violation: true,
        achievement: true,
      },
    });

    if (!existingReport) {
      return res.status(404).json({ error: "Laporan tidak ditemukan" });
    }

    // Restore student points before deleting
    if (existingReport.tipe === "violation") {
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

    // Create score history
    const newScore =
      existingReport.tipe === "violation"
        ? existingReport.student.totalScore + existingReport.pointSaat
        : existingReport.student.totalScore - existingReport.pointSaat;

    await prisma.scoreHistory.create({
      data: {
        studentId: existingReport.studentId,
        pointLama: existingReport.student.totalScore,
        pointBaru: newScore,
        alasan: `Hapus ${
          existingReport.tipe === "violation" ? "pelanggaran" : "prestasi"
        }: ${
          existingReport.violation?.nama || existingReport.achievement?.nama
        }`,
        tanggal: new Date(),
      },
    });

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
      select: {
        id: true,
        nama: true,
        totalScore: true,
      },
    });

    console.log(`Starting recalculation for ${students.length} students...`);

    let updatedCount = 0;
    const results = [];

    for (const student of students) {
      // Calculate actual total score from reports
      const violationReports = await prisma.studentReport.findMany({
        where: {
          studentId: student.id,
          tipe: "violation",
        },
        select: {
          pointSaat: true,
        },
      });

      const achievementReports = await prisma.studentReport.findMany({
        where: {
          studentId: student.id,
          tipe: "achievement",
        },
        select: {
          pointSaat: true,
        },
      });

      // Calculate correct total score
      const totalViolationPoints = violationReports.reduce(
        (sum, report) => sum + (report.pointSaat || 0),
        0
      );
      const totalAchievementPoints = achievementReports.reduce(
        (sum, report) => sum + (report.pointSaat || 0),
        0
      );

      // Violations should subtract from score, achievements should add
      const correctTotalScore = totalAchievementPoints - totalViolationPoints;
      const currentTotalScore = student.totalScore;

      if (correctTotalScore !== currentTotalScore) {
        // Update student total score
        await prisma.student.update({
          where: { id: student.id },
          data: { totalScore: correctTotalScore },
        });

        // Create score history entry for this correction
        await prisma.scoreHistory.create({
          data: {
            studentId: student.id,
            pointLama: currentTotalScore,
            pointBaru: correctTotalScore,
            alasan: "System recalculation - correcting total score",
            tanggal: new Date(),
          },
        });

        updatedCount++;
        results.push({
          studentId: student.id,
          studentName: student.nama,
          oldScore: currentTotalScore,
          newScore: correctTotalScore,
          difference: correctTotalScore - currentTotalScore,
          violationPoints: totalViolationPoints,
          achievementPoints: totalAchievementPoints,
        });

        console.log(
          `Updated ${student.nama}: ${currentTotalScore} → ${correctTotalScore}`
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
