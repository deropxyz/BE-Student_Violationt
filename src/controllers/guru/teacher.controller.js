const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// GET /guru/my-reports?userId=xxx&tahunAjaranId=yyy&tipe=pelanggaran|prestasi&bulan=1-12
// Mengambil semua laporan yang dibuat oleh user tertentu (guru) dengan filter tahun ajaran, tipe, dan bulan
const getMyReports = async (req, res) => {
  try {
    const userId = parseInt(req.query.userId);
    const tahunAjaranId = req.query.tahunAjaranId
      ? parseInt(req.query.tahunAjaranId)
      : undefined;
    const tipe = req.query.tipe;
    const bulan = req.query.bulan ? parseInt(req.query.bulan) : undefined; // 1-12
    if (!userId) {
      return res.status(400).json({ message: "userId wajib diisi" });
    }

    // Build where clause pakai reporterId (langsung userId)
    const where = { reporterId: userId };
    if (tahunAjaranId) where.tahunAjaranId = tahunAjaranId;
    if (tipe) where.item = { tipe };
    if (bulan) {
      // Filter by month (tanggal field)
      const year = new Date().getFullYear(); // default year if not filtered by tahun ajaran
      let filterYear = year;
      if (tahunAjaranId) {
        const tahunAjaran = await prisma.tahunAjaran.findUnique({
          where: { id: tahunAjaranId },
        });
        if (tahunAjaran) filterYear = parseInt(tahunAjaran.tahunMulai) || year;
      }
      const startDate = new Date(filterYear, bulan - 1, 1);
      const endDate = new Date(filterYear, bulan, 1);
      where.tanggal = { gte: startDate, lt: endDate };
    }

    // Guru melihat semua laporan mereka sendiri (pending, approved, rejected)
    // Tidak ada filter status karena ini laporan yang dibuat oleh guru tersebut

    // Ambil semua laporan yang reporterId = userId tsb
    const reports = await prisma.studentReport.findMany({
      where,
      include: {
        student: {
          include: {
            user: true,
            classroom: true,
            angkatan: true,
          },
        },
        item: {
          include: {
            kategori: true,
          },
        },
        tahunAjaran: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Get validator names for reports that have validatedBy
    const validatorIds = reports
      .filter((r) => r.validatedBy)
      .map((r) => r.validatedBy);
    const uniqueValidatorIds = [...new Set(validatorIds)];

    const validators = await prisma.user.findMany({
      where: { id: { in: uniqueValidatorIds } },
      select: { id: true, name: true },
    });

    const validatorMap = Object.fromEntries(
      validators.map((v) => [v.id, v.name])
    );

    // Map agar response hanya field yang dibutuhkan
    const mapped = reports.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      reporterId: r.reporterId,
      tanggal: r.tanggal,
      deskripsi: r.deskripsi,
      pointSaat: r.pointSaat,
      namaSiswa: r.student?.user?.name || "-",
      kategori: r.item?.kategori?.nama || "-",
      itemNama: r.item?.nama || "-",
      tipe: r.item?.tipe || "-",
      tahunAjaran: r.tahunAjaran?.tahunAjaran || "-",
      bukti: r.bukti,
      classAtTime: r.classAtTime || "-",
      status: r.status, // pending, approved, rejected
      validatedBy: r.validatedBy ? validatorMap[r.validatedBy] : null,
      validatedAt: r.validatedAt,
      rejectionNote: r.rejectionNote,
    }));

    res.json({ success: true, data: mapped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};
// GET /guru/report-detail/:id
// Mengambil detail laporan siswa berdasarkan id, termasuk bukti, nama siswa, kategori, item, dll
const getReportDetail = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "id wajib diisi" });
    }
    const report = await prisma.studentReport.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: true,
            classroom: true,
            angkatan: true,
          },
        },
        item: {
          include: {
            kategori: true,
          },
        },
        tahunAjaran: true,
      },
    });
    if (!report) {
      return res.status(404).json({ message: "Laporan tidak ditemukan" });
    }

    // Get validator name if exists
    let validatorName = null;
    if (report.validatedBy) {
      const validator = await prisma.user.findUnique({
        where: { id: report.validatedBy },
        select: { name: true },
      });
      validatorName = validator?.name;
    }

    // Format response hanya field penting
    res.json({
      success: true,
      data: {
        id: report.id,
        studentId: report.studentId,
        reporterId: report.reporterId,
        tanggal: report.tanggal,
        waktu: report.waktu,
        deskripsi: report.deskripsi,
        pointSaat: report.pointSaat,
        namaSiswa: report.student?.user?.name || "-",
        nisn: report.student?.nisn || "-",
        classAtTime:
          report.classAtTime || report.student?.classroom?.namaKelas || "-",
        kategori: report.item?.kategori?.nama || "-",
        itemNama: report.item?.nama || "-",
        tipe: report.item?.tipe || "-",
        tahunAjaran: report.tahunAjaran?.tahunAjaran || "-",
        bukti: report.bukti,
        status: report.status,
        validatedBy: validatorName,
        validatedAt: report.validatedAt,
        rejectionNote: report.rejectionNote,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};
// GET /guru/search-students?query=xxx
// Search siswa by nama atau nisn (untuk autocomplete form laporan)
const searchStudents = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.length < 2) {
      return res.json({ success: true, data: [] });
    }
    const students = await prisma.student.findMany({
      where: {
        isArchived: false,
        OR: [
          { nisn: { contains: query, mode: "insensitive" } },
          { user: { name: { contains: query, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        nisn: true,
        user: { select: { name: true } },
        classroom: { select: { kodeKelas: true, namaKelas: true } },
      },
      orderBy: { nisn: "asc" },
      take: 20,
    });
    const data = students.map((s) => ({
      id: s.id,
      nisn: s.nisn,
      name: s.user?.name || "",
      kodeKelas: s.classroom?.kodeKelas || "-",
      namaKelas: s.classroom?.namaKelas || "-",
    }));
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mencari siswa" });
  }
};

// GET /guru/categories
// Ambil data kategori
const getCategories = async (req, res) => {
  try {
    const categories = await prisma.kategori.findMany({
      select: {
        id: true,
        nama: true,
        tipe: true,
      },
      orderBy: { nama: "asc" },
    });
    res.json({ success: true, data: categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil data kategori" });
  }
};
// GET /guru/report-items
// Ambil data pelanggaran & prestasi: tipe -> kategori -> item
const getReportItemsStructured = async (req, res) => {
  try {
    // Ambil semua kategori beserta items-nya, group by tipe
    const categories = await prisma.kategori.findMany({
      include: {
        items: {
          where: { isActive: true },
          select: { id: true, nama: true, point: true, tipe: true },
          orderBy: { nama: "asc" },
        },
      },
      orderBy: { nama: "asc" },
    });

    // Group by tipe
    const result = {};
    for (const cat of categories) {
      if (!result[cat.tipe]) result[cat.tipe] = [];
      result[cat.tipe].push({
        kategoriId: cat.id,
        kategoriNama: cat.nama,
        items: cat.items.map((i) => ({
          id: i.id,
          nama: i.nama,
          point: i.point,
        })),
      });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil data report items" });
  }
};

// Struktur controller ini siap dikembangkan untuk endpoint guru lainnya
// GET /guru/search-report-items?query=xxx&type=pelanggaran|prestasi
// Search report item by nama item atau kategori, untuk autocomplete
const searchReportItems = async (req, res) => {
  try {
    const { query, type } = req.query;
    if (!query || query.length < 2) {
      return res.json({ success: true, data: [] });
    }
    const where = {
      isActive: true,
      OR: [
        { nama: { contains: query, mode: "insensitive" } },
        { kategori: { nama: { contains: query, mode: "insensitive" } } },
      ],
    };
    if (type === "pelanggaran" || type === "prestasi") {
      where.tipe = type;
    }
    const items = await prisma.reportItem.findMany({
      where,
      select: {
        id: true,
        nama: true,
        point: true,
        tipe: true,
        kategori: { select: { nama: true } },
      },
      orderBy: { nama: "asc" },
      take: 20,
    });
    // Format: Bentuk Pelanggaran (Kategori) Poin
    const data = items.map((i) => ({
      id: i.id,
      nama: i.nama,
      kategori: i.kategori?.nama || "-",
      tipe: i.tipe,
      point: i.point,
      label: `${i.nama} (${i.kategori?.nama || "-"}) ${
        i.tipe === "pelanggaran" ? "-" : "+"
      }${i.point} poin`,
    }));
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mencari report item" });
  }
};
module.exports = {
  getMyReports,
  getCategories,
  getReportItemsStructured,
  searchStudents,
  searchReportItems,
  getReportDetail,
};
