const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get notifications for student
const getStudentNotifications = async (req, res) => {
  const { studentId } = req.params;

  try {
    const notifications = await prisma.notification.findMany({
      where: { studentId: parseInt(studentId) },
      orderBy: { createdAt: "desc" },
    });

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil notifikasi" });
  }
};

// Mark notification as read
const markNotificationAsRead = async (req, res) => {
  const { id } = req.params;

  try {
    const notification = await prisma.notification.update({
      where: { id: parseInt(id) },
      data: { isRead: true },
    });

    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengupdate notifikasi" });
  }
};

// Create notification (usually called internally when violation is created)
const createNotification = async (studentId, judul, pesan) => {
  try {
    return await prisma.notification.create({
      data: {
        studentId: parseInt(studentId),
        judul,
        pesan,
      },
    });
  } catch (err) {
    console.error("Error creating notification:", err);
    return null;
  }
};

// Get student score and violations for student dashboard
const getStudentDashboard = async (req, res) => {
  const { studentId } = req.params;

  try {
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
      include: {
        user: true,
        classroom: true,
        angkatan: true,
        violations: {
          include: {
            violation: true,
            reporter: true,
          },
          orderBy: { tanggal: "desc" },
        },
        notifications: {
          where: { isRead: false },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: "Siswa tidak ditemukan" });
    }

    // Get score history
    const scoreHistory = await prisma.scoreHistory.findMany({
      where: { studentId: parseInt(studentId) },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Check for automatic actions based on score
    const tindakanOtomatis = await prisma.tindakanOtomatis.findMany({
      where: {
        isActive: true,
        minPoint: { lte: student.totalScore },
        OR: [{ maxPoint: null }, { maxPoint: { gte: student.totalScore } }],
      },
      orderBy: { minPoint: "desc" },
    });

    res.json({
      student,
      scoreHistory,
      tindakanOtomatis,
      summary: {
        totalScore: student.totalScore,
        totalViolations: student.violations.length,
        unreadNotifications: student.notifications.length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil dashboard siswa" });
  }
};

module.exports = {
  getStudentNotifications,
  markNotificationAsRead,
  createNotification,
  getStudentDashboard,
};
