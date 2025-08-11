const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// BK Monitoring Functions
const getBKDashboard = async (req, res) => {
  try {
    // Get overview statistics
    const stats = await Promise.all([
      // Total students
      prisma.student.count(),

      // Students by risk level
      prisma.student.count({
        where: {
          violations: {
            some: {
              violation: {
                point: { gte: 50 },
              },
            },
          },
        },
      }),

      // Violations this month
      prisma.studentViolation.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),

      // Achievements this month
      prisma.studentAchievement.count({
        where: {
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
              studentViolations: {
                where: {
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
          studentViolations: {
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
              nama: true,
            },
          },
          _count: {
            select: {
              violations: true,
              achievements: true,
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
      overview: {
        totalStudents: stats[0],
        highRiskStudents: stats[1],
        violationsThisMonth: stats[2],
        achievementsThisMonth: stats[3],
      },
      topViolations: stats[4].map((v) => ({
        id: v.id,
        nama: v.nama,
        kategori: v.kategori,
        point: v.point,
        count: v._count.studentViolations,
      })),
      studentsNeedingAttention: stats[5].map((s) => ({
        id: s.id,
        nisn: s.nisn,
        nama: s.user?.name,
        kelas: s.classroom?.nama,
        totalScore: s.totalScore,
        violationCount: s._count.violations,
        achievementCount: s._count.achievements,
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
      page = 1,
      limit = 10,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = {};
    if (classroomId) filter.classroomId = parseInt(classroomId);
    if (angkatanId) filter.angkatanId = parseInt(angkatanId);

    // Add risk level filter
    if (riskLevel) {
      if (riskLevel === "HIGH") {
        filter.totalScore = { lt: -50 };
      } else if (riskLevel === "MEDIUM") {
        filter.totalScore = { gte: -50, lt: -25 };
      } else if (riskLevel === "LOW") {
        filter.totalScore = { gte: -25 };
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
              nama: true,
            },
          },
          angkatan: {
            select: {
              tahun: true,
            },
          },
          _count: {
            select: {
              violations: true,
              achievements: true,
            },
          },
          violations: {
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
      else if (s.totalScore < -25) riskLevel = "MEDIUM";

      return {
        id: s.id,
        nisn: s.nisn,
        nama: s.user?.name,
        email: s.user?.email,
        kelas: s.classroom?.nama,
        angkatan: s.angkatan?.tahun,
        totalScore: s.totalScore,
        riskLevel,
        violationCount: s._count.violations,
        achievementCount: s._count.achievements,
        recentViolations: s.violations.map((v) => ({
          nama: v.violation.nama,
          point: v.violation.point,
          tanggal: v.createdAt,
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
            nama: true,
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
        violations: {
          include: {
            violation: true,
            reporter: {
              select: {
                name: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        achievements: {
          include: {
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
    const violations = student.violations || [];
    const achievements = student.achievements || [];

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
        kelas: student.classroom?.nama,
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
      violations: student.violations,
      achievements: student.achievements,
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

    // Get violation trends
    const violationTrends = await prisma.studentViolation.groupBy({
      by: ["createdAt"],
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      _count: true,
      orderBy: {
        createdAt: "asc",
      },
    });

    // Get violation by category
    const violationsByCategory = await prisma.violation.groupBy({
      by: ["kategori"],
      _count: {
        studentViolations: true,
      },
      where: {
        studentViolations: {
          some: {
            createdAt: {
              gte: startDate,
            },
          },
        },
      },
    });

    // Get most frequent violations
    const topViolations = await prisma.violation.findMany({
      include: {
        _count: {
          select: {
            studentViolations: {
              where: {
                createdAt: {
                  gte: startDate,
                },
              },
            },
          },
        },
      },
      orderBy: {
        studentViolations: {
          _count: "desc",
        },
      },
      take: 10,
    });

    res.json({
      trends: violationTrends,
      byCategory: violationsByCategory,
      topViolations: topViolations.map((v) => ({
        id: v.id,
        nama: v.nama,
        kategori: v.kategori,
        point: v.point,
        count: v._count.studentViolations,
      })),
    });
  } catch (err) {
    console.error("Error getting violation trends:", err);
    res.status(500).json({ error: "Failed to fetch violation trends" });
  }
};

module.exports = {
  getBKDashboard,
  getStudentsForMonitoring,
  getStudentDetailForBK,
  getViolationTrends,
};
