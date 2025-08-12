const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// BK Monitoring Functions
const getBKDashboard = async (req, res) => {
  try {
    // Get overview statistics
    const [
      totalStudents,
      highRiskStudents,
      mediumRiskStudents,
      lowRiskStudents,
      violationsThisMonth,
      achievementsThisMonth,
      topViolations,
      studentsNeedingAttention,
    ] = await Promise.all([
      // Total students
      prisma.student.count(),

      // High risk students (totalScore < -50)
      prisma.student.count({
        where: {
          totalScore: { lt: -50 },
        },
      }),

      // Medium risk students (totalScore between -50 and 0)
      prisma.student.count({
        where: {
          totalScore: { gte: -50, lt: 0 },
        },
      }),

      // Low risk students (totalScore >= 0)
      prisma.student.count({
        where: {
          totalScore: { gte: 0 },
        },
      }),

      // Violations this month
      prisma.studentReport.count({
        where: {
          tipe: "violation",
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),

      // Achievements this month
      prisma.studentReport.count({
        where: {
          tipe: "achievement",
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),

      // Top violations this month
      prisma.violation.findMany({
        include: {
          _count: {
            select: {
              reports: {
                where: {
                  tipe: "violation",
                  createdAt: {
                    gte: new Date(
                      new Date().getFullYear(),
                      new Date().getMonth(),
                      1
                    ),
                  },
                },
              },
            },
          },
        },
        orderBy: {
          reports: {
            _count: "desc",
          },
        },
        take: 5,
      }),

      // Students needing attention (high violation points)
      prisma.student.findMany({
        where: {
          totalScore: { lt: -25 }, // Negative score indicates more violations than achievements
        },
        include: {
          user: {
            select: {
              name: true,
            },
          },
          classroom: {
            select: {
              namaKelas: true,
            },
          },
          _count: {
            select: {
              reports: true,
            },
          },
        },
        orderBy: {
          totalScore: "asc",
        },
        take: 10,
      }),
    ]);

    const response = {
      data: {
        totalStudents,
        highRiskStudents,
        mediumRiskStudents,
        lowRiskStudents,
        violationsThisMonth,
        achievementsThisMonth,
        averageScore:
          totalStudents > 0
            ? Math.round(
                (
                  await prisma.student.aggregate({
                    _avg: { totalScore: true },
                  })
                )._avg.totalScore || 0
              )
            : 0,
      },
      topViolations: topViolations.map((v) => ({
        id: v.id,
        nama: v.nama,
        kategori: v.kategori,
        point: v.point,
        count: v._count.reports,
      })),
      studentsNeedingAttention: studentsNeedingAttention.map((s) => ({
        id: s.id,
        nisn: s.nisn,
        nama: s.user?.name,
        kelas: s.classroom?.namaKelas,
        totalScore: s.totalScore,
        reportCount: s._count.reports,
      })),
    };

    res.json(response);
  } catch (err) {
    console.error("Error getting BK dashboard:", err);
    res.status(500).json({ error: "Failed to fetch BK dashboard" });
  }
};

const getStudentsForMonitoring = async (req, res) => {
  try {
    const {
      riskLevel,
      classroomId,
      angkatanId,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = {};
    if (classroomId) filter.classroomId = parseInt(classroomId);
    if (angkatanId) filter.angkatanId = parseInt(angkatanId);

    // Add search filter
    if (search) {
      filter.OR = [
        {
          nisn: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          user: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    // Add risk level filter
    if (riskLevel) {
      if (riskLevel === "HIGH") {
        filter.totalScore = { lt: -50 };
      } else if (riskLevel === "MEDIUM") {
        filter.totalScore = { gte: -50, lt: 0 };
      } else if (riskLevel === "LOW") {
        filter.totalScore = { gte: 0 };
      }
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where: filter,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          classroom: {
            select: {
              namaKelas: true,
            },
          },
          angkatan: {
            select: {
              tahun: true,
            },
          },
          _count: {
            select: {
              reports: true,
            },
          },
          reports: {
            where: {
              tipe: "violation",
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 3,
            include: {
              violation: {
                select: {
                  nama: true,
                  point: true,
                },
              },
            },
          },
        },
        orderBy: { totalScore: "asc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.student.count({ where: filter }),
    ]);

    const formattedStudents = students.map((s) => {
      let riskLevel = "LOW";
      if (s.totalScore < -50) riskLevel = "HIGH";
      else if (s.totalScore < 0) riskLevel = "MEDIUM";

      // Count violations and achievements from reports
      const violationReports = s.reports.filter((r) => r.tipe === "violation");
      const achievementReports = s.reports.filter(
        (r) => r.tipe === "achievement"
      );

      return {
        id: s.id,
        nisn: s.nisn,
        nama: s.user?.name,
        email: s.user?.email,
        kelas: s.classroom?.namaKelas,
        angkatan: s.angkatan?.tahun,
        totalScore: s.totalScore,
        riskLevel,
        totalViolations: violationReports.length,
        totalAchievements: achievementReports.length,
        totalViolationPoints: violationReports.reduce(
          (sum, r) => sum + (r.pointSaat || 0),
          0
        ),
        totalAchievementPoints: achievementReports.reduce(
          (sum, r) => sum + (r.pointSaat || 0),
          0
        ),
        recentViolations: s.reports.slice(0, 3).map((r) => ({
          nama: r.violation?.nama || "Unknown",
          point: r.pointSaat || r.violation?.point || 0,
          tanggal: r.createdAt,
        })),
      };
    });

    res.json({
      data: formattedStudents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Error getting students for monitoring:", err);
    res.status(500).json({ error: "Failed to fetch students" });
  }
};

const getStudentDetailForBK = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        classroom: {
          select: {
            namaKelas: true,
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
        angkatan: {
          select: {
            tahun: true,
          },
        },
        reports: {
          include: {
            violation: true,
            achievement: true,
            reporter: {
              select: {
                name: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
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

    // Calculate statistics
    const reports = student.reports || [];
    const violations = reports.filter((r) => r.tipe === "violation");
    const achievements = reports.filter((r) => r.tipe === "achievement");

    const now = new Date();
    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );

    const stats = {
      totalViolations: violations.length,
      totalAchievements: achievements.length,
      totalViolationPoints: violations.reduce(
        (sum, v) => sum + (v.pointSaat || v.violation?.point || 0),
        0
      ),
      totalAchievementPoints: achievements.reduce(
        (sum, a) => sum + (a.pointSaat || a.achievement?.point || 0),
        0
      ),
      violationsThisMonth: violations.filter(
        (v) => new Date(v.createdAt) >= oneMonthAgo
      ).length,
      achievementsThisMonth: achievements.filter(
        (a) => new Date(a.createdAt) >= oneMonthAgo
      ).length,
    };

    stats.creditScore =
      stats.totalAchievementPoints - stats.totalViolationPoints;

    let riskLevel = "LOW";
    if (stats.totalViolationPoints >= 50) riskLevel = "HIGH";
    else if (stats.totalViolationPoints >= 25) riskLevel = "MEDIUM";

    const response = {
      student: {
        id: student.id,
        nisn: student.nisn,
        nama: student.user?.name,
        email: student.user?.email,
        jenisKelamin: student.gender,
        tempatLahir: student.tempatLahir,
        tglLahir: student.tglLahir,
        alamat: student.alamat,
        noHp: student.noHp,
        kelas: student.classroom?.namaKelas,
        angkatan: student.angkatan?.tahun,
        waliKelas: student.classroom?.waliKelas?.user?.name,
        waliKelasEmail: student.classroom?.waliKelas?.user?.email,
        orangTua: student.orangTua?.user?.name,
        orangTuaEmail: student.orangTua?.user?.email,
      },
      summary: {
        ...stats,
        riskLevel,
        totalScore: stats.creditScore,
      },
      violations: violations,
      achievements: achievements,
    };

    res.json(response);
  } catch (err) {
    console.error("Error getting student detail for BK:", err);
    res.status(500).json({ error: "Failed to fetch student detail" });
  }
};

const getViolationTrends = async (req, res) => {
  try {
    const { timeframe = "month" } = req.query;

    let startDate;
    const now = new Date();

    if (timeframe === "week") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeframe === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timeframe === "year") {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    // Get violation trends (simplified approach)
    const violations = await prisma.studentReport.findMany({
      where: {
        tipe: "violation",
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Group by date manually
    const violationTrends = violations.reduce((acc, violation) => {
      const date = violation.createdAt.toISOString().split("T")[0]; // Get date only
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    // Convert to array format
    const trendsArray = Object.entries(violationTrends).map(
      ([date, count]) => ({
        date,
        count,
      })
    );

    // Get violation by category
    const violationsByCategory = await prisma.violation.findMany({
      include: {
        _count: {
          select: {
            reports: {
              where: {
                tipe: "violation",
                createdAt: {
                  gte: startDate,
                },
              },
            },
          },
        },
      },
    });

    // Group by category manually
    const categoryStats = violationsByCategory.reduce((acc, violation) => {
      const category = violation.kategori;
      const count = violation._count.reports;
      acc[category] = (acc[category] || 0) + count;
      return acc;
    }, {});

    const categoryArray = Object.entries(categoryStats).map(
      ([kategori, count]) => ({
        kategori,
        count,
      })
    );

    // Get most frequent violations
    const topViolations = await prisma.violation.findMany({
      include: {
        _count: {
          select: {
            reports: {
              where: {
                tipe: "violation",
                createdAt: {
                  gte: startDate,
                },
              },
            },
          },
        },
      },
      orderBy: {
        reports: {
          _count: "desc",
        },
      },
      take: 10,
    });

    res.json({
      trends: trendsArray,
      byCategory: categoryArray,
      topViolations: topViolations.map((v) => ({
        id: v.id,
        nama: v.nama,
        kategori: v.kategori,
        point: v.point,
        count: v._count.reports,
      })),
    });
  } catch (err) {
    console.error("Error getting violation trends:", err);
    res.status(500).json({ error: "Failed to fetch violation trends" });
  }
};

// Get all classrooms with student statistics
const getClassrooms = async (req, res) => {
  try {
    const classrooms = await prisma.classroom.findMany({
      include: {
        _count: {
          select: {
            students: true,
          },
        },
        students: {
          include: {
            reports: {
              include: {
                violation: true,
                achievement: true,
              },
            },
          },
        },
        waliKelas: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        namaKelas: "asc",
      },
    });

    // Calculate statistics for each classroom
    const classroomStats = classrooms.map((classroom) => {
      let totalViolationPoints = 0;
      let totalAchievementPoints = 0;
      let highRiskStudents = 0;
      let mediumRiskStudents = 0;
      let lowRiskStudents = 0;

      classroom.students.forEach((student) => {
        // Separate violation and achievement reports
        const violationReports = student.reports.filter(
          (r) => r.tipe === "violation"
        );
        const achievementReports = student.reports.filter(
          (r) => r.tipe === "achievement"
        );

        // Calculate student's total violation points
        const studentViolationPoints = violationReports.reduce(
          (sum, sv) => sum + (sv.pointSaat || sv.violation?.point || 0),
          0
        );

        // Calculate student's total achievement points
        const studentAchievementPoints = achievementReports.reduce(
          (sum, sa) => sum + (sa.pointSaat || sa.achievement?.point || 0),
          0
        );

        totalViolationPoints += studentViolationPoints;
        totalAchievementPoints += studentAchievementPoints;

        // Determine risk level
        const totalScore = studentAchievementPoints - studentViolationPoints;
        if (studentViolationPoints >= 100 || totalScore <= -50) {
          highRiskStudents++;
        } else if (studentViolationPoints >= 50 || totalScore <= -20) {
          mediumRiskStudents++;
        } else {
          lowRiskStudents++;
        }
      });

      return {
        id: classroom.id,
        kodeKelas: classroom.kodeKelas,
        namaKelas: classroom.namaKelas,
        jmlSiswa: classroom.jmlSiswa,
        waliKelas: classroom.waliKelas?.user?.name || null,
        totalStudents: classroom._count.students,
        totalViolationPoints,
        totalAchievementPoints,
        averageScore:
          classroom._count.students > 0
            ? Math.round(
                (totalAchievementPoints - totalViolationPoints) /
                  classroom._count.students
              )
            : 0,
        riskDistribution: {
          high: highRiskStudents,
          medium: mediumRiskStudents,
          low: lowRiskStudents,
        },
      };
    });

    res.json({
      message: "Classrooms retrieved successfully",
      data: classroomStats,
    });
  } catch (err) {
    console.error("Error getting classrooms:", err);
    res.status(500).json({ error: "Failed to fetch classrooms" });
  }
};

module.exports = {
  getBKDashboard,
  getStudentsForMonitoring,
  getStudentDetailForBK,
  getViolationTrends,
  getClassrooms,
};
