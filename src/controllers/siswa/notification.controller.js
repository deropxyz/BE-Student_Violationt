const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get my notifications (for authenticated student)
const getMyNotifications = async (req, res) => {
  try {
    const user = req.user;

    // Get student data
    const student = await prisma.student.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({ error: "Data siswa tidak ditemukan" });
    }

    const notifications = await prisma.notification.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: notifications,
    });
  } catch (err) {
    console.error("Error getting my notifications:", err);
    res.status(500).json({ error: "Gagal mengambil notifikasi" });
  }
};

// Mark my notification as read
const markMyNotificationAsRead = async (req, res) => {
  const { id } = req.params;

  try {
    const user = req.user;

    // Get student data
    const student = await prisma.student.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({ error: "Data siswa tidak ditemukan" });
    }

    // Verify notification belongs to this student
    const notification = await prisma.notification.findFirst({
      where: {
        id: parseInt(id),
        studentId: student.id,
      },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notifikasi tidak ditemukan" });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: parseInt(id) },
      data: { isRead: true },
    });

    res.json({
      success: true,
      data: updatedNotification,
    });
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({ error: "Gagal mengupdate notifikasi" });
  }
};

// Mark all my notifications as read
const markAllMyNotificationsAsRead = async (req, res) => {
  try {
    const user = req.user;

    // Get student data
    const student = await prisma.student.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({ error: "Data siswa tidak ditemukan" });
    }

    const result = await prisma.notification.updateMany({
      where: {
        studentId: student.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({
      success: true,
      message: `${result.count} notifikasi berhasil ditandai sebagai dibaca`,
    });
  } catch (err) {
    console.error("Error marking all notifications as read:", err);
    res.status(500).json({ error: "Gagal mengupdate notifikasi" });
  }
};

// Get unread notifications count
const getUnreadNotificationsCount = async (req, res) => {
  try {
    const user = req.user;

    // Get student data
    const student = await prisma.student.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({ error: "Data siswa tidak ditemukan" });
    }

    const count = await prisma.notification.count({
      where: {
        studentId: student.id,
        isRead: false,
      },
    });

    res.json({
      success: true,
      count: count,
    });
  } catch (err) {
    console.error("Error getting unread notifications count:", err);
    res.status(500).json({ error: "Gagal mengambil jumlah notifikasi" });
  }
};

module.exports = {
  getMyNotifications,
  markMyNotificationAsRead,
  markAllMyNotificationsAsRead,
  getUnreadNotificationsCount,
};
