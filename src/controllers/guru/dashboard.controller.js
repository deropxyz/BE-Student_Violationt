const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// GET /api/guru/dashboard-simple
// Return: { totalReports, violationReports, achievementReports }
const getDashboardGuru = async (req, res) => {
  try {
    const userId = req.user.id;
    // Hitung laporan yang dibuat oleh user (guru) ini
    const [totalReports, violationReports, achievementReports] =
      await Promise.all([
        prisma.studentReport.count({ where: { reporterId: userId } }),
        prisma.studentReport.count({
          where: { reporterId: userId, item: { tipe: "pelanggaran" } },
        }),
        prisma.studentReport.count({
          where: { reporterId: userId, item: { tipe: "prestasi" } },
        }),
      ]);
    res.json({ totalReports, violationReports, achievementReports });
  } catch (err) {
    console.error("Error getDashboardGuru:", err);
    res.status(500).json({ error: "Gagal mengambil data dashboard guru" });
  }
};

// GET /api/guru/profile
// Return: { id, name, email, nip, noHp, alamat, role }
const getProfileGuru = async (req, res) => {
  try {
    const userId = req.user.id;
    // Ambil data guru dan user
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: {
        user: true,
      },
    });
    if (!teacher) {
      return res.status(404).json({ error: "Guru tidak ditemukan" });
    }
    const profile = {
      id: teacher.id,
      name: teacher.user.name,
      email: teacher.user.email,
      nip: teacher.nip,
      noHp: teacher.noHp,
      alamat: teacher.alamat,
      role: teacher.user.role,
    };
    res.json({ data: profile });
  } catch (err) {
    console.error("Error getProfileGuru:", err);
    res.status(500).json({ error: "Gagal mengambil data profil guru" });
  }
};

// PUT /api/guru/profile
// Body: { name, email, noHp, alamat }
const updateProfileGuru = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, noHp, alamat } = req.body;
    // Validasi minimal
    if (!name || !email) {
      return res.status(400).json({ error: "Nama dan email wajib diisi" });
    }
    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: { name, email },
    });
    // Update teacher
    await prisma.teacher.update({
      where: { userId },
      data: { noHp, alamat },
    });
    res.json({ success: true, message: "Profil berhasil diperbarui" });
  } catch (err) {
    console.error("Error updateProfileGuru:", err);
    res.status(500).json({ error: "Gagal memperbarui profil guru" });
  }
};

module.exports = { getDashboardGuru, getProfileGuru, updateProfileGuru };
