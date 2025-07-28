const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get violation statistics per week/month
const getViolationStatistics = async (req, res) => {
  const { period, startDate, endDate } = req.query;

  try {
    let dateFilter = {};

    if (startDate && endDate) {
      dateFilter = {
        tanggal: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      };
    }

    // Get violations in period
    const violations = await prisma.studentViolation.findMany({
      where: dateFilter,
      include: {
        student: {
          include: {
            user: true,
            classroom: true,
          },
        },
        violation: true,
        reporter: true,
      },
      orderBy: { tanggal: "desc" },
    });

    // Group by violation type
    const violationsByType = violations.reduce((acc, violation) => {
      const type = violation.violation.nama;
      if (!acc[type]) {
        acc[type] = {
          count: 0,
          totalPoints: 0,
          category: violation.violation.kategori,
          jenis: violation.violation.jenis,
        };
      }
      acc[type].count++;
      acc[type].totalPoints += violation.pointSaat;
      return acc;
    }, {});

    // Group by student
    const violationsByStudent = violations.reduce((acc, violation) => {
      const studentId = violation.studentId;
      if (!acc[studentId]) {
        acc[studentId] = {
          student: violation.student,
          violations: [],
          totalPoints: 0,
        };
      }
      acc[studentId].violations.push(violation);
      acc[studentId].totalPoints += violation.pointSaat;
      return acc;
    }, {});

    // Group by class
    const violationsByClass = violations.reduce((acc, violation) => {
      const className = violation.student.classroom.namaKelas;
      if (!acc[className]) {
        acc[className] = {
          count: 0,
          totalPoints: 0,
          students: new Set(),
        };
      }
      acc[className].count++;
      acc[className].totalPoints += violation.pointSaat;
      acc[className].students.add(violation.studentId);
      return acc;
    }, {});

    // Convert sets to counts for response
    Object.keys(violationsByClass).forEach((className) => {
      violationsByClass[className].uniqueStudents =
        violationsByClass[className].students.size;
      delete violationsByClass[className].students;
    });

    res.json({
      summary: {
        totalViolations: violations.length,
        totalStudentsAffected: Object.keys(violationsByStudent).length,
        totalPoints: violations.reduce((sum, v) => sum + v.pointSaat, 0),
      },
      violationsByType,
      violationsByStudent: Object.values(violationsByStudent),
      violationsByClass,
      period: { startDate, endDate },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil statistik pelanggaran" });
  }
};

// Get weekly violations
const getWeeklyViolations = async (req, res) => {
  try {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const violations = await prisma.studentViolation.findMany({
      where: {
        tanggal: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
      include: {
        student: {
          include: {
            user: true,
            classroom: true,
          },
        },
        violation: true,
        reporter: true,
      },
      orderBy: { tanggal: "desc" },
    });

    res.json({
      period: "weekly",
      startDate: startOfWeek,
      endDate: endOfWeek,
      violations,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Gagal mengambil data pelanggaran mingguan" });
  }
};

// Get monthly violations
const getMonthlyViolations = async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    const violations = await prisma.studentViolation.findMany({
      where: {
        tanggal: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        student: {
          include: {
            user: true,
            classroom: true,
          },
        },
        violation: true,
        reporter: true,
      },
      orderBy: { tanggal: "desc" },
    });

    res.json({
      period: "monthly",
      startDate: startOfMonth,
      endDate: endOfMonth,
      violations,
    });
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil data pelanggaran bulanan" });
  }
};

// Get class violation report
const getClassViolationReport = async (req, res) => {
  const { classroomId } = req.params;

  try {
    const classroom = await prisma.classroom.findUnique({
      where: { id: parseInt(classroomId) },
      include: {
        waliKelas: {
          include: { user: true },
        },
      },
    });

    if (!classroom) {
      return res.status(404).json({ error: "Kelas tidak ditemukan" });
    }

    const violations = await prisma.studentViolation.findMany({
      where: {
        student: {
          classroomId: parseInt(classroomId),
        },
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        violation: true,
        reporter: true,
      },
      orderBy: { tanggal: "desc" },
    });

    const students = await prisma.student.findMany({
      where: { classroomId: parseInt(classroomId) },
      include: {
        user: true,
        violations: {
          include: {
            violation: true,
          },
        },
      },
    });

    res.json({
      classroom,
      violations,
      students,
      summary: {
        totalStudents: students.length,
        totalViolations: violations.length,
        studentsWithViolations: students.filter((s) => s.violations.length > 0)
          .length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil laporan kelas" });
  }
};

module.exports = {
  getViolationStatistics,
  getWeeklyViolations,
  getMonthlyViolations,
  getClassViolationReport,
};
