const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ExcelJS = require("exceljs");

// Preview data poin siswa (untuk frontend preview sebelum export)
async function previewPoinSiswa(req, res) {
  try {
    const { kelas, bulan, tahunAjaranId } = req.query;
    let where = { isArchived: false };
    if (kelas) where.classroom = { kodeKelas: kelas };
    // Ambil semua siswa aktif, join user, kelas, angkatan, dan filter siswa yang punya laporan di bulan tsb jika bulan diisi

    const students = await prisma.student.findMany({
      where,
      include: {
        user: { select: { name: true } },
        classroom: { select: { kodeKelas: true, namaKelas: true } },
        angkatan: { select: { tahun: true } },
        reports: {
          where: tahunAjaranId
            ? {
                tahunAjaranId: parseInt(tahunAjaranId),
                status: "approved",
              }
            : { status: "approved" },
          include: { item: { select: { tipe: true } } },
        },
        pointAdjustments: tahunAjaranId
          ? { where: { tahunAjaranId: parseInt(tahunAjaranId) } }
          : true,
      },
      orderBy: { nisn: "asc" },
    });
    const data = students.map((s) => {
      // Hitung jumlah pelanggaran, prestasi, penanganan, dan totalScore berdasarkan filter bulan jika ada
      let pelanggaran = 0;
      let prestasi = 0;
      let totalScore = 0;
      let jmlPenanganan = 0;
      let totalAdjustment = 0;
      let totalPoinPelanggaran = 0;
      let totalPoinPrestasi = 0;
      let totalPoinPenanganan = 0;
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
        // Total score = sum pointSaat dari laporan di bulan tsb, pelanggaran dihitung minus
        totalScore = filteredReports.reduce((sum, r) => {
          if (typeof r.pointSaat !== "number") return sum;
          return sum + r.pointSaat; // Point sudah benar di database
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
      // Penanganan: jumlah pointAdjustment (rehabilitasi) dan total pengurangan
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
        totalAdjustment = filteredAdjustments.reduce(
          (sum, adj) =>
            sum -
            (typeof adj.pointPengurangan === "number"
              ? adj.pointPengurangan
              : 0),
          0
        );
        totalPoinPenanganan = filteredAdjustments.reduce(
          (sum, adj) =>
            sum +
            (typeof adj.pointPengurangan === "number"
              ? adj.pointPengurangan
              : 0),
          0
        );
      }
      // Total score + penanganan (penanganan = total poin penanganan, selalu positif)
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

    res.json({ data });
  } catch (err) {
    console.error("Preview poin siswa error:", err);
    res.status(500).json({ error: "Gagal preview poin siswa" });
  }
}

// Endpoint untuk fetch data kelas dan tahun ajaran (untuk filter di frontend)
async function getRekapOptions(req, res) {
  try {
    const kelas = await prisma.classroom.findMany({
      select: { id: true, kodeKelas: true, namaKelas: true },
      orderBy: { kodeKelas: "asc" },
    });
    const tahunAjaran = await prisma.tahunAjaran.findMany({
      select: { id: true, tahunAjaran: true, isActive: true },
      orderBy: { tahunAjaran: "desc" },
    });
    res.json({ kelas, tahunAjaran });
  } catch (err) {
    console.error("Gagal fetch options rekap:", err);
    res.status(500).json({ error: "Gagal mengambil data filter" });
  }
}
// Preview laporan (StudentReport) per bulan/tahun ajaran/per kelas/general
async function previewLaporan(req, res) {
  try {
    const { bulan, tahunAjaranId, kelas, tipe } = req.query;
    let where = {};
    if (tahunAjaranId) where.tahunAjaranId = parseInt(tahunAjaranId);
    if (kelas) {
      // Filter by student.classroom.kodeKelas
      where.student = { classroom: { kodeKelas: kelas } };
    }
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
    // Only show approved reports
    where.status = "approved";

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
    res.json({ data });
  } catch (err) {
    console.error("Preview laporan error:", err);
    res.status(500).json({ error: "Gagal preview laporan" });
  }
}
// Export laporan (StudentReport) per bulan/tahun ajaran/per kelas/general
async function exportLaporan(req, res) {
  try {
    const { bulan, tahunAjaranId, kelas, tipe } = req.query;
    // tipe: pelanggaran/prestasi/all
    let where = {};
    let filterKelas = kelas;
    let filterTahunAjaran = tahunAjaranId;
    let filterTipe = tipe;
    let filterBulan = bulan;
    if (tahunAjaranId) where.tahunAjaranId = parseInt(tahunAjaranId);
    if (kelas) {
      where.student = { classroom: { kodeKelas: kelas } };
    }
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
    // Ambil label filter
    let kelasLabel = kelas ? kelas : "Semua Kelas";
    let tahunAjaranLabel = "Semua Tahun Ajaran";
    let tipeLabel =
      tipe === "all" || !tipe
        ? "Semua"
        : tipe.charAt(0).toUpperCase() + tipe.slice(1);
    let bulanLabel = bulan ? bulan : "Semua Bulan";
    if (kelas) {
      const kelasObj = await prisma.classroom.findFirst({
        where: { kodeKelas: kelas },
      });
      if (kelasObj)
        kelasLabel = `${kelasObj.kodeKelas} - ${kelasObj.namaKelas}`;
    }
    if (tahunAjaranId) {
      const tahunObj = await prisma.tahunAjaran.findUnique({
        where: { id: parseInt(tahunAjaranId) },
      });
      if (tahunObj) tahunAjaranLabel = tahunObj.tahunAjaran;
    }
    // Only show approved reports
    where.status = "approved";

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
    const worksheet = workbook.addWorksheet("Laporan Siswa");

    // Title and filter info
    worksheet.mergeCells("A1:J1");
    worksheet.getCell(
      "A1"
    ).value = `LAPORAN SISWA JURUSAN REKAYASA PERANGKAT LUNAK`;
    worksheet.getCell("A1").font = { bold: true, size: 14 };
    worksheet.getCell("A1").alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    worksheet.mergeCells("A2:J2");
    worksheet.getCell(
      "A2"
    ).value = `Filter: Tipe ${tipeLabel}, Bulan ${bulanLabel}, Tahun Ajaran ${tahunAjaranLabel}, Kelas ${kelasLabel}`;
    worksheet.getCell("A2").font = { size: 11 };
    worksheet.getCell("A2").alignment = { horizontal: "center" };

    // Headers
    worksheet.addRow([]);
    const headerRow = worksheet.addRow([
      "No",
      "Tanggal",
      "NISN",
      "Nama Siswa",
      "Kelas",
      "Tipe",
      "Kategori",
      "Item",
      "Poin",
      "Pelapor",
    ]);

    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
    });

    // Data rows
    reports.forEach((r, idx) => {
      const row = worksheet.addRow([
        idx + 1,
        new Date(r.tanggal).toLocaleDateString("id-ID"),
        r.student?.nisn,
        r.student?.user?.name,
        r.student?.classroom?.kodeKelas || r.classAtTime,
        r.item?.tipe,
        r.item?.kategori?.nama,
        r.item?.nama,
        r.pointSaat,
        r.reporter?.name,
      ]);

      row.eachCell((cell, colNum) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        if (colNum === 1 || colNum === 9) {
          cell.alignment = { horizontal: "center" };
        }
      });

      // Color code by type
      if (r.item?.tipe === "pelanggaran") {
        row.getCell(6).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFC7CE" },
        };
      } else if (r.item?.tipe === "prestasi") {
        row.getCell(6).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFC6EFCE" },
        };
      }
    });

    // Column widths
    worksheet.columns = [
      { width: 5 },
      { width: 12 },
      { width: 12 },
      { width: 25 },
      { width: 12 },
      { width: 12 },
      { width: 20 },
      { width: 30 },
      { width: 10 },
      { width: 20 },
    ];

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=laporan_${Date.now()}.xlsx`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Export laporan error:", err);
    res.status(500).json({ error: "Gagal export laporan" });
  }
}

// Export data poin siswa (rekap score)
async function exportPoinSiswa(req, res) {
  try {
    const { kelas, tahunAjaranId, bulan } = req.query;
    let where = { isArchived: false };
    if (kelas) where.classroom = { kodeKelas: kelas };
    // Ambil semua siswa aktif, join user, kelas, angkatan, dan laporan
    const students = await prisma.student.findMany({
      where,
      include: {
        user: { select: { name: true } },
        classroom: { select: { kodeKelas: true, namaKelas: true } },
        angkatan: { select: { tahun: true } },
        reports: {
          where: tahunAjaranId
            ? {
                tahunAjaranId: parseInt(tahunAjaranId),
                status: "approved",
              }
            : { status: "approved" },
          include: {
            item: { select: { tipe: true } },
          },
        },
        pointAdjustments: tahunAjaranId
          ? { where: { tahunAjaranId: parseInt(tahunAjaranId) } }
          : true,
      },
    });
    const data = students.map((s) => {
      // Hitung jumlah pelanggaran, prestasi, penanganan, dan totalScore berdasarkan filter bulan jika ada
      let pelanggaran = 0;
      let prestasi = 0;
      let totalScore = 0;
      let jmlPenanganan = 0;
      let totalAdjustment = 0;
      let totalPoinPelanggaran = 0;
      let totalPoinPrestasi = 0;
      let totalPoinPenanganan = 0;
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
        // Total score = sum pointSaat dari laporan di bulan tsb
        totalScore = filteredReports.reduce(
          (sum, r) => sum + (typeof r.pointSaat === "number" ? r.pointSaat : 0),
          0
        );
        // Total poin pelanggaran
        totalPoinPelanggaran = filteredReports.reduce(
          (sum, r) =>
            sum +
            (r.item?.tipe === "pelanggaran" && typeof r.pointSaat === "number"
              ? r.pointSaat
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
      // Penanganan: jumlah pointAdjustment (rehabilitasi) dan total pengurangan
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
        totalAdjustment = filteredAdjustments.reduce(
          (sum, adj) =>
            sum -
            (typeof adj.pointPengurangan === "number"
              ? adj.pointPengurangan
              : 0),
          0
        );
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
    // Labels untuk filter
    let kelasLabel = kelas ? kelas : "Semua Kelas";
    let bulanLabel = bulan ? bulan : "Semua Bulan";
    let tahunAjaranLabel = "Semua Tahun Ajaran";

    if (tahunAjaranId) {
      const tahunObj = await prisma.tahunAjaran.findUnique({
        where: { id: parseInt(tahunAjaranId) },
      });
      if (tahunObj) tahunAjaranLabel = tahunObj.tahunAjaran;
    }

    // Excel export
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Poin Siswa");

    // Title and filter info
    worksheet.mergeCells("A1:K1");
    worksheet.getCell("A1").value = `REKAP POIN SISWA`;
    worksheet.getCell("A1").font = { bold: true, size: 14 };
    worksheet.getCell("A1").alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    worksheet.mergeCells("A2:K2");
    worksheet.getCell(
      "A2"
    ).value = `Filter: Kelas ${kelasLabel}, Bulan ${bulanLabel}, Tahun Ajaran ${tahunAjaranLabel}`;
    worksheet.getCell("A2").font = { size: 11 };
    worksheet.getCell("A2").alignment = { horizontal: "center" };

    // Headers
    worksheet.addRow([]);
    const headerRow = worksheet.addRow([
      "NISN",
      "Nama",
      "Kelas",
      "Angkatan",
      "Pelanggaran",
      "Prestasi",
      "Penanganan",
      "Poin Pelanggaran",
      "Poin Prestasi",
      "Poin Penanganan",
      "Total Poin",
    ]);

    headerRow.font = { bold: true };
    headerRow.eachCell((cell, colNum) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      // Color code headers berdasarkan kategori
      if (colNum === 5 || colNum === 8) {
        // Pelanggaran (merah)
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFC7CE" },
        };
      } else if (colNum === 6 || colNum === 9) {
        // Prestasi (hijau)
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFC6EFCE" },
        };
      } else if (colNum === 7 || colNum === 10) {
        // Penanganan (biru)
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFCCE5FF" },
        };
      } else {
        // Default header color
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" },
        };
      }
    });

    // Tambahkan data siswa
    students.forEach((s) => {
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
          return sum + r.pointSaat;
        }, 0);

        // Total poin pelanggaran (akan negatif)
        totalPoinPelanggaran = filteredReports.reduce(
          (sum, r) =>
            sum +
            (r.item?.tipe === "pelanggaran" && typeof r.pointSaat === "number"
              ? r.pointSaat
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

      const row = worksheet.addRow([
        s.nisn,
        s.user?.name,
        s.classroom?.kodeKelas,
        s.angkatan?.tahun,
        pelanggaran,
        prestasi,
        jmlPenanganan,
        totalPoinPelanggaran,
        totalPoinPrestasi,
        totalPoinPenanganan,
        totalScoreWithAdjustment,
      ]);

      row.eachCell((cell, colNum) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        if (colNum >= 5) {
          cell.alignment = { horizontal: "center" };
        }
      });

      // Color code for each category
      // Pelanggaran (merah)
      row.getCell(5).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFC7CE" },
      };
      row.getCell(8).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFC7CE" },
      };

      // Prestasi (hijau)
      row.getCell(6).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFC6EFCE" },
      };
      row.getCell(9).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFC6EFCE" },
      };

      // Penanganan (biru)
      row.getCell(7).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFCCE5FF" },
      };
      row.getCell(10).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFCCE5FF" },
      };
    });

    // Column widths
    worksheet.columns = [
      { width: 12 },
      { width: 25 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 18 },
      { width: 15 },
      { width: 18 },
      { width: 12 },
    ];
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=poin_siswa_${Date.now()}.xlsx`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Export poin siswa error:", err);
    res.status(500).json({ error: "Gagal export poin siswa" });
  }
}

// Export rekap laporan per siswa (summary)
async function exportRekapLaporanSiswa(req, res) {
  try {
    const { kelas, tahunAjaranId } = req.query;
    let where = { isArchived: false };
    if (kelas) where.classroom = { kodeKelas: kelas };
    // Ambil semua siswa aktif, join user, kelas, angkatan, dan laporan
    const students = await prisma.student.findMany({
      where,
      include: {
        user: { select: { name: true } },
        classroom: { select: { kodeKelas: true, namaKelas: true } },
        angkatan: { select: { tahun: true } },
        reports: {
          include: {
            item: { select: { tipe: true } },
          },
        },
      },
      orderBy: { nisn: "asc" },
    });
    // Excel export
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Rekap Laporan Siswa");
    sheet.columns = [
      { header: "NISN", key: "nisn", width: 15 },
      { header: "Nama Siswa", key: "nama", width: 20 },
      { header: "Kelas", key: "kelas", width: 15 },
      { header: "Angkatan", key: "angkatan", width: 15 },
      { header: "Total Score", key: "totalScore", width: 12 },
      { header: "Jml Pelanggaran", key: "pelanggaran", width: 15 },
      { header: "Jml Prestasi", key: "prestasi", width: 15 },
    ];
    students.forEach((s) => {
      const pelanggaran = s.reports.filter(
        (r) => r.item?.tipe === "pelanggaran"
      ).length;
      const prestasi = s.reports.filter(
        (r) => r.item?.tipe === "prestasi"
      ).length;
      sheet.addRow({
        nisn: s.nisn,
        nama: s.user?.name,
        kelas: s.classroom?.kodeKelas,
        angkatan: s.angkatan?.tahun,
        totalScore: s.totalScore,
        pelanggaran,
        prestasi,
      });
    });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=rekap_laporan_siswa_export.xlsx`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Export rekap laporan siswa error:", err);
    res.status(500).json({ error: "Gagal export rekap laporan siswa" });
  }
}

// Get all tahun ajaran
async function getTahunAjaran(req, res) {
  try {
    const tahunAjaran = await prisma.tahunAjaran.findMany({
      orderBy: { tahunAjaran: "desc" },
    });
    res.json(tahunAjaran);
  } catch (error) {
    console.error("Error getting tahun ajaran:", error);
    res.status(500).json({ error: "Failed to fetch tahun ajaran" });
  }
}

// Get tahun ajaran non-aktif
async function getTahunAjaranNonAktif(req, res) {
  try {
    const tahunAjaran = await prisma.tahunAjaran.findMany({
      where: { isActive: false },
      orderBy: { tahunAjaran: "desc" },
    });
    res.json(tahunAjaran);
  } catch (error) {
    console.error("Error getting tahun ajaran non-aktif:", error);
    res.status(500).json({ error: "Failed to fetch tahun ajaran" });
  }
}

module.exports = {
  exportLaporan,
  exportPoinSiswa,
  exportRekapLaporanSiswa,
  previewLaporan,
  previewPoinSiswa,
  getRekapOptions,
  getTahunAjaran,
  getTahunAjaranNonAktif,
};
