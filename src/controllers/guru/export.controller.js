const { PrismaClient } = require("@prisma/client");
const ExcelJS = require("exceljs");

const prisma = new PrismaClient();

// Ambil informasi kelas yang diampu wali kelas
const getKelasInfo = async (req, res) => {
  try {
    const userId = req.user.id;

    // Cari guru dan kelas yang diwalikan
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: {
        classrooms: {
          include: {
            jurusan: true,
          },
        },
      },
    });

    if (!teacher || !teacher.classrooms.length) {
      return res.status(404).json({
        success: false,
        error: "Anda tidak menjadi wali kelas manapun",
      });
    }

    const classroom = teacher.classrooms[0];

    const kelasInfo = {
      id: classroom.id,
      kodeKelas: classroom.kodeKelas,
      namaKelas: classroom.namaKelas,
      jurusan: classroom.jurusan?.namaJurusan || null,
    };

    res.json({
      success: true,
      data: kelasInfo,
    });
  } catch (err) {
    console.error("Error getKelasInfo:", err);
    res.status(500).json({
      success: false,
      error: "Gagal mengambil informasi kelas",
    });
  }
};

// Preview laporan untuk kelas yang diampu wali kelas
const previewLaporanWK = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bulan, tahunAjaranId, tipe } = req.query;

    // Cari guru dan kelas yang diwalikan
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: { classrooms: true },
    });

    if (!teacher || !teacher.classrooms.length) {
      return res.status(404).json({
        success: false,
        error: "Anda tidak menjadi wali kelas manapun",
      });
    }

    const classroom = teacher.classrooms[0];
    const kelas = classroom.kodeKelas;

    // Setup filter
    let where = {
      student: { classroom: { kodeKelas: kelas } },
    };

    if (tahunAjaranId) where.tahunAjaranId = parseInt(tahunAjaranId);
    if (tipe && tipe !== "all") where["item"] = { tipe };
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

    const reports = await prisma.studentReport.findMany({
      where,
      include: {
        student: {
          select: {
            nisn: true,
            user: { select: { name: true } },
            classroom: { select: { kodeKelas: true, namaKelas: true } },
          },
        },
        item: {
          select: {
            nama: true,
            tipe: true,
            kategori: { select: { nama: true } },
          },
        },
        reporter: { select: { name: true } },
        tahunAjaran: { select: { tahunAjaran: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = reports.map((r) => ({
      nisn: r.student?.nisn,
      nama: r.student?.user?.name,
      kelas: r.student?.classroom?.kodeKelas || r.classAtTime,
      namaKelas: r.student?.classroom?.namaKelas,
      tanggal: r.tanggal.toISOString().slice(0, 10),
      tipe: r.item?.tipe,
      kategori: r.item?.kategori?.nama,
      item: r.item?.nama,
      point: r.pointSaat, // Point sudah benar di database
      deskripsi: r.deskripsi,
      reporter: r.reporter?.name,
      tahunAjaran: r.tahunAjaran?.tahunAjaran,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error("Preview laporan WK error:", err);
    res.status(500).json({ success: false, error: "Gagal preview laporan" });
  }
};

// Export laporan untuk kelas yang diampu wali kelas
const exportLaporanWK = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bulan, tahunAjaranId, tipe } = req.query;

    // Cari guru dan kelas yang diwalikan
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: { classrooms: true },
    });

    if (!teacher || !teacher.classrooms.length) {
      return res.status(404).json({
        success: false,
        error: "Anda tidak menjadi wali kelas manapun",
      });
    }

    const classroom = teacher.classrooms[0];
    const kelas = classroom.kodeKelas;

    // Setup filter
    let where = {
      student: { classroom: { kodeKelas: kelas } },
    };

    if (tahunAjaranId) where.tahunAjaranId = parseInt(tahunAjaranId);
    if (tipe && tipe !== "all") where["item"] = { tipe };
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

    // Labels untuk filter
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

    // Fetch data
    const reports = await prisma.studentReport.findMany({
      where,
      include: {
        student: {
          select: {
            nisn: true,
            user: { select: { name: true } },
            classroom: { select: { kodeKelas: true, namaKelas: true } },
          },
        },
        item: {
          select: {
            nama: true,
            tipe: true,
            kategori: { select: { nama: true } },
          },
        },
        reporter: { select: { name: true } },
        tahunAjaran: { select: { tahunAjaran: true } },
      },
      orderBy: { tanggal: "asc" },
    });

    // Excel export
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Laporan Kelas");

    // Header dengan informasi filter
    sheet.addRow([
      `Laporan Kelas ${classroom.kodeKelas} - ${classroom.namaKelas}`,
    ]);
    sheet.addRow([`Filter: ${tipeLabel}, ${tahunAjaranLabel}, ${bulanLabel}`]);
    sheet.addRow([]); // baris kosong

    sheet.columns = [
      { header: "NISN", key: "nisn", width: 15 },
      { header: "Nama", key: "nama", width: 20 },
      { header: "Tanggal", key: "tanggal", width: 15 },
      { header: "Tipe", key: "tipe", width: 15 },
      { header: "Kategori", key: "kategori", width: 15 },
      { header: "Item", key: "item", width: 20 },
      { header: "Point", key: "point", width: 10 },
      { header: "Deskripsi", key: "deskripsi", width: 30 },
      { header: "Pelapor", key: "reporter", width: 20 },
      { header: "Tahun Ajaran", key: "tahunAjaran", width: 15 },
    ];

    reports.forEach((r) => {
      sheet.addRow({
        nisn: r.student?.nisn,
        nama: r.student?.user?.name,
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

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=laporan_${kelas}_export.xlsx`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Export laporan WK error:", err);
    res.status(500).json({ error: "Gagal export laporan" });
  }
};

// Preview poin siswa untuk kelas yang diampu wali kelas
const previewPoinSiswaWK = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bulan, tahunAjaranId } = req.query;

    // Cari guru dan kelas yang diwalikan
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: { classrooms: true },
    });

    if (!teacher || !teacher.classrooms.length) {
      return res.status(404).json({
        success: false,
        error: "Anda tidak menjadi wali kelas manapun",
      });
    }

    const classroom = teacher.classrooms[0];
    const kelas = classroom.kodeKelas;

    // Filter siswa berdasarkan kelas wali kelas
    let where = {
      isArchived: false,
      classroom: { kodeKelas: kelas },
    };

    const students = await prisma.student.findMany({
      where,
      include: {
        user: { select: { name: true } },
        classroom: { select: { kodeKelas: true, namaKelas: true } },
        angkatan: { select: { tahun: true } },
        reports: {
          where: tahunAjaranId
            ? { tahunAjaranId: parseInt(tahunAjaranId) }
            : undefined,
          include: { item: { select: { tipe: true } } },
        },
        pointAdjustments: tahunAjaranId
          ? { where: { tahunAjaranId: parseInt(tahunAjaranId) } }
          : true,
      },
      orderBy: { nisn: "asc" },
    });

    const data = students.map((s) => {
      let pelanggaran = 0;
      let prestasi = 0;
      let totalScore = 0;
      let jmlPenanganan = 0;
      let totalPoinPelanggaran = 0;
      let totalPoinPrestasi = 0;
      let totalPoinPenanganan = 0;

      // Filter reports berdasarkan bulan jika ada
      let filteredReports = s.reports;
      if (s.reports && Array.isArray(s.reports)) {
        if (bulan) {
          const [tahun, bln] = bulan.split("-");
          const nextMonth =
            Number(bln) === 12
              ? "01"
              : String(Number(bln) + 1).padStart(2, "0");
          const nextYear =
            Number(bln) === 12 ? String(Number(tahun) + 1) : tahun;
          const gte = new Date(`${tahun}-${bln}-01`);
          const lt = new Date(`${nextYear}-${nextMonth}-01`);
          filteredReports = s.reports.filter(
            (r) => r.tanggal >= gte && r.tanggal < lt
          );
        }

        pelanggaran = filteredReports.filter(
          (r) => r.item?.tipe === "pelanggaran"
        ).length;
        prestasi = filteredReports.filter(
          (r) => r.item?.tipe === "prestasi"
        ).length;

        // Total score calculation
        totalScore = filteredReports.reduce((sum, r) => {
          if (typeof r.pointSaat !== "number") return sum;
          return sum + r.pointSaat; // Point sudah benar di database (negatif untuk pelanggaran, positif untuk prestasi)
        }, 0);

        // Total poin pelanggaran (akan negatif)
        totalPoinPelanggaran = filteredReports.reduce(
          (sum, r) =>
            sum +
            (r.item?.tipe === "pelanggaran" && typeof r.pointSaat === "number"
              ? r.pointSaat // Sudah negatif di database
              : 0),
          0
        );

        // Total poin prestasi
        totalPoinPrestasi = filteredReports.reduce(
          (sum, r) =>
            sum +
            (r.item?.tipe === "prestasi" && typeof r.pointSaat === "number"
              ? r.pointSaat
              : 0),
          0
        );
      }

      // Filter point adjustments berdasarkan bulan jika ada
      let filteredAdjustments = s.pointAdjustments;
      if (s.pointAdjustments && Array.isArray(s.pointAdjustments)) {
        if (bulan) {
          const [tahun, bln] = bulan.split("-");
          const nextMonth =
            Number(bln) === 12
              ? "01"
              : String(Number(bln) + 1).padStart(2, "0");
          const nextYear =
            Number(bln) === 12 ? String(Number(tahun) + 1) : tahun;
          const gte = new Date(`${tahun}-${bln}-01`);
          const lt = new Date(`${nextYear}-${nextMonth}-01`);
          filteredAdjustments = s.pointAdjustments.filter(
            (adj) => adj.tanggal >= gte && adj.tanggal < lt
          );
        }
        jmlPenanganan = filteredAdjustments.length;
        totalPoinPenanganan = filteredAdjustments.reduce(
          (sum, adj) =>
            sum +
            (typeof adj.pointPengurangan === "number"
              ? adj.pointPengurangan
              : 0),
          0
        );
      }

      // Total score + penanganan
      const totalScoreWithAdjustment = totalScore + totalPoinPenanganan;

      return {
        nisn: s.nisn,
        nama: s.user?.name,
        kelas: s.classroom?.kodeKelas,
        namaKelas: s.classroom?.namaKelas,
        angkatan: s.angkatan?.tahun,
        totalScore: totalScoreWithAdjustment,
        status: s.isArchived ? "Arsip" : "Aktif",
        pelanggaran,
        prestasi,
        jmlPenanganan,
        totalPoinPelanggaran,
        totalPoinPrestasi,
        totalPoinPenanganan,
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error("Preview poin siswa WK error:", err);
    res.status(500).json({ success: false, error: "Gagal preview poin siswa" });
  }
};

// Export poin siswa untuk kelas yang diampu wali kelas
const exportPoinSiswaWK = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bulan, tahunAjaranId } = req.query;

    // Cari guru dan kelas yang diwalikan
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: { classrooms: true },
    });

    if (!teacher || !teacher.classrooms.length) {
      return res.status(404).json({
        success: false,
        error: "Anda tidak menjadi wali kelas manapun",
      });
    }

    const classroom = teacher.classrooms[0];
    const kelas = classroom.kodeKelas;

    // Filter siswa berdasarkan kelas wali kelas
    let where = {
      isArchived: false,
      classroom: { kodeKelas: kelas },
    };

    const students = await prisma.student.findMany({
      where,
      include: {
        user: { select: { name: true } },
        classroom: { select: { kodeKelas: true, namaKelas: true } },
        angkatan: { select: { tahun: true } },
        reports: {
          where: tahunAjaranId
            ? { tahunAjaranId: parseInt(tahunAjaranId) }
            : undefined,
          include: { item: { select: { tipe: true } } },
        },
        pointAdjustments: tahunAjaranId
          ? { where: { tahunAjaranId: parseInt(tahunAjaranId) } }
          : true,
      },
      orderBy: { nisn: "asc" },
    });

    // Excel export
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Poin Siswa Kelas");

    // Header dengan informasi kelas
    sheet.addRow([
      `Rekap Poin Siswa Kelas ${classroom.kodeKelas} - ${classroom.namaKelas}`,
    ]);

    let filterInfo = [];
    if (bulan) filterInfo.push(`Bulan: ${bulan}`);
    if (tahunAjaranId) {
      const tahunObj = await prisma.tahunAjaran.findUnique({
        where: { id: parseInt(tahunAjaranId) },
      });
      if (tahunObj) filterInfo.push(`Tahun Ajaran: ${tahunObj.tahunAjaran}`);
    }
    if (filterInfo.length > 0) {
      sheet.addRow([`Filter: ${filterInfo.join(", ")}`]);
    }
    sheet.addRow([]); // baris kosong

    sheet.columns = [
      { header: "NISN", key: "nisn", width: 15 },
      { header: "Nama", key: "nama", width: 20 },
      { header: "Angkatan", key: "angkatan", width: 15 },
      { header: "Score", key: "totalScore", width: 12 },
      { header: "Jml Pel.", key: "pelanggaran", width: 10 },
      { header: "Poin Pel.", key: "totalPoinPelanggaran", width: 12 },
      { header: "Jml Pres.", key: "prestasi", width: 10 },
      { header: "Poin Pres.", key: "totalPoinPrestasi", width: 12 },
      { header: "Jml Pen.", key: "jmlPenanganan", width: 10 },
      { header: "Poin Pen.", key: "totalPoinPenanganan", width: 12 },
    ];

    students.forEach((s) => {
      // Calculate metrics with filtering
      let filteredReports = s.reports;
      let filteredAdjustments = s.pointAdjustments;

      if (bulan && s.reports) {
        const [tahun, bln] = bulan.split("-");
        const nextMonth =
          Number(bln) === 12 ? "01" : String(Number(bln) + 1).padStart(2, "0");
        const nextYear = Number(bln) === 12 ? String(Number(tahun) + 1) : tahun;
        const gte = new Date(`${tahun}-${bln}-01`);
        const lt = new Date(`${nextYear}-${nextMonth}-01`);
        filteredReports = s.reports.filter(
          (r) => r.tanggal >= gte && r.tanggal < lt
        );
        if (s.pointAdjustments) {
          filteredAdjustments = s.pointAdjustments.filter(
            (adj) => adj.tanggal >= gte && adj.tanggal < lt
          );
        }
      }

      const pelanggaran = filteredReports.filter(
        (r) => r.item?.tipe === "pelanggaran"
      ).length;
      const prestasi = filteredReports.filter(
        (r) => r.item?.tipe === "prestasi"
      ).length;

      const totalPoinPelanggaran = filteredReports.reduce(
        (sum, r) =>
          sum +
          (r.item?.tipe === "pelanggaran" && typeof r.pointSaat === "number"
            ? r.pointSaat // Sudah negatif di database
            : 0),
        0
      );

      const totalPoinPrestasi = filteredReports.reduce(
        (sum, r) =>
          sum +
          (r.item?.tipe === "prestasi" && typeof r.pointSaat === "number"
            ? r.pointSaat
            : 0),
        0
      );

      const jmlPenanganan = filteredAdjustments
        ? filteredAdjustments.length
        : 0;
      const totalPoinPenanganan = filteredAdjustments
        ? filteredAdjustments.reduce(
            (sum, adj) =>
              sum +
              (typeof adj.pointPengurangan === "number"
                ? adj.pointPengurangan
                : 0),
            0
          )
        : 0;

      const totalScore = filteredReports.reduce((sum, r) => {
        if (typeof r.pointSaat !== "number") return sum;
        return sum + r.pointSaat; // Point sudah benar di database
      }, 0);

      const totalScoreWithAdjustment = totalScore + totalPoinPenanganan;

      sheet.addRow({
        nisn: s.nisn,
        nama: s.user?.name,
        angkatan: s.angkatan?.tahun,
        totalScore: totalScoreWithAdjustment,
        pelanggaran,
        totalPoinPelanggaran,
        prestasi,
        totalPoinPrestasi,
        jmlPenanganan,
        totalPoinPenanganan,
      });
    });

    // Color coding seperti di controller utama
    const headerRow = sheet.getRow(sheet.rowCount > 2 ? 4 : 1); // Adjust for header rows

    // Pelanggaran (merah)
    headerRow.getCell(5).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFC7CE" },
    };
    headerRow.getCell(6).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFC7CE" },
    };
    // Prestasi (hijau)
    headerRow.getCell(7).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFC6EFCE" },
    };
    headerRow.getCell(8).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFC6EFCE" },
    };
    // Penanganan (biru)
    headerRow.getCell(9).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFCCE5FF" },
    };
    headerRow.getCell(10).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFCCE5FF" },
    };

    // Color data rows
    const startRow = sheet.rowCount > 2 ? 5 : 2; // Adjust for header rows
    for (let i = startRow; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      // Pelanggaran
      row.getCell(5).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFC7CE" },
      };
      row.getCell(6).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFC7CE" },
      };
      // Prestasi
      row.getCell(7).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFC6EFCE" },
      };
      row.getCell(8).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFC6EFCE" },
      };
      // Penanganan
      row.getCell(9).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFCCE5FF" },
      };
      row.getCell(10).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFCCE5FF" },
      };
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=poin_siswa_${kelas}_export.xlsx`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Export poin siswa WK error:", err);
    res.status(500).json({ error: "Gagal export poin siswa" });
  }
};

module.exports = {
  getKelasInfo,
  previewLaporanWK,
  exportLaporanWK,
  previewPoinSiswaWK,
  exportPoinSiswaWK,
};
