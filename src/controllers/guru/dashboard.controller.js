const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Guru Dashboard - untuk wali kelas dan guru biasa
const getGuruDashboard = async (req, res) => {
  const userId = req.user.id;

  try {
    // Check if user is a teacher
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: {
        user: true,
        waliKelas: {
          include: {
            students: {
              include: {
                user: true,
                _count: {
                  select: {
                    violations: true,
                    achievements: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const isWaliKelas = !!teacher.waliKelas;

    // Base statistics
    const stats = {
      isWaliKelas,
      teacherInfo: {
        name: teacher.user.name,
        email: teacher.user.email,
        nip: teacher.nip,
        mapel: teacher.mapel,
      },
    };

    if (isWaliKelas) {
      // Wali Kelas specific dashboard
      const classroom = teacher.waliKelas;
      const students = classroom.students;

      // Calculate classroom statistics
      const now = new Date();
      const oneMonthAgo = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        now.getDate()
      );

      const classroomStats = {
        totalStudents: students.length,
        maleStudents: students.filter((s) => s.gender === "L").length,
        femaleStudents: students.filter((s) => s.gender === "P").length,
        highRiskStudents: students.filter((s) => s.totalScore < -25).length,
        mediumRiskStudents: students.filter(
          (s) => s.totalScore >= -25 && s.totalScore < 0
        ).length,
        lowRiskStudents: students.filter((s) => s.totalScore >= 0).length,
      };

      // Get recent violations and achievements for the class
      const [recentViolations, recentAchievements] = await Promise.all([
        prisma.studentViolation.findMany({
          where: {
            student: {
              classroomId: classroom.id,
            },
            createdAt: {
              gte: oneMonthAgo,
            },
          },
          include: {
            violation: true,
            student: {
              include: {
                user: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        prisma.studentAchievement.findMany({
          where: {
            student: {
              classroomId: classroom.id,
            },
            createdAt: {
              gte: oneMonthAgo,
            },
          },
          include: {
            achievement: true,
            student: {
              include: {
                user: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

      // Students that need attention
      const studentsNeedingAttention = students
        .filter((s) => s.totalScore < -15)
        .sort((a, b) => a.totalScore - b.totalScore)
        .slice(0, 5)
        .map((s) => ({
          id: s.id,
          nisn: s.nisn,
          nama: s.user.name,
          totalScore: s.totalScore,
          violationCount: s._count.violations,
          achievementCount: s._count.achievements,
        }));

      stats.classroom = {
        id: classroom.id,
        nama: classroom.nama,
        statistics: classroomStats,
        studentsNeedingAttention,
        recentViolations: recentViolations.map((v) => ({
          id: v.id,
          studentName: v.student.user.name,
          violationName: v.violation.nama,
          point: v.pointSaat,
          tanggal: v.tanggal,
          createdAt: v.createdAt,
        })),
        recentAchievements: recentAchievements.map((a) => ({
          id: a.id,
          studentName: a.student.user.name,
          achievementName: a.achievement.nama,
          point: a.pointSaat,
          tanggal: a.tanggal,
          createdAt: a.createdAt,
        })),
      };
    } else {
      // Regular teacher dashboard
      stats.generalStats = await Promise.all([
        prisma.student.count(),
        prisma.studentViolation.count({
          where: {
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
        prisma.studentAchievement.count({
          where: {
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
      ]).then(
        ([totalStudents, violationsThisMonth, achievementsThisMonth]) => ({
          totalStudents,
          violationsThisMonth,
          achievementsThisMonth,
        })
      );
    }

    res.json(stats);
  } catch (err) {
    console.error("Error getting guru dashboard:", err);
    res.status(500).json({ error: "Failed to fetch dashboard" });
  }
};

const getMyClassStudents = async (req, res) => {
  const userId = req.user.id;

  try {
    // Check if user is wali kelas
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: {
        waliKelas: true,
      },
    });

    if (!teacher || !teacher.waliKelas) {
      return res
        .status(403)
        .json({ error: "You are not assigned as wali kelas" });
    }

    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where: { classroomId: teacher.waliKelas.id },
        include: {
          user: {
            select: {
              name: true,
              email: true,
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
            orderBy: { createdAt: "desc" },
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
        orderBy: { nisn: "asc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.student.count({ where: { classroomId: teacher.waliKelas.id } }),
    ]);

    const formattedStudents = students.map((s) => {
      let riskLevel = "LOW";
      if (s.totalScore < -50) riskLevel = "HIGH";
      else if (s.totalScore < -25) riskLevel = "MEDIUM";

      return {
        id: s.id,
        nisn: s.nisn,
        nama: s.user.name,
        email: s.user.email,
        jenisKelamin: s.gender,
        alamat: s.alamat,
        noHp: s.noHp,
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
      classroom: teacher.waliKelas.nama,
      data: formattedStudents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Error getting class students:", err);
    res.status(500).json({ error: "Failed to fetch class students" });
  }
};

const getClassStatistics = async (req, res) => {
  const userId = req.user.id;

  try {
    // Check if user is wali kelas
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: {
        waliKelas: {
          include: {
            students: {
              include: {
                _count: {
                  select: {
                    violations: true,
                    achievements: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!teacher || !teacher.waliKelas) {
      return res
        .status(403)
        .json({ error: "You are not assigned as wali kelas" });
    }

    const classroom = teacher.waliKelas;
    const students = classroom.students;

    // Calculate detailed statistics
    const stats = {
      overview: {
        className: classroom.nama,
        totalStudents: students.length,
        maleStudents: students.filter((s) => s.gender === "L").length,
        femaleStudents: students.filter((s) => s.gender === "P").length,
      },

      riskLevels: {
        high: students.filter((s) => s.totalScore < -50).length,
        medium: students.filter(
          (s) => s.totalScore >= -50 && s.totalScore < -25
        ).length,
        low: students.filter((s) => s.totalScore >= -25).length,
      },

      performance: {
        totalViolations: students.reduce(
          (sum, s) => sum + s._count.violations,
          0
        ),
        totalAchievements: students.reduce(
          (sum, s) => sum + s._count.achievements,
          0
        ),
        averageScore:
          students.length > 0
            ? (
                students.reduce((sum, s) => sum + s.totalScore, 0) /
                students.length
              ).toFixed(2)
            : 0,
        topPerformers: students
          .sort((a, b) => b.totalScore - a.totalScore)
          .slice(0, 5)
          .map((s) => ({
            nisn: s.nisn,
            nama: s.user?.name,
            totalScore: s.totalScore,
          })),
        needsAttention: students
          .filter((s) => s.totalScore < -15)
          .sort((a, b) => a.totalScore - b.totalScore)
          .slice(0, 5)
          .map((s) => ({
            nisn: s.nisn,
            nama: s.user?.name,
            totalScore: s.totalScore,
            violationCount: s._count.violations,
          })),
      },
    };

    res.json(stats);
  } catch (err) {
    console.error("Error getting class statistics:", err);
    res.status(500).json({ error: "Failed to fetch class statistics" });
  }
};

module.exports = {
  getGuruDashboard,
  getMyClassStudents,
  getClassStatistics,
};
