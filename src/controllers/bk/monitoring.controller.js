const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Search students by NISN or name (across all classes, active year only)
const searchStudents = async (req, res) => {
  const { q } = req.query;
  try {
    const students = await prisma.student.findMany({
      where: {
        OR: [
          { nisn: { contains: q || "", mode: "insensitive" } },
          { user: { name: { contains: q || "", mode: "insensitive" } } },
        ],
        isArchived: false,
      },
      include: {
        user: { select: { name: true } },
        classroom: { select: { namaKelas: true, kodeKelas: true } },
      },
      orderBy: { nisn: "asc" },
      take: 20,
    });
    const data = students.map((siswa) => ({
      nisn: siswa.nisn,
      nama: siswa.user?.name,
      kelas: siswa.classroom?.namaKelas || "-",
      kodeKelas: siswa.classroom?.kodeKelas || "-",
    }));
    res.json({ data });
  } catch (err) {
    console.error("Error searching students:", err);
    res.status(500).json({ error: "Failed to search students" });
  }
};

const getClassroomWithReports = async (req, res) => {
  try {
    // Ambil tahun ajaran aktif

    const classrooms = await prisma.classroom.findMany({
      include: {
        students: {
          include: {
            reports: {
              include: { item: true },
            },
          },
        },
      },
      orderBy: { namaKelas: "asc" },
    });

    const data = classrooms.map((kelas) => {
      const jmlSiswa = kelas.students.length;
      let jmlPelanggaran = 0;
      let jmlPrestasi = 0;
      let totalPoint = 0;

      kelas.students.forEach((siswa) => {
        siswa.reports.forEach((report) => {
          if (report.item.tipe === "pelanggaran") {
            jmlPelanggaran++;
            totalPoint -= report.pointSaat || 0;
          } else if (report.item.tipe === "prestasi") {
            jmlPrestasi++;
            totalPoint += report.pointSaat || 0;
          }
        });
      });

      const avrgPoint = jmlSiswa > 0 ? Math.round(totalPoint / jmlSiswa) : 0;

      return {
        id: kelas.id,
        kodeKelas: kelas.kodeKelas,
        namaKelas: kelas.namaKelas,
        jmlSiswa,
        jmlPelanggaran,
        jmlPrestasi,
        avrgPoint,
      };
    });

    res.json({ data });
  } catch (err) {
    console.error("Error getting classroom violation stats:", err);
    res.status(500).json({ error: "Failed to fetch classroom stats" });
  }
};

// Ambil data siswa dalam kelas tertentu (berdasarkan tahun ajaran yang dipilih atau aktif)
const getStudents = async (req, res) => {
  const { classroomId } = req.params;
  const { tahunAjaranId } = req.query;
  try {
    // Ambil semua siswa di kelas tersebut
    const students = await prisma.student.findMany({
      where: { classroomId: parseInt(classroomId) },
      include: {
        user: { select: { name: true } },
        reports: {
          where:
            tahunAjaranId && tahunAjaranId !== "all"
              ? { tahunAjaranId: parseInt(tahunAjaranId) }
              : {},
          include: { item: true },
        },
      },
      orderBy: { nisn: "asc" },
    });

    const data = students.map((siswa) => {
      let pelanggaran = 0;
      let prestasi = 0;
      let totalScore = 0;
      siswa.reports.forEach((report) => {
        if (report.item.tipe === "pelanggaran") {
          pelanggaran++;
          totalScore -= report.pointSaat || 0;
        } else if (report.item.tipe === "prestasi") {
          prestasi++;
          totalScore += report.pointSaat || 0;
        }
      });
      return {
        nisn: siswa.nisn,
        nama: siswa.user?.name,
        pelanggaran,
        prestasi,
        totalScore,
      };
    });

    res.json({ data });
  } catch (err) {
    console.error("Error getting students in classroom:", err);
    res.status(500).json({ error: "Failed to fetch students in classroom" });
  }
};

// Ambil detail siswa untuk monitoring BK
const getStudentDetailBK = async (req, res) => {
  const { nisn } = req.params;
  const { tahunAjaranId } = req.query;
  try {
    // Ambil data siswa berdasarkan NISN
    const student = await prisma.student.findUnique({
      where: { nisn },
      include: {
        user: { select: { name: true } },
        classroom: { select: { kodeKelas: true } },
        angkatan: { select: { tahun: true } },
        reports: {
          where:
            tahunAjaranId && tahunAjaranId !== "all"
              ? { tahunAjaranId: parseInt(tahunAjaranId) }
              : {},
          include: {
            item: true,
            reporter: { select: { name: true, role: true } },
            bukti: true,
            tahunAjaran: { select: { tahunAjaran: true } },
          },
          orderBy: { tanggal: "desc" },
        },
      },
    });
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Hitung total pelanggaran, prestasi, dan score
    let totalPelanggaran = 0;
    let totalPrestasi = 0;
    let subtotalScore = 0;
    student.reports.forEach((report) => {
      if (report.item.tipe === "pelanggaran") {
        totalPelanggaran++;
        subtotalScore -= report.pointSaat || 0;
      } else if (report.item.tipe === "prestasi") {
        totalPrestasi++;
        subtotalScore += report.pointSaat || 0;
      }
    });

    // Format laporan siswa
    const laporan = student.reports.map((report) => ({
      id: report.id,
      tahunAjaran: report.tahunAjaran?.tahunAjaran || null,
      namaTahunAjaran: report.tahunAjaran?.tahunAjaran || null,
      tanggal: report.tanggal,
      tipe: report.item.tipe,
      namaItem: report.item.nama,
      kategori: report.item.kategoriId, // bisa di-join jika perlu nama kategori
      point: report.pointSaat,
      deskripsi: report.deskripsi,
      reporter: report.reporter,
      bukti: report.bukti,
      kelasSaatLaporan: report.classAtTime,
    }));

    res.json({
      siswa: {
        nisn: student.nisn,
        nama: student.user?.name,
        kelas: student.classroom?.kodeKelas,
        angkatan: student.angkatan?.tahun,
        totalPelanggaran,
        totalPrestasi,
        subtotalScore,
        totalScore: student.totalScore,
      },
      laporan,
    });
  } catch (err) {
    console.error("Error getting student detail for BK:", err);
    res.status(500).json({ error: "Failed to fetch student detail" });
  }
};

// Create point adjustment (reduce points)
const createPointAdjustment = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { pointPengurangan, alasan, keterangan } = req.body;
    const teacherId = req.user.id; // ID Teacher/BK dari middleware auth

    // Validate required fields
    if (!pointPengurangan || !alasan) {
      return res.status(400).json({
        error: "Point pengurangan dan alasan wajib diisi",
      });
    }

    // Validate point pengurangan must be positive
    if (pointPengurangan <= 0) {
      return res.status(400).json({
        error: "Point pengurangan harus lebih dari 0",
      });
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { userId: parseInt(studentId) },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Check if user exists and has BK role
    const teacherUser = await prisma.user.findUnique({
      where: { id: teacherId },
    });

    if (!teacherUser || teacherUser.role !== "bk") {
      return res
        .status(403)
        .json({ error: "Only BK can create point adjustments" });
    }

    const pointSebelum = student.totalScore;
    const pointSesudah = Math.max(0, pointSebelum - parseInt(pointPengurangan)); // Tidak boleh negatif
    const actualPengurangan = pointSebelum - pointSesudah;

    // Create point adjustment in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create point adjustment record
      const adjustment = await tx.pointAdjustment.create({
        data: {
          studentId: student.id,
          teacherId: teacherId,
          pointPengurangan: parseInt(pointPengurangan),
          alasan: alasan,
          keterangan: keterangan || null,
          pointSebelum: pointSebelum,
          pointSesudah: pointSesudah,
        },
        include: {
          teacher: {
            select: {
              name: true,
            },
          },
          student: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      // Update student total score
      await tx.student.update({
        where: { id: student.id },
        data: { totalScore: pointSesudah },
      });

      // Create score history record
      await tx.scoreHistory.create({
        data: {
          studentId: student.id,
          pointLama: pointSebelum,
          pointBaru: pointSesudah,
          alasan: `Adjustment BK: ${alasan}`,
        },
      });

      return adjustment;
    });

    res.status(201).json({
      success: true,
      message: "Point adjustment berhasil dibuat",
      data: {
        id: result.id,
        studentName: result.student.user.name,
        teacherName: result.teacher.name,
        pointPengurangan: result.pointPengurangan,
        alasan: result.alasan,
        keterangan: result.keterangan,
        pointSebelum: result.pointSebelum,
        pointSesudah: result.pointSesudah,
        actualPengurangan: actualPengurangan,
        tanggal: result.tanggal,
      },
    });
  } catch (err) {
    console.error("Error creating point adjustment:", err);
    res.status(500).json({ error: "Failed to create point adjustment" });
  }
};

// Get all point adjustments (for BK history)
const getAllPointAdjustments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      studentId,
      teacherId,
      startDate,
      endDate,
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let whereConditions = {};

    // Filter by student
    if (studentId) {
      whereConditions.studentId = parseInt(studentId);
    }

    // Filter by Teacher/BK
    if (teacherId) {
      whereConditions.teacherId = parseInt(teacherId);
    }

    // Filter by date range
    if (startDate || endDate) {
      whereConditions.tanggal = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const [adjustments, total] = await Promise.all([
      prisma.pointAdjustment.findMany({
        where: whereConditions,
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
                  kodeKelas: true,
                },
              },
            },
          },
          teacher: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.pointAdjustment.count({
        where: whereConditions,
      }),
    ]);

    const formattedAdjustments = adjustments.map((adj) => ({
      id: adj.id,
      student: {
        id: adj.student.userId,
        name: adj.student.user.name,
        classroom: adj.student.classroom
          ? `${adj.student.classroom.namaKelas} ${adj.student.classroom.kodeKelas}`
          : null,
      },
      teacher: {
        name: adj.teacher.name,
      },
      pointPengurangan: adj.pointPengurangan,
      alasan: adj.alasan,
      keterangan: adj.keterangan,
      pointSebelum: adj.pointSebelum,
      pointSesudah: adj.pointSesudah,
      tanggal: adj.tanggal,
      createdAt: adj.createdAt,
    }));

    res.json({
      data: formattedAdjustments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Error getting point adjustments:", err);
    res.status(500).json({ error: "Failed to fetch point adjustments" });
  }
};

// Get point adjustment statistics
const getAdjustmentStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter = {
        tanggal: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      };
    }

    const [
      totalAdjustments,
      totalPointsReduced,
      studentsAffected,
      adjustmentsByBK,
      recentAdjustments,
    ] = await Promise.all([
      // Total adjustments
      prisma.pointAdjustment.count({
        where: dateFilter,
      }),

      // Total points reduced
      prisma.pointAdjustment.aggregate({
        where: dateFilter,
        _sum: {
          pointPengurangan: true,
        },
      }),

      // Unique students affected
      prisma.pointAdjustment.findMany({
        where: dateFilter,
        select: {
          studentId: true,
        },
        distinct: ["studentId"],
      }),

      // Adjustments by Teacher/BK
      prisma.pointAdjustment.groupBy({
        by: ["teacherId"],
        where: dateFilter,
        _count: {
          id: true,
        },
        _sum: {
          pointPengurangan: true,
        },
      }),

      // Recent adjustments
      prisma.pointAdjustment.findMany({
        where: dateFilter,
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
          teacher: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    // Get Teacher/BK names for statistics
    const teacherIds = adjustmentsByBK.map((adj) => adj.teacherId);
    const teacherUsers = await prisma.user.findMany({
      where: {
        id: { in: teacherIds },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const teacherMap = Object.fromEntries(
      teacherUsers.map((teacher) => [teacher.id, teacher.name])
    );

    const statistics = {
      totalAdjustments,
      totalPointsReduced: totalPointsReduced._sum.pointPengurangan || 0,
      studentsAffected: studentsAffected.length,
      adjustmentsByBK: adjustmentsByBK.map((adj) => ({
        teacherName: teacherMap[adj.teacherId] || "Unknown",
        totalAdjustments: adj._count.id,
        totalPointsReduced: adj._sum.pointPengurangan || 0,
      })),
      recentAdjustments: recentAdjustments.map((adj) => ({
        id: adj.id,
        studentName: adj.student.user.name,
        teacherName: adj.teacher.name,
        pointPengurangan: adj.pointPengurangan,
        alasan: adj.alasan,
        tanggal: adj.tanggal,
      })),
    };

    res.json({
      success: true,
      data: statistics,
    });
  } catch (err) {
    console.error("Error getting adjustment statistics:", err);
    res.status(500).json({ error: "Failed to fetch adjustment statistics" });
  }
};

module.exports = {
  getClassroomWithReports,
  getStudents,
  getStudentDetailBK,
  searchStudents,
  createPointAdjustment,
  getAllPointAdjustments,
  getAdjustmentStatistics,
};
