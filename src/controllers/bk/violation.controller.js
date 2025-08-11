const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// BK Violation Management
const addViolation = async (req, res) => {
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

const updateViolation = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId, violationId, deskripsi, tanggal, pointSaat } = req.body;

    // Check if violation exists
    const existingViolation = await prisma.studentViolation.findUnique({
      where: { id: parseInt(id) },
      include: { violation: true },
    });

    if (!existingViolation) {
      return res.status(404).json({ error: "Violation record not found" });
    }

    // Get old and new violation data for score calculation
    const oldPoints = existingViolation.pointSaat;
    const newViolation = await prisma.violation.findUnique({
      where: { id: parseInt(violationId) },
    });
    const newPoints = pointSaat || newViolation.point;

    // Update violation
    const updatedViolation = await prisma.studentViolation.update({
      where: { id: parseInt(id) },
      data: {
        studentId: parseInt(studentId),
        violationId: parseInt(violationId),
        deskripsi,
        tanggal: new Date(tanggal),
        pointSaat: newPoints,
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

    // Update student total score (adjust difference)
    const pointDifference = newPoints - oldPoints;
    if (pointDifference !== 0) {
      await prisma.student.update({
        where: { id: parseInt(studentId) },
        data: {
          totalScore: {
            decrement: pointDifference,
          },
        },
      });
    }

    res.json({
      id: updatedViolation.id,
      student: {
        nama: updatedViolation.student.user.name,
        nisn: updatedViolation.student.nisn,
        kelas: updatedViolation.student.classroom?.nama,
      },
      violation: {
        nama: updatedViolation.violation.nama,
        kategori: updatedViolation.violation.kategori,
        point: updatedViolation.pointSaat,
      },
      deskripsi: updatedViolation.deskripsi,
      tanggal: updatedViolation.tanggal,
      reporter: updatedViolation.reporter.name,
      updatedAt: updatedViolation.updatedAt,
    });
  } catch (err) {
    console.error("Error updating violation:", err);
    res.status(500).json({ error: "Failed to update violation" });
  }
};

const deleteViolation = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if violation exists
    const violation = await prisma.studentViolation.findUnique({
      where: { id: parseInt(id) },
    });

    if (!violation) {
      return res.status(404).json({ error: "Violation record not found" });
    }

    // Delete violation
    await prisma.studentViolation.delete({
      where: { id: parseInt(id) },
    });

    // Restore student total score
    await prisma.student.update({
      where: { id: violation.studentId },
      data: {
        totalScore: {
          increment: violation.pointSaat,
        },
      },
    });

    res.json({ message: "Violation deleted successfully" });
  } catch (err) {
    console.error("Error deleting violation:", err);
    res.status(500).json({ error: "Failed to delete violation" });
  }
};

const getViolationHistory = async (req, res) => {
  try {
    const {
      studentId,
      violationId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 10,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = {};
    if (studentId) filter.studentId = parseInt(studentId);
    if (violationId) filter.violationId = parseInt(violationId);
    if (dateFrom && dateTo) {
      filter.tanggal = {
        gte: new Date(dateFrom),
        lte: new Date(dateTo),
      };
    }

    const [violations, total] = await Promise.all([
      prisma.studentViolation.findMany({
        where: filter,
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
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.studentViolation.count({ where: filter }),
    ]);

    const formattedViolations = violations.map((v) => ({
      id: v.id,
      student: {
        id: v.student.id,
        nama: v.student.user.name,
        nisn: v.student.nisn,
        kelas: v.student.classroom?.nama,
      },
      violation: {
        nama: v.violation.nama,
        kategori: v.violation.kategori,
        jenis: v.violation.jenis,
        point: v.pointSaat,
      },
      deskripsi: v.deskripsi,
      tanggal: v.tanggal,
      reporter: v.reporter.name,
      createdAt: v.createdAt,
    }));

    res.json({
      data: formattedViolations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Error getting violation history:", err);
    res.status(500).json({ error: "Failed to fetch violation history" });
  }
};

module.exports = {
  addViolation,
  updateViolation,
  deleteViolation,
  getViolationHistory,
};
