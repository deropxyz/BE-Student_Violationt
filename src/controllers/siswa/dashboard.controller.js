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
        totalScore: true,
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        classroom: {
          select: {
            id: true,
            kodeKelas: true,
            waliKelas: {
              select: {
                user: {
                  select: {
                    name: true,
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
          where: {
            status: "approved",
          },
          select: {
            id: true,
            pointSaat: true,
            deskripsi: true,
            tanggal: true,
            createdAt: true,
            item: {
              select: {
                nama: true,
                tipe: true,
                kategori: {
                  select: {
                    nama: true,
                  },
                },
                jenis: true,
                point: true,
              },
            },
            reporter: {
              select: {
                name: true,
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
    const violations = reports.filter(
      (report) => report.item.tipe === "pelanggaran"
    );
    const achievements = reports.filter(
      (report) => report.item.tipe === "prestasi"
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
        (sum, v) => sum + (v.pointSaat || v.item?.point || 0),
        0
      ),
      totalAchievementPoints: achievements.reduce(
        (sum, a) => sum + (a.pointSaat || a.item?.point || 0),
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
      creditScore: studentData.totalScore, // ambil dari database
    };

    // Determine risk level
    let riskLevel = "LOW";
    if (statistics.totalViolationPoints <= -200) riskLevel = "HIGH";
    else if (statistics.totalViolationPoints <= -100) riskLevel = "MEDIUM";

    // Recent activity (gabungan violations dan achievements)
    const recentActivity = [
      ...violations.map((v) => ({
        ...v,
        type: "violation",
        itemName: v.item?.nama,
        points: -(v.pointSaat || v.item?.point || 0),
      })),
      ...achievements.map((a) => ({
        ...a,
        type: "achievement",
        itemName: a.item?.nama,
        points: a.pointSaat || a.item?.point || 0,
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
        kelas: studentData.classroom?.kodeKelas || null,
        angkatan: studentData.angkatan?.tahun || null,
        waliKelas: studentData.classroom?.waliKelas?.user?.name || null,
        classroomId: studentData.classroom?.id || null,
        angkatanId: studentData.angkatan?.id || null,
      },

      // Statistik lengkap
      summary: {
        ...statistics,
        riskLevel,
        totalScore: studentData.totalScore, // ambil dari database
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
// Get detail laporan milik siswa yang login
const getMyReportDetail = async (req, res) => {
  const userId = req.user.id;
  const { reportId } = req.params;
  try {
    // Cari student berdasarkan userId
    const student = await prisma.student.findUnique({
      where: { userId: userId },
      select: { id: true },
    });
    if (!student) {
      return res.status(404).json({ error: "Data siswa tidak ditemukan" });
    }
    // Ambil detail laporan milik siswa ini
    const report = await prisma.studentReport.findUnique({
      where: { id: parseInt(reportId) },
      include: {
        item: { include: { kategori: true } },
        reporter: { select: { name: true, role: true } },
        bukti: true,
        student: {
          select: {
            nisn: true,
            user: { select: { name: true } },
            classroom: { select: { kodeKelas: true } },
            angkatan: { select: { tahun: true } },
          },
        },
      },
    });
    if (!report || report.studentId !== student.id) {
      return res
        .status(404)
        .json({ error: "Laporan tidak ditemukan atau bukan milik Anda" });
    }
    const detail = {
      id: report.id,
      tanggal: report.tanggal,
      waktu: report.waktu,
      deskripsi: report.deskripsi,
      pointSaat: report.pointSaat,
      item: {
        nama: report.item.nama,
        tipe: report.item.tipe,
        kategori: report.item.kategori?.nama,
        jenis: report.item.jenis,
        point: report.item.point,
      },
      reporter: report.reporter.name,
      reporterRole: report.reporter.role,
      bukti: report.bukti,
      student: {
        nisn: report.student.nisn,
        nama: report.student.user.name,
        kelas: report.student.classroom?.kodeKelas,
        angkatan: report.student.angkatan?.tahun,
      },
    };
    res.json({ success: true, data: detail });
  } catch (err) {
    console.error("Error fetching report detail:", err);
    res.status(500).json({ error: "Gagal mengambil detail laporan" });
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
          status: "approved", // Only show approved reports
          item: {
            tipe: "pelanggaran",
          },
        },
        include: {
          item: {
            include: {
              kategori: true,
            },
          },
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
          status: "approved",
          item: {
            tipe: "pelanggaran",
          },
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
          status: "approved", // Only show approved reports
          item: {
            tipe: "prestasi",
          },
        },
        include: {
          item: {
            include: {
              kategori: true,
            },
          },
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
          status: "approved",
          item: {
            tipe: "prestasi",
          },
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

// Get Surat Peringatan milik siswa yang login
const getMySuratPeringatan = async (req, res) => {
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
    // Ambil semua surat peringatan milik siswa ini
    const suratPeringatan = await prisma.suratPeringatan.findMany({
      where: { studentId: student.id },
      orderBy: { tingkatSurat: "desc" },
    });
    res.json({ data: suratPeringatan });
  } catch (err) {
    console.error("Error fetching surat peringatan:", err);
    res.status(500).json({ error: "Gagal mengambil surat peringatan" });
  }
};

module.exports = {
  getMyDashboard,
  getMyViolations,
  getMyAchievements,
  getMySuratPeringatan,
  getMySuratPeringatan,
  getMyReportDetail,
};
