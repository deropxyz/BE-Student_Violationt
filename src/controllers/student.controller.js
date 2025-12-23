const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get student dashboard by academic year
const getStudentDashboardByAcademicYear = async (req, res) => {
  const userId = req.user.id;
  const { tahunAjaranId } = req.query;

  try {
    // Get student data
    const student = await prisma.student.findUnique({
      where: { userId },
      include: {
        user: true,
        classroom: true,
        angkatan: true,
      },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    let academicYear;
    if (tahunAjaranId) {
      academicYear = await prisma.tahunAjaran.findUnique({
        where: { id: parseInt(tahunAjaranId) },
      });
    } else {
      academicYear = await prisma.tahunAjaran.findFirst({
        where: { isActive: true },
      });
    }

    if (!academicYear) {
      return res.status(404).json({ error: "Academic year not found" });
    }

    const dateFilter = {
      gte: academicYear.tanggalMulai,
      lte: academicYear.tanggalSelesai,
    };

    // Get reports for this academic year
    const [violationReports, achievementReports] = await Promise.all([
      prisma.studentReport.findMany({
        where: {
          studentId: student.id,
          status: "approved", // Only show approved reports
          item: {
            tipe: "pelanggaran",
          },
          tanggal: dateFilter,
        },
        include: {
          item: {
            include: {
              kategori: true,
            },
          },
          reporter: {
            select: { name: true },
          },
        },
        orderBy: { tanggal: "desc" },
      }),

      prisma.studentReport.findMany({
        where: {
          studentId: student.id,
          status: "approved", // Only show approved reports
          item: {
            tipe: "prestasi",
          },
          tanggal: dateFilter,
        },
        include: {
          item: {
            include: {
              kategori: true,
            },
          },
          reporter: {
            select: { name: true },
          },
        },
        orderBy: { tanggal: "desc" },
      }),
    ]);

    // Calculate statistics for this academic year
    const totalViolationPoints = violationReports.reduce(
      (sum, report) => sum + (report.pointSaat || 0),
      0
    );
    const totalAchievementPoints = achievementReports.reduce(
      (sum, report) => sum + (report.pointSaat || 0),
      0
    );

    // Get monthly breakdown for the academic year
    const monthlyStats = {};
    [...violationReports, ...achievementReports].forEach((report) => {
      const month = new Date(report.tanggal).toISOString().slice(0, 7);
      if (!monthlyStats[month]) {
        monthlyStats[month] = {
          month,
          violations: 0,
          achievements: 0,
          points: 0,
        };
      }

      if (report.item.tipe === "pelanggaran") {
        monthlyStats[month].violations++;
        monthlyStats[month].points += report.pointSaat || 0;
      } else {
        monthlyStats[month].achievements++;
        monthlyStats[month].points += report.pointSaat || 0;
      }
    });

    res.json({
      academicYear,
      student: {
        id: student.id,
        nisn: student.nisn,
        name: student.user.name,
        email: student.user.email,
        className: student.classroom.namaKelas,
        angkatan: student.angkatan.tahun,
        totalScore: student.totalScore,
      },
      academicYearStats: {
        totalViolations: violationReports.length,
        totalAchievements: achievementReports.length,
        totalViolationPoints,
        totalAchievementPoints,
        netScore: totalViolationPoints + totalAchievementPoints,
        monthlyBreakdown: Object.values(monthlyStats).sort((a, b) =>
          a.month.localeCompare(b.month)
        ),
      },
      recentViolations: violationReports.slice(0, 5).map((report) => ({
        id: report.id,
        violation: report.violation,
        tanggal: report.tanggal,
        waktu: report.waktu,
        deskripsi: report.deskripsi,
        pointSaat: report.pointSaat,
        reporter: report.reporter.name,
      })),
      recentAchievements: achievementReports.slice(0, 5).map((report) => ({
        id: report.id,
        achievement: report.achievement,
        tanggal: report.tanggal,
        waktu: report.waktu,
        deskripsi: report.deskripsi,
        pointSaat: report.pointSaat,
        reporter: report.reporter.name,
      })),
    });
  } catch (err) {
    console.error("Error getting student dashboard by academic year:", err);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
};

// Get student's reports by academic year
const getStudentReportsByAcademicYear = async (req, res) => {
  const userId = req.user.id;
  const { tahunAjaranId, page = 1, limit = 10, tipe } = req.query;

  try {
    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    let academicYear;
    if (tahunAjaranId) {
      academicYear = await prisma.tahunAjaran.findUnique({
        where: { id: parseInt(tahunAjaranId) },
      });
    } else {
      academicYear = await prisma.tahunAjaran.findFirst({
        where: { isActive: true },
      });
    }

    if (!academicYear) {
      return res.status(404).json({ error: "Academic year not found" });
    }

    const whereClause = {
      studentId: student.id,
      tanggal: {
        gte: academicYear.tanggalMulai,
        lte: academicYear.tanggalSelesai,
      },
    };

    if (tipe) {
      whereClause.tipe = tipe;
    }

    // Only show approved reports
    whereClause.status = "approved";

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reports, total] = await Promise.all([
      prisma.studentReport.findMany({
        where: whereClause,
        include: {
          violation: true,
          achievement: true,
          reporter: {
            select: { name: true, role: true },
          },
        },
        orderBy: { tanggal: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.studentReport.count({ where: whereClause }),
    ]);

    res.json({
      academicYear,
      data: reports.map((report) => ({
        id: report.id,
        tipe: report.tipe,
        item:
          report.tipe === "violation" ? report.violation : report.achievement,
        tanggal: report.tanggal,
        waktu: report.waktu,
        deskripsi: report.deskripsi,
        bukti: report.bukti,
        pointSaat: report.pointSaat,
        reporter: {
          name: report.reporter.name,
          role: report.reporter.role,
        },
        createdAt: report.createdAt,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      summary: {
        totalReports: total,
        violationReports: await prisma.studentReport.count({
          where: { ...whereClause, tipe: "violation" },
        }),
        achievementReports: await prisma.studentReport.count({
          where: { ...whereClause, tipe: "achievement" },
        }),
      },
    });
  } catch (err) {
    console.error("Error getting student reports by academic year:", err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
};

// Get student profile
const getStudentProfile = async (req, res) => {
  const userId = req.user.id;

  try {
    const student = await prisma.student.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        classroom: {
          include: {
            waliKelas: {
              select: {
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
      },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Get overall statistics
    const [totalReports, violationReports, achievementReports] =
      await Promise.all([
        prisma.studentReport.count({
          where: { studentId: student.id, status: "approved" },
        }),
        prisma.studentReport.count({
          where: {
            studentId: student.id,
            status: "approved",
            tipe: "violation",
          },
        }),
        prisma.studentReport.count({
          where: {
            studentId: student.id,
            status: "approved",
            tipe: "achievement",
          },
        }),
      ]);

    res.json({
      profile: {
        id: student.id,
        nisn: student.nisn,
        name: student.user.name,
        email: student.user.email,
        gender: student.gender,
        tempatLahir: student.tempatLahir,
        tglLahir: student.tglLahir,
        alamat: student.alamat,
        noHp: student.noHp,
        totalScore: student.totalScore,
        isArchived: student.isArchived,
        className: student.classroom.namaKelas,
        angkatan: student.angkatan.tahun,
        waliKelas: student.classroom.waliKelas?.user?.name || null,
        orangTua: student.orangTua?.user?.name || null,
      },
      statistics: {
        totalReports,
        violationReports,
        achievementReports,
        averageScore: Math.round(
          student.totalScore / Math.max(totalReports, 1)
        ),
      },
    });
  } catch (err) {
    console.error("Error getting student profile:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

// Get all academic years for student
const getAcademicYears = async (req, res) => {
  try {
    const academicYears = await prisma.tahunAjaran.findMany({
      orderBy: { tahunMulai: "desc" },
    });

    res.json({
      message: "Academic years retrieved successfully",
      data: academicYears,
    });
  } catch (err) {
    console.error("Error getting academic years:", err);
    res.status(500).json({ error: "Failed to fetch academic years" });
  }
};

// Get current academic year
const getCurrentAcademicYear = async (req, res) => {
  try {
    const currentYear = await prisma.tahunAjaran.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (!currentYear) {
      return res.status(404).json({
        error: "No active academic year found",
      });
    }

    res.json({
      message: "Current academic year retrieved successfully",
      data: currentYear,
    });
  } catch (err) {
    console.error("Error getting current academic year:", err);
    res.status(500).json({ error: "Failed to fetch current academic year" });
  }
};

module.exports = {
  getStudentDashboardByAcademicYear,
  getStudentReportsByAcademicYear,
  getStudentProfile,
  getAcademicYears,
  getCurrentAcademicYear,
};
