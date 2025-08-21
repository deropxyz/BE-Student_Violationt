const { PrismaClient } = require("@prisma/client");
const {
  validateActiveAcademicYear,
  getTargetAcademicYear,
  canCreateReports,
} = require("../../utils/academicYearUtils");
const prisma = new PrismaClient();

// Report Student - Create violation or achievement report
const reportStudent = async (req, res) => {
  const userId = req.user.id;
  const {
    studentId,
    tipe, // "violation" atau "achievement"
    violationId,
    achievementId,
    tanggal,
    waktu,
    deskripsi,
    bukti,
  } = req.body;

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

    // Verify teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Check if student is archived (graduated)
    if (student.isArchived) {
      return res.status(400).json({
        error: "Cannot create report for graduated student",
        message: "This student has graduated and cannot be reported",
      });
    }

    // Validate required fields based on type
    if (tipe === "violation" && !violationId) {
      return res
        .status(400)
        .json({ error: "Violation ID is required for violation reports" });
    }

    if (tipe === "achievement" && !achievementId) {
      return res
        .status(400)
        .json({ error: "Achievement ID is required for achievement reports" });
    }

    // Get point value based on type
    let pointSaat = 0;
    if (tipe === "violation") {
      const violation = await prisma.violation.findUnique({
        where: { id: parseInt(violationId) },
      });
      if (!violation) {
        return res.status(404).json({ error: "Violation not found" });
      }
      pointSaat = -Math.abs(violation.point); // Violations are negative points
      console.log(
        `🔴 VIOLATION: ${violation.nama} - Original point: ${violation.point}, Applied point: ${pointSaat}`
      );
    } else if (tipe === "achievement") {
      const achievement = await prisma.achievement.findUnique({
        where: { id: parseInt(achievementId) },
      });
      if (!achievement) {
        return res.status(404).json({ error: "Achievement not found" });
      }
      pointSaat = Math.abs(achievement.point); // Achievements are positive points
      console.log(
        `🟢 ACHIEVEMENT: ${achievement.nama} - Original point: ${achievement.point}, Applied point: ${pointSaat}`
      );
    }

    // Validate and process date fields
    let processedTanggal = new Date();
    if (tanggal && tanggal.trim() !== "") {
      const tanggalDate = new Date(tanggal);
      if (!isNaN(tanggalDate.getTime())) {
        processedTanggal = tanggalDate;
      } else {
        return res.status(400).json({ error: "Invalid date format" });
      }
    }

    // Validate and process waktu field
    let processedWaktu = null;
    if (waktu && waktu.trim() !== "") {
      // If waktu is in HH:MM format, combine it with the date
      if (waktu.includes(":") && waktu.length <= 5) {
        const [hours, minutes] = waktu.split(":").map(Number);
        if (
          !isNaN(hours) &&
          !isNaN(minutes) &&
          hours >= 0 &&
          hours <= 23 &&
          minutes >= 0 &&
          minutes <= 59
        ) {
          processedWaktu = new Date(processedTanggal);
          processedWaktu.setHours(hours, minutes, 0, 0);
        } else {
          return res
            .status(400)
            .json({ error: "Invalid time format. Use HH:MM format." });
        }
      } else {
        // Try to parse as full datetime
        const waktuDate = new Date(waktu);
        if (!isNaN(waktuDate.getTime())) {
          processedWaktu = waktuDate;
        } else {
          return res.status(400).json({ error: "Invalid time format" });
        }
      }
    }

    // Create the report
    console.log(
      `📝 Creating report - Student: ${studentId}, Type: ${tipe}, PointSaat: ${pointSaat}`
    );
    const report = await prisma.studentReport.create({
      data: {
        studentId: parseInt(studentId),
        reporterId: userId,
        tipe,
        violationId: tipe === "violation" ? parseInt(violationId) : null,
        achievementId: tipe === "achievement" ? parseInt(achievementId) : null,
        tahunAjaranId: activeYear.id, // ✅ NEW: Add academic year relation
        tanggal: processedTanggal,
        waktu: processedWaktu,
        deskripsi,
        bukti,
        pointSaat,
      },
      include: {
        student: {
          include: {
            user: true,
            classroom: true,
          },
        },
        violation: true,
        achievement: true,
        reporter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Update student's total score
    console.log(
      `📊 Updating student score - Old: ${
        student.totalScore
      }, Change: ${pointSaat}, New: ${student.totalScore + pointSaat}`
    );
    await prisma.student.update({
      where: { id: parseInt(studentId) },
      data: {
        totalScore: {
          increment: pointSaat,
        },
      },
    });

    // Create score history record
    await prisma.scoreHistory.create({
      data: {
        studentId: parseInt(studentId),
        pointLama: student.totalScore,
        pointBaru: student.totalScore + pointSaat,
        alasan: tipe === "violation" ? "Pelanggaran" : "Prestasi",
      },
    });

    res.status(201).json({
      message: `${
        tipe === "violation" ? "Violation" : "Achievement"
      } report created successfully`,
      data: report,
    });
  } catch (err) {
    console.error("Error creating student report:", err);
    res.status(500).json({ error: "Failed to create report" });
  }
};

// Get My Reports - All reports created by this teacher
const getMyReports = async (req, res) => {
  const userId = req.user.id;
  const {
    page = 1,
    limit = 10,
    tipe, // filter by "violation" or "achievement"
    startDate,
    endDate,
    studentId,
  } = req.query;

  try {
    // Verify teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const whereClause = {
      reporterId: userId,
    };

    if (tipe) {
      whereClause.tipe = tipe;
    }

    if (studentId) {
      whereClause.studentId = parseInt(studentId);
    }

    if (startDate || endDate) {
      whereClause.tanggal = {};
      if (startDate) {
        whereClause.tanggal.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.tanggal.lte = new Date(endDate);
      }
    }

    // Get reports with pagination
    const [reports, total] = await Promise.all([
      prisma.studentReport.findMany({
        where: whereClause,
        include: {
          student: {
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
            },
          },
          violation: {
            select: {
              nama: true,
              kategori: true,
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
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.studentReport.count({ where: whereClause }),
    ]);

    // Format the response
    const formattedReports = reports.map((report) => ({
      id: report.id,
      tipe: report.tipe,
      student: {
        id: report.student.id,
        nisn: report.student.nisn,
        name: report.student.user.name,
        className: report.student.classroom.namaKelas,
      },
      item:
        report.tipe === "violation"
          ? {
              id: report.violation?.id,
              nama: report.violation?.nama,
              kategori: report.violation?.kategori,
              point: report.violation?.point,
            }
          : {
              id: report.achievement?.id,
              nama: report.achievement?.nama,
              kategori: report.achievement?.kategori,
              point: report.achievement?.point,
            },
      tanggal: report.tanggal,
      waktu: report.waktu,
      deskripsi: report.deskripsi,
      bukti: report.bukti,
      pointSaat: report.pointSaat,
      createdAt: report.createdAt,
    }));

    res.json({
      data: formattedReports,
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
    console.error("Error getting my reports:", err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
};

// Get Teacher Profile
const getProfile = async (req, res) => {
  const userId = req.user.id;

  try {
    const teacher = await prisma.teacher.findUnique({
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
        classrooms: {
          include: {
            students: {
              select: {
                id: true,
                nisn: true,
                user: {
                  select: {
                    name: true,
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

    // Get teacher statistics
    const [totalReports, violationReports, achievementReports, recentReports] =
      await Promise.all([
        prisma.studentReport.count({
          where: { reporterId: userId },
        }),
        prisma.studentReport.count({
          where: { reporterId: userId, tipe: "violation" },
        }),
        prisma.studentReport.count({
          where: { reporterId: userId, tipe: "achievement" },
        }),
        prisma.studentReport.findMany({
          where: { reporterId: userId },
          include: {
            student: {
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            violation: {
              select: {
                nama: true,
              },
            },
            achievement: {
              select: {
                nama: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

    res.json({
      profile: {
        id: teacher.id,
        nip: teacher.nip,
        noHp: teacher.noHp,
        alamat: teacher.alamat,
        user: teacher.user,
      },
      classroom:
        teacher.classrooms.length > 0
          ? {
              id: teacher.classrooms[0].id,
              namaKelas: teacher.classrooms[0].namaKelas,
              totalStudents: teacher.classrooms[0].students.length,
              students: teacher.classrooms[0].students,
            }
          : null,
      statistics: {
        totalReports,
        violationReports,
        achievementReports,
        reportsThisMonth: await prisma.studentReport.count({
          where: {
            reporterId: userId,
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
      },
      recentActivity: recentReports.map((report) => ({
        id: report.id,
        tipe: report.tipe,
        studentName: report.student.user.name,
        itemName: report.violation?.nama || report.achievement?.nama,
        tanggal: report.tanggal,
        createdAt: report.createdAt,
      })),
    });
  } catch (err) {
    console.error("Error getting teacher profile:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

// Update Teacher Profile
const updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { name, email, noHp, alamat } = req.body;

  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Update user data and teacher data in a transaction
    const updatedTeacher = await prisma.$transaction(async (tx) => {
      // Update user data
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          ...(name && { name }),
          ...(email && { email }),
        },
      });

      // Update teacher data
      const updatedTeacher = await tx.teacher.update({
        where: { userId },
        data: {
          ...(noHp && { noHp }),
          ...(alamat && { alamat }),
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      return updatedTeacher;
    });

    res.json({
      message: "Profile updated successfully",
      data: {
        id: updatedTeacher.id,
        nip: updatedTeacher.nip,
        noHp: updatedTeacher.noHp,
        alamat: updatedTeacher.alamat,
        user: updatedTeacher.user,
      },
    });
  } catch (err) {
    console.error("Error updating teacher profile:", err);
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "Failed to update profile" });
  }
};

// Get Available Violations for Reporting
const getViolations = async (req, res) => {
  try {
    const violations = await prisma.violation.findMany({
      where: { isActive: true },
      orderBy: [{ kategori: "asc" }, { point: "desc" }],
    });

    // Group by category
    const groupedViolations = violations.reduce((acc, violation) => {
      if (!acc[violation.kategori]) {
        acc[violation.kategori] = [];
      }
      acc[violation.kategori].push(violation);
      return acc;
    }, {});

    res.json({
      violations,
      groupedByCategory: groupedViolations,
    });
  } catch (err) {
    console.error("Error getting violations:", err);
    res.status(500).json({ error: "Failed to fetch violations" });
  }
};

// Get Available Achievements for Reporting
const getAchievements = async (req, res) => {
  try {
    const achievements = await prisma.achievement.findMany({
      where: { isActive: true },
      orderBy: [{ kategori: "asc" }, { point: "desc" }],
    });

    // Group by category
    const groupedAchievements = achievements.reduce((acc, achievement) => {
      if (!acc[achievement.kategori]) {
        acc[achievement.kategori] = [];
      }
      acc[achievement.kategori].push(achievement);
      return acc;
    }, {});

    res.json({
      achievements,
      groupedByCategory: groupedAchievements,
    });
  } catch (err) {
    console.error("Error getting achievements:", err);
    res.status(500).json({ error: "Failed to fetch achievements" });
  }
};

// Search Students for Reporting
const searchStudents = async (req, res) => {
  const { query = "", classroomId, page = 1, limit = 10 } = req.query;

  try {
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {
      isArchived: false,
      OR: [
        { nisn: { contains: query, mode: "insensitive" } },
        { user: { name: { contains: query, mode: "insensitive" } } },
      ],
    };

    if (classroomId) {
      whereClause.classroomId = parseInt(classroomId);
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where: whereClause,
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
          angkatan: {
            select: {
              tahun: true,
            },
          },
        },
        orderBy: [
          { classroom: { namaKelas: "asc" } },
          { user: { name: "asc" } },
        ],
        skip,
        take: parseInt(limit),
      }),
      prisma.student.count({ where: whereClause }),
    ]);

    res.json({
      data: students.map((student) => ({
        id: student.id,
        nisn: student.nisn,
        name: student.user.name,
        className: student.classroom.namaKelas,
        angkatan: student.angkatan.tahun,
        totalScore: student.totalScore,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Error searching students:", err);
    res.status(500).json({ error: "Failed to search students" });
  }
};

// Get Current Academic Year
const getCurrentAcademicYear = async (req, res) => {
  try {
    const currentYear = await prisma.tahunAjaran.findFirst({
      where: {
        isActive: true,
      },
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

// Get All Academic Years
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

// Filter reports by academic year
const getMyReportsByAcademicYear = async (req, res) => {
  const userId = req.user.id;
  const { tahunAjaranId, page = 1, limit = 10, tipe, studentId } = req.query;

  try {
    // Verify teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause with academic year filter
    const whereClause = {
      reporterId: userId,
    };

    if (tipe) {
      whereClause.tipe = tipe;
    }

    if (studentId) {
      whereClause.studentId = parseInt(studentId);
    }

    // Filter by academic year if provided
    if (tahunAjaranId) {
      const academicYear = await prisma.tahunAjaran.findUnique({
        where: { id: parseInt(tahunAjaranId) },
      });

      if (!academicYear) {
        return res.status(404).json({ error: "Academic year not found" });
      }

      whereClause.tanggal = {
        gte: academicYear.tanggalMulai,
        lte: academicYear.tanggalSelesai,
      };
    }

    // Get reports with pagination
    const [reports, total] = await Promise.all([
      prisma.studentReport.findMany({
        where: whereClause,
        include: {
          student: {
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
              angkatan: {
                select: {
                  tahun: true,
                },
              },
            },
          },
          violation: {
            select: {
              nama: true,
              kategori: true,
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
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.studentReport.count({ where: whereClause }),
    ]);

    // Get academic year info if filtering by specific year
    let academicYearInfo = null;
    if (tahunAjaranId) {
      academicYearInfo = await prisma.tahunAjaran.findUnique({
        where: { id: parseInt(tahunAjaranId) },
      });
    }

    // Format the response
    const formattedReports = reports.map((report) => ({
      id: report.id,
      tipe: report.tipe,
      student: {
        id: report.student.id,
        nisn: report.student.nisn,
        name: report.student.user.name,
        className: report.student.classroom.namaKelas,
        angkatan: report.student.angkatan.tahun,
      },
      item:
        report.tipe === "violation"
          ? {
              id: report.violation?.id,
              nama: report.violation?.nama,
              kategori: report.violation?.kategori,
              point: report.violation?.point,
            }
          : {
              id: report.achievement?.id,
              nama: report.achievement?.nama,
              kategori: report.achievement?.kategori,
              point: report.achievement?.point,
            },
      tanggal: report.tanggal,
      waktu: report.waktu,
      deskripsi: report.deskripsi,
      bukti: report.bukti,
      pointSaat: report.pointSaat,
      createdAt: report.createdAt,
    }));

    res.json({
      data: formattedReports,
      academicYear: academicYearInfo,
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
    console.error("Error getting reports by academic year:", err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
};

// Get Academic Year Statistics for Teacher
const getAcademicYearStats = async (req, res) => {
  const userId = req.user.id;
  const { tahunAjaranId } = req.query;

  try {
    // Verify teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    let academicYear;
    if (tahunAjaranId) {
      academicYear = await prisma.tahunAjaran.findUnique({
        where: { id: parseInt(tahunAjaranId) },
      });
    } else {
      // Get current active academic year
      academicYear = await prisma.tahunAjaran.findFirst({
        where: { isActive: true },
      });
    }

    if (!academicYear) {
      return res.status(404).json({ error: "Academic year not found" });
    }

    // Build date filter for the academic year
    const dateFilter = {
      gte: academicYear.tanggalMulai,
      lte: academicYear.tanggalSelesai,
    };

    // Get statistics for this academic year
    const [totalReports, violationReports, achievementReports, monthlyStats] =
      await Promise.all([
        // Total reports in this academic year
        prisma.studentReport.count({
          where: {
            reporterId: userId,
            tanggal: dateFilter,
          },
        }),

        // Violation reports in this academic year
        prisma.studentReport.count({
          where: {
            reporterId: userId,
            tipe: "violation",
            tanggal: dateFilter,
          },
        }),

        // Achievement reports in this academic year
        prisma.studentReport.count({
          where: {
            reporterId: userId,
            tipe: "achievement",
            tanggal: dateFilter,
          },
        }),

        // Monthly breakdown
        prisma.studentReport.findMany({
          where: {
            reporterId: userId,
            tanggal: dateFilter,
          },
          select: {
            tipe: true,
            tanggal: true,
            pointSaat: true,
          },
        }),
      ]);

    // Process monthly statistics
    const monthlyBreakdown = {};
    monthlyStats.forEach((report) => {
      const month = new Date(report.tanggal).toISOString().slice(0, 7); // YYYY-MM format

      if (!monthlyBreakdown[month]) {
        monthlyBreakdown[month] = {
          month,
          violations: 0,
          achievements: 0,
          totalPoints: 0,
        };
      }

      if (report.tipe === "violation") {
        monthlyBreakdown[month].violations++;
      } else {
        monthlyBreakdown[month].achievements++;
      }

      monthlyBreakdown[month].totalPoints += report.pointSaat || 0;
    });

    res.json({
      academicYear: {
        id: academicYear.id,
        tahunAjaran: academicYear.tahunAjaran,
        tahunMulai: academicYear.tahunMulai,
        tahunSelesai: academicYear.tahunSelesai,
        isActive: academicYear.isActive,
      },
      statistics: {
        totalReports,
        violationReports,
        achievementReports,
        averageReportsPerMonth: totalReports / 12,
      },
      monthlyBreakdown: Object.values(monthlyBreakdown).sort((a, b) =>
        a.month.localeCompare(b.month)
      ),
    });
  } catch (err) {
    console.error("Error getting academic year statistics:", err);
    res.status(500).json({ error: "Failed to fetch academic year statistics" });
  }
};

module.exports = {
  getMyReports,
  getProfile,
  updateProfile,
  getViolations,
  getAchievements,
  searchStudents,
  getCurrentAcademicYear,
  getAcademicYears,
  getMyReportsByAcademicYear,
  getAcademicYearStats,
};
