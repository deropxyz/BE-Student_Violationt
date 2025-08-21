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
        classrooms: {
          include: {
            students: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const isWaliKelas = teacher.classrooms.length > 0;

    // Base statistics
    const stats = {
      isWaliKelas,
      teacherInfo: {
        name: teacher.user.name,
        email: teacher.user.email,
        nip: teacher.nip,
        noHp: teacher.noHp,
      },
    };

    if (isWaliKelas) {
      // Wali Kelas specific dashboard
      const classroom = teacher.classrooms[0]; // Ambil kelas pertama (seharusnya hanya 1)
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
        prisma.studentReport.findMany({
          where: {
            student: {
              classroomId: classroom.id,
            },
            tipe: "violation",
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
            reporter: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        prisma.studentReport.findMany({
          where: {
            student: {
              classroomId: classroom.id,
            },
            tipe: "achievement",
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
            reporter: true,
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
          violationCount: 0, // Will be calculated separately
          achievementCount: 0, // Will be calculated separately
        }));

      stats.classroom = {
        id: classroom.id,
        nama: classroom.namaKelas,
        statistics: classroomStats,
        studentsNeedingAttention,
        recentViolations: recentViolations.map((v) => ({
          id: v.id,
          studentName: v.student.user.name,
          violationName: v.violation?.nama || "Unknown",
          point: v.pointSaat,
          tanggal: v.tanggal,
          createdAt: v.createdAt,
        })),
        recentAchievements: recentAchievements.map((a) => ({
          id: a.id,
          studentName: a.student.user.name,
          achievementName: a.achievement?.nama || "Unknown",
          point: a.pointSaat,
          tanggal: a.tanggal,
          createdAt: a.createdAt,
        })),
      };
    } else {
      // Regular teacher dashboard
      const [totalStudents, violationsThisMonth, achievementsThisMonth] =
        await Promise.all([
          prisma.student.count(),
          prisma.studentReport.count({
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
          }),
          prisma.studentReport.count({
            where: {
              tipe: "achievement",
              createdAt: {
                gte: new Date(
                  new Date().getFullYear(),
                  new Date().getMonth(),
                  1
                ),
              },
            },
          }),
        ]);

      stats.generalStats = {
        totalStudents,
        violationsThisMonth,
        achievementsThisMonth,
      };
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
        classrooms: true,
      },
    });

    if (!teacher || teacher.classrooms.length === 0) {
      return res
        .status(403)
        .json({ error: "You are not assigned as wali kelas" });
    }

    const classroom = teacher.classrooms[0]; // Ambil kelas pertama

    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where: { classroomId: classroom.id },
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
          reports: {
            where: { tipe: "violation" },
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
      prisma.student.count({ where: { classroomId: classroom.id } }),
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
        violationCount: s.reports.length,
        achievementCount: 0, // Will need separate query for achievements
        recentViolations: s.reports.map((r) => ({
          nama: r.violation?.nama || "Unknown",
          point: r.violation?.point || 0,
          tanggal: r.createdAt,
        })),
      };
    });

    res.json({
      classroom: classroom.namaKelas,
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
        classrooms: {
          include: {
            students: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!teacher || teacher.classrooms.length === 0) {
      return res
        .status(403)
        .json({ error: "You are not assigned as wali kelas" });
    }

    const classroom = teacher.classrooms[0];
    const students = classroom.students;

    // Calculate detailed statistics
    const stats = {
      overview: {
        className: classroom.namaKelas,
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
