const { PrismaClient } = require("@prisma/client");
const ExcelJS = require("exceljs");

const prisma = new PrismaClient();

// Get student reports berdasarkan jurusan dengan pagination dan filter
const getStudentReportsByJurusan = async (req, res) => {
  try {
    const { jurusanId } = req.params;
    const {
      page = 1,
      limit = 20,
      tipe,
      bulan,
      tahunAjaranId,
      search,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Validasi jurusan
    const jurusan = await prisma.jurusan.findUnique({
      where: { id: parseInt(jurusanId) },
      select: { id: true, kodeJurusan: true, namaJurusan: true },
    });

    if (!jurusan) {
      return res.status(404).json({
        success: false,
        error: "Jurusan tidak ditemukan",
      });
    }

    // Setup filter
    let where = {
      student: {
        classroom: {
          jurusanId: parseInt(jurusanId),
        },
      },
    };

    // Filter berdasarkan tipe
    if (tipe && tipe !== "all") {
      where.item = { tipe };
    }

    // Filter berdasarkan tahun ajaran
    if (tahunAjaranId) {
      where.tahunAjaranId = parseInt(tahunAjaranId);
    }

    // Filter berdasarkan bulan
    if (bulan) {
      const [tahun, bln] = bulan.split("-");
      const nextMonth =
        Number(bln) === 12 ? "01" : String(Number(bln) + 1).padStart(2, "0");
      const nextYear = Number(bln) === 12 ? String(Number(tahun) + 1) : tahun;
      where.tanggal = {
        gte: new Date(`${tahun}-${bln}-01`),
        lt: new Date(`${nextYear}-${nextMonth}-01`),
      };
    }

    // Filter berdasarkan search (nama siswa atau NISN)
    if (search && search.trim()) {
      where.student = {
        ...where.student,
        OR: [
          { nisn: { contains: search.trim() } },
          { user: { name: { contains: search.trim(), mode: "insensitive" } } },
        ],
      };
    }

    // Only show approved reports
    where.status = "approved";

    // Count total records
    const total = await prisma.studentReport.count({ where });

    // Fetch reports
    const reports = await prisma.studentReport.findMany({
      where,
      include: {
        student: {
          select: {
            nisn: true,
            user: { select: { name: true } },
            classroom: {
              select: {
                kodeKelas: true,
                namaKelas: true,
                jurusan: { select: { kodeJurusan: true, namaJurusan: true } },
              },
            },
            angkatan: { select: { tahun: true } },
          },
        },
        item: {
          select: {
            nama: true,
            tipe: true,
            point: true,
            kategori: { select: { nama: true } },
          },
        },
        reporter: { select: { name: true, role: true } },
        tahunAjaran: { select: { tahunAjaran: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: parseInt(limit),
    });

    const data = reports.map((r) => ({
      id: r.id,
      nisn: r.student?.nisn,
      nama: r.student?.user?.name,
      kelas: r.student?.classroom?.kodeKelas,
      namaKelas: r.student?.classroom?.namaKelas,
      angkatan: r.student?.angkatan?.tahun,
      tanggal: r.tanggal.toISOString().slice(0, 10),
      waktu: r.waktu ? r.waktu.toISOString() : null,
      tipe: r.item?.tipe,
      kategori: r.item?.kategori?.nama,
      item: r.item?.nama,
      point: r.pointSaat, // Point sudah benar di database (negatif untuk pelanggaran, positif untuk prestasi)
      deskripsi: r.deskripsi,
      bukti: r.bukti,
      reporter: r.reporter?.name,
      reporterRole: r.reporter?.role,
      tahunAjaran: r.tahunAjaran?.tahunAjaran,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    res.json({
      success: true,
      data: {
        jurusan,
        reports: data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (err) {
    console.error("Error getStudentReportsByJurusan:", err);
    res.status(500).json({
      success: false,
      error: "Gagal mengambil data laporan siswa berdasarkan jurusan",
    });
  }
};

// Get summary statistik reports berdasarkan jurusan
const getReportsSummaryByJurusan = async (req, res) => {
  try {
    const { jurusanId } = req.params;
    const { tahunAjaranId, bulan } = req.query;

    // Validasi jurusan
    const jurusan = await prisma.jurusan.findUnique({
      where: { id: parseInt(jurusanId) },
      select: { id: true, kodeJurusan: true, namaJurusan: true },
    });

    if (!jurusan) {
      return res.status(404).json({
        success: false,
        error: "Jurusan tidak ditemukan",
      });
    }

    // Setup filter
    let where = {
      student: {
        classroom: {
          jurusanId: parseInt(jurusanId),
        },
      },
    };

    // Filter berdasarkan tahun ajaran
    if (tahunAjaranId) {
      where.tahunAjaranId = parseInt(tahunAjaranId);
    }

    // Filter berdasarkan bulan
    if (bulan) {
      const [tahun, bln] = bulan.split("-");
      const nextMonth =
        Number(bln) === 12 ? "01" : String(Number(bln) + 1).padStart(2, "0");
      const nextYear = Number(bln) === 12 ? String(Number(tahun) + 1) : tahun;
      where.tanggal = {
        gte: new Date(`${tahun}-${bln}-01`),
        lt: new Date(`${nextYear}-${nextMonth}-01`),
      };
    }

    // Only show approved reports (applies to all queries below)
    where.status = "approved";

    // Count total reports
    const totalReports = await prisma.studentReport.count({ where });

    // Count by type
    const pelanggaranCount = await prisma.studentReport.count({
      where: {
        ...where,
        item: { tipe: "pelanggaran" },
      },
    });

    const prestasiCount = await prisma.studentReport.count({
      where: {
        ...where,
        item: { tipe: "prestasi" },
      },
    });

    // Count unique students
    const uniqueStudents = await prisma.studentReport.findMany({
      where,
      select: {
        studentId: true,
      },
      distinct: ["studentId"],
    });

    // Get top categories
    const topCategories = await prisma.studentReport.groupBy({
      by: ["itemId"],
      where,
      _count: {
        itemId: true,
      },
      orderBy: {
        _count: {
          itemId: "desc",
        },
      },
      take: 5,
    });

    // Get category details
    const categoryDetails = await Promise.all(
      topCategories.map(async (cat) => {
        const item = await prisma.reportItem.findUnique({
          where: { id: cat.itemId },
          include: {
            kategori: { select: { nama: true } },
          },
        });
        return {
          itemId: cat.itemId,
          itemNama: item?.nama,
          kategori: item?.kategori?.nama,
          tipe: item?.tipe,
          count: cat._count.itemId,
        };
      })
    );

    // Get monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");

      const monthStart = new Date(`${year}-${month}-01`);
      const monthEnd = new Date(year, date.getMonth() + 1, 0);

      const monthlyCount = await prisma.studentReport.count({
        where: {
          ...where,
          tanggal: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      });

      monthlyTrend.push({
        month: `${year}-${month}`,
        count: monthlyCount,
      });
    }

    res.json({
      success: true,
      data: {
        jurusan,
        summary: {
          totalReports,
          pelanggaranCount,
          prestasiCount,
          uniqueStudentsCount: uniqueStudents.length,
          topCategories: categoryDetails,
          monthlyTrend,
        },
      },
    });
  } catch (err) {
    console.error("Error getReportsSummaryByJurusan:", err);
    res.status(500).json({
      success: false,
      error: "Gagal mengambil summary laporan berdasarkan jurusan",
    });
  }
};

// Export reports berdasarkan jurusan ke Excel
const exportReportsByJurusan = async (req, res) => {
  try {
    const { jurusanId } = req.params;
    const { tipe, bulan, tahunAjaranId } = req.query;

    // Validasi jurusan
    const jurusan = await prisma.jurusan.findUnique({
      where: { id: parseInt(jurusanId) },
      select: { id: true, kodeJurusan: true, namaJurusan: true },
    });

    if (!jurusan) {
      return res.status(404).json({
        success: false,
        error: "Jurusan tidak ditemukan",
      });
    }

    // Setup filter
    let where = {
      student: {
        classroom: {
          jurusanId: parseInt(jurusanId),
        },
      },
    };

    // Filter berdasarkan tipe
    if (tipe && tipe !== "all") {
      where.item = { tipe };
    }

    // Filter berdasarkan tahun ajaran
    if (tahunAjaranId) {
      where.tahunAjaranId = parseInt(tahunAjaranId);
    }

    // Filter berdasarkan bulan
    if (bulan) {
      const [tahun, bln] = bulan.split("-");
      const nextMonth =
        Number(bln) === 12 ? "01" : String(Number(bln) + 1).padStart(2, "0");
      const nextYear = Number(bln) === 12 ? String(Number(tahun) + 1) : tahun;
      where.tanggal = {
        gte: new Date(`${tahun}-${bln}-01`),
        lt: new Date(`${nextYear}-${nextMonth}-01`),
      };
    }

    // Only show approved reports
    where.status = "approved";

    // Fetch reports
    const reports = await prisma.studentReport.findMany({
      where,
      include: {
        student: {
          select: {
            nisn: true,
            user: { select: { name: true } },
            classroom: {
              select: {
                kodeKelas: true,
                namaKelas: true,
              },
            },
            angkatan: { select: { tahun: true } },
          },
        },
        item: {
          select: {
            nama: true,
            tipe: true,
            point: true,
            kategori: { select: { nama: true } },
          },
        },
        reporter: { select: { name: true, role: true } },
        tahunAjaran: { select: { tahunAjaran: true } },
      },
      orderBy: { tanggal: "asc" },
    });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Laporan Jurusan");

    // Filter labels
    let tipeLabel =
      tipe === "all" || !tipe
        ? "Semua"
        : tipe.charAt(0).toUpperCase() + tipe.slice(1);
    let bulanLabel = bulan ? bulan : "Semua Bulan";
    let tahunAjaranLabel = "Semua Tahun Ajaran";

    if (tahunAjaranId) {
      const tahunObj = await prisma.tahunAjaran.findUnique({
        where: { id: parseInt(tahunAjaranId) },
      });
      if (tahunObj) tahunAjaranLabel = tahunObj.tahunAjaran;
    }

    // Header dengan informasi filter
    sheet.addRow([
      `Laporan Siswa Jurusan ${jurusan.kodeJurusan} - ${jurusan.namaJurusan}`,
    ]);
    sheet.addRow([`Filter: ${tipeLabel}, ${tahunAjaranLabel}, ${bulanLabel}`]);
    sheet.addRow([]); // baris kosong

    // Setup columns
    sheet.columns = [
      { header: "NISN", key: "nisn", width: 15 },
      { header: "Nama Siswa", key: "nama", width: 25 },
      { header: "Kelas", key: "kelas", width: 15 },
      { header: "Angkatan", key: "angkatan", width: 10 },
      { header: "Tanggal", key: "tanggal", width: 12 },
      { header: "Tipe", key: "tipe", width: 12 },
      { header: "Kategori", key: "kategori", width: 20 },
      { header: "Item", key: "item", width: 30 },
      { header: "Point", key: "point", width: 10 },
      { header: "Deskripsi", key: "deskripsi", width: 40 },
      { header: "Pelapor", key: "reporter", width: 20 },
      { header: "Tahun Ajaran", key: "tahunAjaran", width: 15 },
    ];

    // Add data rows
    reports.forEach((r) => {
      sheet.addRow({
        nisn: r.student?.nisn,
        nama: r.student?.user?.name,
        kelas: r.student?.classroom?.kodeKelas,
        angkatan: r.student?.angkatan?.tahun,
        tanggal: r.tanggal.toISOString().slice(0, 10),
        tipe: r.item?.tipe,
        kategori: r.item?.kategori?.nama,
        item: r.item?.nama,
        point: r.pointSaat, // Point sudah benar di database
        deskripsi: r.deskripsi,
        reporter: r.reporter?.name,
        tahunAjaran: r.tahunAjaran?.tahunAjaran,
      });
    });

    // Style the header
    const headerRow = sheet.getRow(4); // Row with column headers
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };
      cell.font = { bold: true };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=laporan_jurusan_${jurusan.kodeJurusan}_export.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error exportReportsByJurusan:", err);
    res.status(500).json({
      success: false,
      error: "Gagal export laporan berdasarkan jurusan",
    });
  }
};

// Get list of all jurusan (untuk dropdown/filter)
const getAllJurusan = async (req, res) => {
  try {
    let where = { isActive: true };

    // Jika guru, hanya tampilkan jurusan yang bisa diakses
    if (req.user.role === "guru") {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user.id },
        include: {
          classrooms: {
            select: {
              jurusanId: true,
              jurusan: {
                select: { id: true, kodeJurusan: true, namaJurusan: true },
              },
            },
          },
          jurusan: {
            select: { id: true },
          },
        },
      });

      if (!teacher) {
        return res.status(403).json({
          success: false,
          error: "Data guru tidak ditemukan",
        });
      }

      // Kumpulkan ID jurusan yang bisa diakses
      const accessibleJurusanIds = new Set();

      // Prioritas 1: Jika guru adalah kajur, hanya tampilkan jurusan yang dipimpin
      if (teacher.jurusan) {
        accessibleJurusanIds.add(teacher.jurusan.id);
      }
      // Prioritas 2: Jika guru adalah wali kelas, tampilkan jurusan dari kelas yang diampu
      else if (teacher.classrooms && teacher.classrooms.length > 0) {
        teacher.classrooms.forEach((classroom) => {
          accessibleJurusanIds.add(classroom.jurusanId);
        });
      }

      if (accessibleJurusanIds.size === 0) {
        return res.json({
          success: true,
          data: [],
          message: "Anda belum ditugaskan sebagai kajur atau wali kelas",
        });
      }

      where.id = {
        in: Array.from(accessibleJurusanIds),
      };
    }

    const jurusan = await prisma.jurusan.findMany({
      where,
      select: {
        id: true,
        kodeJurusan: true,
        namaJurusan: true,
        deskripsi: true,
        kajur: {
          select: {
            user: {
              select: { name: true },
            },
          },
        },
        _count: {
          select: {
            classrooms: true,
          },
        },
      },
      orderBy: { kodeJurusan: "asc" },
    });

    const data = jurusan.map((j) => ({
      id: j.id,
      kodeJurusan: j.kodeJurusan,
      namaJurusan: j.namaJurusan,
      deskripsi: j.deskripsi,
      kajur: j.kajur?.user?.name || "Belum ada",
      totalKelas: j._count.classrooms,
    }));

    // Jika guru dan hanya ada satu jurusan yang bisa diakses,
    // langsung return dengan flag autoSelect
    const result = {
      success: true,
      data,
    };

    if (req.user.role === "guru" && data.length === 1) {
      result.autoSelect = data[0].id;
      result.message = `Anda memiliki akses ke jurusan ${data[0].namaJurusan}`;
    }

    res.json(result);
  } catch (err) {
    console.error("Error getAllJurusan:", err);
    res.status(500).json({
      success: false,
      error: "Gagal mengambil data jurusan",
    });
  }
};

module.exports = {
  getStudentReportsByJurusan,
  getReportsSummaryByJurusan,
  exportReportsByJurusan,
  getAllJurusan,
};
