const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Generate kenaikan kelas
const generateKenaikanKelas = async (req, res) => {
  const {
    tahunAjaran,
    deskripsi,
    promoteAll = false,
    customPromotions = [],
  } = req.body;

  try {
    // Start transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Get all active students grouped by grade level
      const siswaKelas10 = await tx.student.findMany({
        where: {
          isArchived: false,
          classroom: {
            namaKelas: {
              startsWith: "X",
            },
          },
        },
        include: {
          classroom: true,
          angkatan: true,
          user: true,
        },
      });

      const siswaKelas11 = await tx.student.findMany({
        where: {
          isArchived: false,
          classroom: {
            namaKelas: {
              startsWith: "XI",
            },
          },
        },
        include: {
          classroom: true,
          angkatan: true,
          user: true,
        },
      });

      const siswaKelas12 = await tx.student.findMany({
        where: {
          isArchived: false,
          classroom: {
            namaKelas: {
              startsWith: "XII",
            },
          },
        },
        include: {
          classroom: true,
          angkatan: true,
          user: true,
        },
      });

      let totalPromoted = 0;
      let totalGraduated = 0;
      let totalFailed = 0;
      const promotionDetails = [];

      // Get available classrooms for promotion
      const kelasXI = await tx.classroom.findMany({
        where: { namaKelas: { startsWith: "XI" } },
      });

      const kelasXII = await tx.classroom.findMany({
        where: { namaKelas: { startsWith: "XII" } },
      });

      // Promote Grade X to XI
      for (const siswa of siswaKelas10) {
        const shouldPromote =
          promoteAll ||
          customPromotions.includes(siswa.id) ||
          siswa.totalScore >= -200; // Default promotion criteria

        if (shouldPromote) {
          // Find corresponding XI class
          const targetKelas = kelasXI.find(
            (k) =>
              k.namaKelas.replace("XI", "").trim() ===
              siswa.classroom.namaKelas.replace("X", "").trim()
          );

          if (targetKelas) {
            await tx.student.update({
              where: { id: siswa.id },
              data: { classroomId: targetKelas.id },
            });

            totalPromoted++;
            promotionDetails.push({
              studentId: siswa.id,
              name: siswa.user.name,
              from: siswa.classroom.namaKelas,
              to: targetKelas.namaKelas,
              type: "promoted",
            });
          }
        } else {
          totalFailed++;
          promotionDetails.push({
            studentId: siswa.id,
            name: siswa.user.name,
            from: siswa.classroom.namaKelas,
            to: siswa.classroom.namaKelas,
            type: "repeat",
          });
        }
      }

      // Promote Grade XI to XII
      for (const siswa of siswaKelas11) {
        const shouldPromote =
          promoteAll ||
          customPromotions.includes(siswa.id) ||
          siswa.totalScore >= -200;

        if (shouldPromote) {
          const targetKelas = kelasXII.find(
            (k) =>
              k.namaKelas.replace("XII", "").trim() ===
              siswa.classroom.namaKelas.replace("XI", "").trim()
          );

          if (targetKelas) {
            await tx.student.update({
              where: { id: siswa.id },
              data: { classroomId: targetKelas.id },
            });

            totalPromoted++;
            promotionDetails.push({
              studentId: siswa.id,
              name: siswa.user.name,
              from: siswa.classroom.namaKelas,
              to: targetKelas.namaKelas,
              type: "promoted",
            });
          }
        } else {
          totalFailed++;
          promotionDetails.push({
            studentId: siswa.id,
            name: siswa.user.name,
            from: siswa.classroom.namaKelas,
            to: siswa.classroom.namaKelas,
            type: "repeat",
          });
        }
      }

      // Graduate Grade XII students
      for (const siswa of siswaKelas12) {
        const shouldGraduate =
          promoteAll ||
          customPromotions.includes(siswa.id) ||
          siswa.totalScore >= -200;

        if (shouldGraduate) {
          await tx.student.update({
            where: { id: siswa.id },
            data: {
              isArchived: true,
              archivedAt: new Date(),
              classroom: { disconnect: true }, // Remove from classroom when graduated
            },
          });

          totalGraduated++;
          promotionDetails.push({
            studentId: siswa.id,
            name: siswa.user.name,
            from: siswa.classroom.namaKelas,
            to: "LULUS",
            type: "graduated",
          });
        } else {
          totalFailed++;
          promotionDetails.push({
            studentId: siswa.id,
            name: siswa.user.name,
            from: siswa.classroom.namaKelas,
            to: siswa.classroom.namaKelas,
            type: "repeat",
          });
        }
      }

      // Create kenaikan kelas record
      const kenaikanKelas = await tx.kenaikanKelas.create({
        data: {
          tahunAjaran,
          deskripsi,
          totalSiswa:
            siswaKelas10.length + siswaKelas11.length + siswaKelas12.length,
          sukses: totalPromoted + totalGraduated,
          gagal: totalFailed,
        },
      });

      return {
        kenaikanKelas,
        promotionDetails,
        summary: {
          totalPromoted,
          totalGraduated,
          totalFailed,
          totalProcessed:
            siswaKelas10.length + siswaKelas11.length + siswaKelas12.length,
        },
      };
    });

    res.status(201).json({
      message: "Kenaikan kelas berhasil diproses",
      data: result.kenaikanKelas,
      details: result.promotionDetails,
      summary: result.summary,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Gagal memproses kenaikan kelas: " + err.message });
  }
};

// Get promotion preview - to see what will happen before executing
const getPromotionPreview = async (req, res) => {
  try {
    const siswaKelas10 = await prisma.student.findMany({
      where: {
        isArchived: false,
        classroom: { namaKelas: { startsWith: "X" } },
      },
      include: { classroom: true, user: true },
    });

    const siswaKelas11 = await prisma.student.findMany({
      where: {
        isArchived: false,
        classroom: { namaKelas: { startsWith: "XI" } },
      },
      include: { classroom: true, user: true },
    });

    const siswaKelas12 = await prisma.student.findMany({
      where: {
        isArchived: false,
        classroom: { namaKelas: { startsWith: "XII" } },
      },
      include: { classroom: true, user: true },
    });

    const preview = {
      gradeX: siswaKelas10.map((s) => ({
        id: s.id,
        name: s.user.name,
        nisn: s.nisn,
        currentClass: s.classroom.namaKelas,
        totalScore: s.totalScore,
        eligible: s.totalScore >= -200,
        nextGrade: "XI",
      })),
      gradeXI: siswaKelas11.map((s) => ({
        id: s.id,
        name: s.user.name,
        nisn: s.nisn,
        currentClass: s.classroom.namaKelas,
        totalScore: s.totalScore,
        eligible: s.totalScore >= -200,
        nextGrade: "XII",
      })),
      gradeXII: siswaKelas12.map((s) => ({
        id: s.id,
        name: s.user.name,
        nisn: s.nisn,
        currentClass: s.classroom.namaKelas,
        totalScore: s.totalScore,
        eligible: s.totalScore >= -200,
        nextGrade: "LULUS",
      })),
    };

    res.json({
      message: "Preview kenaikan kelas",
      data: preview,
      summary: {
        totalX: siswaKelas10.length,
        totalXI: siswaKelas11.length,
        totalXII: siswaKelas12.length,
        eligibleX: siswaKelas10.filter((s) => s.totalScore >= -200).length,
        eligibleXI: siswaKelas11.filter((s) => s.totalScore >= -200).length,
        eligibleXII: siswaKelas12.filter((s) => s.totalScore >= -200).length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal membuat preview kenaikan kelas" });
  }
};

// Auto delete graduated students older than 1 year
const autoDeleteOldGraduates = async (req, res) => {
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const oldGraduates = await prisma.student.findMany({
      where: {
        isArchived: true,
        archivedAt: {
          lt: oneYearAgo,
        },
      },
      include: {
        user: true,
      },
    });

    // Delete students and their users
    const deletedCount = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const student of oldGraduates) {
        // Delete student record (cascade will handle user deletion)
        await tx.student.delete({
          where: { id: student.id },
        });
        count++;
      }
      return count;
    });

    res.json({
      message: `Successfully deleted ${deletedCount} graduated students older than 1 year`,
      deletedStudents: oldGraduates.map((s) => ({
        id: s.id,
        name: s.user.name,
        nisn: s.nisn,
        archivedAt: s.archivedAt,
      })),
      count: deletedCount,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Gagal menghapus data lulus lama: " + err.message });
  }
};

// Get archived students (graduates)
const getArchivedStudents = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [archivedStudents, total] = await Promise.all([
      prisma.student.findMany({
        where: { isArchived: true },
        include: {
          user: true,
          classroom: true,
          angkatan: true,
        },
        orderBy: { archivedAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.student.count({
        where: { isArchived: true },
      }),
    ]);

    res.json({
      data: archivedStudents.map((s) => ({
        id: s.id,
        name: s.user.name,
        nisn: s.nisn,
        lastClass: s.classroom?.namaKelas || "-",
        angkatan: s.angkatan.tahun,
        archivedAt: s.archivedAt,
        totalScore: s.totalScore,
        yearsGraduated: Math.floor(
          (new Date() - new Date(s.archivedAt)) / (1000 * 60 * 60 * 24 * 365)
        ),
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil data alumni" });
  }
};

// Get all kenaikan kelas records
const getAllKenaikanKelas = async (req, res) => {
  try {
    const records = await prisma.kenaikanKelas.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil data kenaikan kelas" });
  }
};

// Get kenaikan kelas detail
const getKenaikanKelasDetail = async (req, res) => {
  const { id } = req.params;
  try {
    const record = await prisma.kenaikanKelas.findUnique({
      where: { id: parseInt(id) },
    });

    if (!record) {
      return res
        .status(404)
        .json({ error: "Data kenaikan kelas tidak ditemukan" });
    }

    res.json(record);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil detail kenaikan kelas" });
  }
};

module.exports = {
  generateKenaikanKelas,
  getPromotionPreview,
  autoDeleteOldGraduates,
  getArchivedStudents,
  getAllKenaikanKelas,
  getKenaikanKelasDetail,
};
