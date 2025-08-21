const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get superadmin dashboard statistics
const getSuperadminDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      totalStudents,
      totalTeachers,
      totalClassrooms,
      totalViolations,
      totalAchievements,
      totalReports,
      activeUsers,
      recentReports,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.classroom.count(),
      prisma.violation.count(),
      prisma.achievement.count(),
      prisma.studentReport.count(),
      prisma.user.count({
        where: { isActive: true },
      }),
      prisma.studentReport.findMany({
        include: {
          student: {
            include: {
              user: { select: { name: true } },
              classroom: { select: { namaKelas: true } },
            },
          },
          violation: { select: { nama: true } },
          achievement: { select: { nama: true } },
          reporter: { select: { name: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    res.json({
      statistics: {
        users: {
          total: totalUsers,
          active: activeUsers,
          students: totalStudents,
          teachers: totalTeachers,
        },
        academic: {
          classrooms: totalClassrooms,
          violations: totalViolations,
          achievements: totalAchievements,
          reports: totalReports,
        },
      },
      recentReports,
    });
  } catch (err) {
    console.error("Error getting superadmin dashboard:", err);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
};

// Get superadmin statistics by academic year
const getSuperadminStatsByAcademicYear = async (req, res) => {
  const { tahunAjaranId } = req.query;

  try {
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

    const [
      totalUsers,
      totalStudents,
      totalTeachers,
      totalClassrooms,
      totalViolations,
      totalAchievements,
      totalReports,
      activeUsers,
      violationReports,
      achievementReports,
      monthlyReports,
      reportsByType,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.classroom.count(),
      prisma.violation.count(),
      prisma.achievement.count(),
      prisma.studentReport.count({
        where: { tanggal: dateFilter },
      }),
      prisma.user.count({
        where: { isActive: true },
      }),
      prisma.studentReport.count({
        where: {
          tipe: "violation",
          tanggal: dateFilter,
        },
      }),
      prisma.studentReport.count({
        where: {
          tipe: "achievement",
          tanggal: dateFilter,
        },
      }),
      prisma.studentReport.findMany({
        where: { tanggal: dateFilter },
        select: {
          tipe: true,
          tanggal: true,
          pointSaat: true,
        },
      }),
      // Reports by type (violations and achievements)
      prisma.studentReport.groupBy({
        by: ["tipe"],
        where: { tanggal: dateFilter },
        _count: {
          id: true,
        },
      }),
    ]);

    // Process monthly statistics
    const monthlyStats = {};
    monthlyReports.forEach((report) => {
      const date = new Date(report.tanggal);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const key = `${year}-${month.toString().padStart(2, "0")}`;

      if (!monthlyStats[key]) {
        monthlyStats[key] = {
          month,
          year,
          count: 0,
          violations: 0,
          achievements: 0,
        };
      }

      monthlyStats[key].count++;
      if (report.tipe === "violation") {
        monthlyStats[key].violations++;
      } else {
        monthlyStats[key].achievements++;
      }
    });

    // Format reports by type for frontend
    const formattedReportsByType = reportsByType.map((item) => ({
      type: item.tipe,
      name: item.tipe === "violation" ? "Pelanggaran" : "Prestasi",
      count: item._count.id,
    }));

    res.json({
      totalReports,
      violationReports,
      achievementReports,
      activeStudents: totalStudents,
      averageReportsPerMonth: Math.round((totalReports / 12) * 100) / 100,
      monthlyReports: Object.values(monthlyStats).sort((a, b) =>
        a.year === b.year ? a.month - b.month : a.year - b.year
      ),
      reportsByClass: [],
      reportsByType: formattedReportsByType,
    });
  } catch (err) {
    console.error("Error getting superadmin stats by academic year:", err);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
};

// Get system analytics by academic year
const getSystemAnalyticsByAcademicYear = async (req, res) => {
  const { tahunAjaranId } = req.query;

  try {
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

    // Get recent reports for the academic year
    const recentReports = await prisma.studentReport.findMany({
      where: { tanggal: dateFilter },
      include: {
        student: {
          include: {
            user: { select: { name: true } },
            classroom: { select: { namaKelas: true } },
          },
        },
        violation: { select: { nama: true } },
        achievement: { select: { nama: true } },
        reporter: { select: { name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    res.json({
      recentReports: recentReports.map((report) => ({
        id: report.id,
        tanggal: report.tanggal,
        tipe: report.tipe,
        deskripsi: report.deskripsi,
        pointSaat: report.pointSaat,
        student: {
          name: report.student?.user?.name || report.student?.name,
          classroom: {
            name: report.student?.classroom?.namaKelas,
          },
        },
        violation: report.violation,
        achievement: report.achievement,
        reporter: report.reporter,
      })),
      academicYear,
    });
  } catch (err) {
    console.error("Error getting system analytics by academic year:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
};

// Get all users with pagination and filtering
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = {};
    if (role) {
      whereClause.role = role;
    }
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        include: {
          student: {
            include: {
              classroom: { select: { namaKelas: true } },
              angkatan: { select: { tahun: true } },
            },
          },
          teacher: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    res.json({
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Error getting all users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

module.exports = {
  getSuperadminDashboard,
  getSuperadminStatsByAcademicYear,
  getSystemAnalyticsByAcademicYear,
  getAllUsers,
};
