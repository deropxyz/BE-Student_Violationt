const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Achievement Management for Guru
const addAchievement = async (req, res) => {
  const reporterId = req.user.id;

  try {
    const { studentId, achievementId, deskripsi, tanggal, pointSaat } =
      req.body;

    // Validate student exists
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
      include: { user: true },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Validate achievement exists
    const achievement = await prisma.achievement.findUnique({
      where: { id: parseInt(achievementId) },
    });

    if (!achievement) {
      return res.status(404).json({ error: "Achievement type not found" });
    }

    // Create student achievement
    const studentAchievement = await prisma.studentAchievement.create({
      data: {
        studentId: parseInt(studentId),
        achievementId: parseInt(achievementId),
        reporterId,
        deskripsi,
        tanggal: new Date(tanggal),
        pointSaat: pointSaat || achievement.point,
      },
      include: {
        achievement: true,
        student: {
          include: {
            user: true,
            classroom: true,
          },
        },
        reporter: {
          select: {
            name: true,
            role: true,
          },
        },
      },
    });

    // Update student total score
    await prisma.student.update({
      where: { id: parseInt(studentId) },
      data: {
        totalScore: {
          increment: pointSaat || achievement.point,
        },
      },
    });

    // Create notification for student
    await prisma.notification.create({
      data: {
        userId: student.userId,
        title: "Prestasi Baru",
        message: `Selamat! Anda mendapat prestasi: ${
          achievement.nama
        }. Point: +${pointSaat || achievement.point}`,
        type: "achievement",
        isRead: false,
        data: JSON.stringify({
          achievementId: studentAchievement.id,
          achievementType: achievement.nama,
          points: pointSaat || achievement.point,
        }),
      },
    });

    res.status(201).json({
      id: studentAchievement.id,
      student: {
        nama: studentAchievement.student.user.name,
        nisn: studentAchievement.student.nisn,
        kelas: studentAchievement.student.classroom?.nama,
      },
      achievement: {
        nama: studentAchievement.achievement.nama,
        kategori: studentAchievement.achievement.kategori,
        point: studentAchievement.pointSaat,
      },
      deskripsi: studentAchievement.deskripsi,
      tanggal: studentAchievement.tanggal,
      reporter: studentAchievement.reporter.name,
      createdAt: studentAchievement.createdAt,
    });
  } catch (err) {
    console.error("Error adding achievement:", err);
    res.status(500).json({ error: "Failed to add achievement" });
  }
};

const updateAchievement = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId, achievementId, deskripsi, tanggal, pointSaat } =
      req.body;

    // Check if achievement exists
    const existingAchievement = await prisma.studentAchievement.findUnique({
      where: { id: parseInt(id) },
      include: { achievement: true },
    });

    if (!existingAchievement) {
      return res.status(404).json({ error: "Achievement record not found" });
    }

    // Get old and new achievement data for score calculation
    const oldPoints = existingAchievement.pointSaat;
    const newAchievement = await prisma.achievement.findUnique({
      where: { id: parseInt(achievementId) },
    });
    const newPoints = pointSaat || newAchievement.point;

    // Update achievement
    const updatedAchievement = await prisma.studentAchievement.update({
      where: { id: parseInt(id) },
      data: {
        studentId: parseInt(studentId),
        achievementId: parseInt(achievementId),
        deskripsi,
        tanggal: new Date(tanggal),
        pointSaat: newPoints,
      },
      include: {
        achievement: true,
        student: {
          include: {
            user: true,
            classroom: true,
          },
        },
        reporter: {
          select: {
            name: true,
            role: true,
          },
        },
      },
    });

    // Update student total score (adjust difference)
    const pointDifference = newPoints - oldPoints;
    if (pointDifference !== 0) {
      await prisma.student.update({
        where: { id: parseInt(studentId) },
        data: {
          totalScore: {
            increment: pointDifference,
          },
        },
      });
    }

    res.json({
      id: updatedAchievement.id,
      student: {
        nama: updatedAchievement.student.user.name,
        nisn: updatedAchievement.student.nisn,
        kelas: updatedAchievement.student.classroom?.nama,
      },
      achievement: {
        nama: updatedAchievement.achievement.nama,
        kategori: updatedAchievement.achievement.kategori,
        point: updatedAchievement.pointSaat,
      },
      deskripsi: updatedAchievement.deskripsi,
      tanggal: updatedAchievement.tanggal,
      reporter: updatedAchievement.reporter.name,
      updatedAt: updatedAchievement.updatedAt,
    });
  } catch (err) {
    console.error("Error updating achievement:", err);
    res.status(500).json({ error: "Failed to update achievement" });
  }
};

const deleteAchievement = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if achievement exists
    const achievement = await prisma.studentAchievement.findUnique({
      where: { id: parseInt(id) },
    });

    if (!achievement) {
      return res.status(404).json({ error: "Achievement record not found" });
    }

    // Delete achievement
    await prisma.studentAchievement.delete({
      where: { id: parseInt(id) },
    });

    // Restore student total score
    await prisma.student.update({
      where: { id: achievement.studentId },
      data: {
        totalScore: {
          decrement: achievement.pointSaat,
        },
      },
    });

    res.json({ message: "Achievement deleted successfully" });
  } catch (err) {
    console.error("Error deleting achievement:", err);
    res.status(500).json({ error: "Failed to delete achievement" });
  }
};

const getAchievementHistory = async (req, res) => {
  try {
    const {
      studentId,
      achievementId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 10,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = {};
    if (studentId) filter.studentId = parseInt(studentId);
    if (achievementId) filter.achievementId = parseInt(achievementId);
    if (dateFrom && dateTo) {
      filter.tanggal = {
        gte: new Date(dateFrom),
        lte: new Date(dateTo),
      };
    }

    const [achievements, total] = await Promise.all([
      prisma.studentAchievement.findMany({
        where: filter,
        include: {
          achievement: true,
          student: {
            include: {
              user: true,
              classroom: true,
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
        skip,
        take: parseInt(limit),
      }),
      prisma.studentAchievement.count({ where: filter }),
    ]);

    const formattedAchievements = achievements.map((a) => ({
      id: a.id,
      student: {
        id: a.student.id,
        nama: a.student.user.name,
        nisn: a.student.nisn,
        kelas: a.student.classroom?.nama,
      },
      achievement: {
        nama: a.achievement.nama,
        kategori: a.achievement.kategori,
        point: a.pointSaat,
      },
      deskripsi: a.deskripsi,
      tanggal: a.tanggal,
      reporter: a.reporter.name,
      createdAt: a.createdAt,
    }));

    res.json({
      data: formattedAchievements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Error getting achievement history:", err);
    res.status(500).json({ error: "Failed to fetch achievement history" });
  }
};

// Quick add violation for guru
const addViolationQuick = async (req, res) => {
  const reporterId = req.user.id;

  try {
    const { studentId, violationId, deskripsi, tanggal, pointSaat } = req.body;

    // Validate student exists
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
      include: { user: true },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Validate violation exists
    const violation = await prisma.violation.findUnique({
      where: { id: parseInt(violationId) },
    });

    if (!violation) {
      return res.status(404).json({ error: "Violation type not found" });
    }

    // Create student violation
    const studentViolation = await prisma.studentViolation.create({
      data: {
        studentId: parseInt(studentId),
        violationId: parseInt(violationId),
        reporterId,
        deskripsi,
        tanggal: new Date(tanggal),
        pointSaat: pointSaat || violation.point,
      },
      include: {
        violation: true,
        student: {
          include: {
            user: true,
            classroom: true,
          },
        },
        reporter: {
          select: {
            name: true,
            role: true,
          },
        },
      },
    });

    // Update student total score
    await prisma.student.update({
      where: { id: parseInt(studentId) },
      data: {
        totalScore: {
          decrement: pointSaat || violation.point,
        },
      },
    });

    // Create notification for student
    await prisma.notification.create({
      data: {
        userId: student.userId,
        title: "Pelanggaran Baru",
        message: `Anda telah melakukan pelanggaran: ${
          violation.nama
        }. Point: -${pointSaat || violation.point}`,
        type: "violation",
        isRead: false,
        data: JSON.stringify({
          violationId: studentViolation.id,
          violationType: violation.nama,
          points: pointSaat || violation.point,
        }),
      },
    });

    res.status(201).json({
      id: studentViolation.id,
      student: {
        nama: studentViolation.student.user.name,
        nisn: studentViolation.student.nisn,
        kelas: studentViolation.student.classroom?.nama,
      },
      violation: {
        nama: studentViolation.violation.nama,
        kategori: studentViolation.violation.kategori,
        point: studentViolation.pointSaat,
      },
      deskripsi: studentViolation.deskripsi,
      tanggal: studentViolation.tanggal,
      reporter: studentViolation.reporter.name,
      createdAt: studentViolation.createdAt,
    });
  } catch (err) {
    console.error("Error adding violation:", err);
    res.status(500).json({ error: "Failed to add violation" });
  }
};

module.exports = {
  addAchievement,
  updateAchievement,
  deleteAchievement,
  getAchievementHistory,
  addViolationQuick,
};
