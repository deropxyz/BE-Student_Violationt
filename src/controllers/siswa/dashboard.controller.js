const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Student Dashboard - Comprehensive Data
const getMyDashboard = async (req, res) => {
  const userId = req.user.id;

  try {
    // Cari student berdasarkan userId
    const student = await prisma.student.findUnique({
      where: { userId: userId },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({ error: "Data siswa tidak ditemukan" });
    }

    // Ambil data student lengkap dengan semua relasi
    const studentData = await prisma.student.findUnique({
      where: {
        id: student.id,
      },
      select: {
        id: true,
        nisn: true,
        gender: true,
        tempatLahir: true,
        tglLahir: true,
        alamat: true,
        noHp: true,
        totalScore: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        classroom: {
          select: {
            id: true,
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
            id: true,
            tahun: true,
          },
        },

        // Semua laporan siswa (pelanggaran dan prestasi)
        reports: {
          select: {
            id: true,
            tipe: true,
            pointSaat: true,
            deskripsi: true,
            tanggal: true,
            createdAt: true,
            violation: {
              select: {
                nama: true,
                kategori: true,
                jenis: true,
                point: true,
              },
            },
            achievement: {
              select: {
                nama: true,
                kategori: true,
                point: true,
              },
            },
            reporter: {
              select: {
                name: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!studentData) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Kalkulasi statistik dari data yang sudah diambil
    const reports = studentData.reports || [];
    const violations = reports.filter((report) => report.tipe === "violation");
    const achievements = reports.filter(
      (report) => report.tipe === "achievement"
    );

    const now = new Date();
    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const statistics = {
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
      violationsThisWeek: violations.filter(
        (v) => new Date(v.createdAt) >= oneWeekAgo
      ).length,
      achievementsThisWeek: achievements.filter(
        (a) => new Date(a.createdAt) >= oneWeekAgo
      ).length,
    };

    statistics.creditScore =
      statistics.totalAchievementPoints - statistics.totalViolationPoints;

    // Determine risk level
    let riskLevel = "LOW";
    if (statistics.totalViolationPoints >= 50) riskLevel = "HIGH";
    else if (statistics.totalViolationPoints >= 25) riskLevel = "MEDIUM";

    // Recent activity (gabungan violations dan achievements)
    const recentActivity = [
      ...violations.map((v) => ({
        ...v,
        type: "violation",
        itemName: v.violation?.nama,
        points: -(v.pointSaat || v.violation?.point || 0),
      })),
      ...achievements.map((a) => ({
        ...a,
        type: "achievement",
        itemName: a.achievement?.nama,
        points: a.pointSaat || a.achievement?.point || 0,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    // Format response dengan data yang diminta
    const response = {
      // Info dasar siswa
      student: {
        id: studentData.id,
        nisn: studentData.nisn,
        nama: studentData.user?.name || null,
        jenisKelamin: studentData.gender,
        tempatLahir: studentData.tempatLahir,
        tglLahir: studentData.tglLahir,
        alamat: studentData.alamat,
        noHp: studentData.noHp,
        email: studentData.user?.email || null,
        kelas: studentData.classroom?.namaKelas || null,
        angkatan: studentData.angkatan?.tahun || null,
        waliKelas: studentData.classroom?.waliKelas?.user?.name || null,
        classroomId: studentData.classroom?.id || null,
        angkatanId: studentData.angkatan?.id || null,
      },

      // Statistik lengkap
      summary: {
        ...statistics,
        riskLevel,
        totalScore: statistics.creditScore,
      },

      // Data mentah untuk frontend processing
      violations: violations,
      achievements: achievements,

      // Data yang sudah diproses untuk kemudahan frontend
      recentActivity,

      // Score history (bisa ditambahkan jika ada tabel scoreHistory)
      scoreHistory: [], // Placeholder for future implementation

      // Tindakan otomatis (bisa ditambahkan jika ada tabel tindakanOtomatis)
      tindakanOtomatis: [], // Placeholder for future implementation
    };

    res.json(response);
  } catch (err) {
    console.error("Error fetching my dashboard:", err);
    res.status(500).json({ error: "Failed to fetch dashboard" });
  }
};

// Get My Violations
const getMyViolations = async (req, res) => {
  const userId = req.user.id;

  try {
    // Cari student berdasarkan userId
    const student = await prisma.student.findUnique({
      where: { userId: userId },
    });

    if (!student) {
      return res.status(404).json({ error: "Data siswa tidak ditemukan" });
    }

    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [violations, total] = await Promise.all([
      prisma.studentReport.findMany({
        where: {
          studentId: student.id,
          tipe: "violation",
        },
        include: {
          violation: true,
          reporter: {
            select: {
              name: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: parseInt(limit),
      }),
      prisma.studentReport.count({
        where: {
          studentId: student.id,
          tipe: "violation",
        },
      }),
    ]);

    res.json({
      data: violations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Error getting student violations:", err);
    res.status(500).json({ error: "Gagal mengambil riwayat pelanggaran" });
  }
};

// Get My Achievements
const getMyAchievements = async (req, res) => {
  const userId = req.user.id;

  try {
    // Cari student berdasarkan userId
    const student = await prisma.student.findUnique({
      where: { userId: userId },
    });

    if (!student) {
      return res.status(404).json({ error: "Data siswa tidak ditemukan" });
    }

    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [achievements, total] = await Promise.all([
      prisma.studentReport.findMany({
        where: {
          studentId: student.id,
          tipe: "achievement",
        },
        include: {
          achievement: true,
          reporter: {
            select: {
              name: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: parseInt(limit),
      }),
      prisma.studentReport.count({
        where: {
          studentId: student.id,
          tipe: "achievement",
        },
      }),
    ]);

    res.json({
      data: achievements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Error getting student achievements:", err);
    res.status(500).json({ error: "Gagal mengambil riwayat prestasi" });
  }
};

module.exports = {
  getMyDashboard,
  getMyViolations,
  getMyAchievements,
};
