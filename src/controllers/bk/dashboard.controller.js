const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// GET /bk/dashboard/summary
const getDashboardSummary = async (req, res) => {
  try {
    const now = new Date();
    const thisMonth = now.getMonth() + 1;
    const thisYear = now.getFullYear();
    let tahunAjaranId = req.query.tahunAjaranId
      ? Number(req.query.tahunAjaranId)
      : null;
    // If not provided, get active tahun ajaran
    if (!tahunAjaranId) {
      const activeYear = await prisma.tahunAjaran.findFirst({
        where: { isActive: true },
      });
      tahunAjaranId = activeYear?.id || undefined;
    }

    // Pelanggaran bulan ini
    const startOfMonth = new Date(thisYear, thisMonth - 1, 1);
    const endOfMonth = new Date(thisYear, thisMonth, 1);

    const pelanggaranBulanIni = await prisma.studentReport.count({
      where: {
        status: "approved",
        item: { tipe: "pelanggaran" },
        tahunAjaranId: tahunAjaranId,
        tanggal: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
    });

    // Prestasi bulan ini
    const prestasiBulanIni = await prisma.studentReport.count({
      where: {
        status: "approved",
        item: { tipe: "prestasi" },
        tahunAjaranId: tahunAjaranId,
        tanggal: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
    });

    // Penanganan bulan ini (pointAdjustment)
    const penangananBulanIni = await prisma.pointAdjustment.count({
      where: {
        tahunAjaranId: tahunAjaranId,
        tanggal: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
    });

    // Surat Peringatan bulan ini
    const suratBulanIni = await prisma.suratPeringatan.count({
      where: {
        tahunAjaranId: tahunAjaranId,
        createdAt: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
    });

    res.json({
      pelanggaran: pelanggaranBulanIni,
      prestasi: prestasiBulanIni,
      penanganan: penangananBulanIni,
      surat: suratBulanIni,
    });
  } catch (error) {
    console.error("[DashboardBK] Error summary:", error);
    res.status(500).json({ error: "Gagal mengambil ringkasan dashboard" });
  }
};

// GET /bk/dashboard/recent-violations
const getRecentViolations = async (req, res) => {
  try {
    let tahunAjaranId = req.query.tahunAjaranId
      ? Number(req.query.tahunAjaranId)
      : null;
    if (!tahunAjaranId) {
      const activeYear = await prisma.tahunAjaran.findFirst({
        where: { isActive: true },
      });
      tahunAjaranId = activeYear?.id || undefined;
    }
    const recent = await prisma.studentReport.findMany({
      where: {
        status: "approved",
        item: { tipe: "pelanggaran" },
        tahunAjaranId: tahunAjaranId,
      },
      orderBy: { tanggal: "desc" },
      take: 10,
      include: {
        student: {
          select: {
            id: true,
            nisn: true,
            user: { select: { name: true } },
            classroom: { select: { namaKelas: true } },
          },
        },
        item: {
          select: {
            nama: true,
            point: true,
            kategori: { select: { nama: true } },
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
    // Format data
    const data = recent.map((r) => ({
      id: r.id,
      tanggal: r.tanggal,
      student: {
        nama: r.student?.user?.name || "-",
        kelas: r.student?.classroom?.namaKelas || "-",
        nisn: r.student?.nisn || "-",
      },
      item: {
        nama: r.item?.nama || "-",
        point: r.item?.point || 0,
        kategori: r.item?.kategori?.nama || "-",
      },
      pelapor: {
        nama: r.reporter?.name || "-",
        role: r.reporter?.role || "Bk",
      },
    }));
    res.json({ data });
  } catch (error) {
    console.error("[DashboardBK] Error recent violations:", error);
    res.status(500).json({ error: "Gagal mengambil pelanggaran terbaru" });
  }
};

module.exports = {
  getDashboardSummary,
  getRecentViolations,
};
