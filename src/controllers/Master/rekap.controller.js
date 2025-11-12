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
    const sheet = workbook.addWorksheet("Laporan");
    // Tambahkan keterangan filter di atas tabel
    sheet.addRow([
      `Rekap Laporan ${tipeLabel}, ${kelasLabel}, ${tahunAjaranLabel}, ${bulanLabel}`,
    ]);
    sheet.addRow([]); // baris kosong
    sheet.columns = [
      { header: "NISN", key: "nisn", width: 15 },
      { header: "Nama", key: "nama", width: 20 },
      { header: "Kelas", key: "kelas", width: 15 },
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
        kelas: r.student?.classroom?.kodeKelas || r.classAtTime,
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
      `attachment; filename=laporan_export.xlsx`
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
            ? { tahunAjaranId: parseInt(tahunAjaranId) }
            : undefined,
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
    // Excel export
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Poin Siswa");

    sheet.columns = [
      { header: "NISN", key: "nisn", width: 15 },
      { header: "Nama", key: "nama", width: 20 },
      { header: "Kelas", key: "kelas", width: 15 },
      { header: "Angkatan", key: "angkatan", width: 15 },
      { header: "Score", key: "totalScore", width: 12 },
      { header: "Jml Pel.", key: "pelanggaran", width: 10 },
      { header: "Poin Pel.", key: "totalPoinPelanggaran", width: 12 },
      { header: "Jml Pres.", key: "prestasi", width: 10 },
      { header: "Poin Pres.", key: "totalPoinPrestasi", width: 12 },
      { header: "Jml Pen.", key: "jmlPenanganan", width: 10 },
      { header: "Poin Pen.", key: "totalPoinPenanganan", width: 12 },
    ];

    // Tambahkan data siswa
    students.forEach((s) => {
      // ...existing code for filteredReports and filteredAdjustments...
      const pelanggaran = s.reports.filter(
        (r) => r.item?.tipe === "pelanggaran"
      ).length;
      const totalPoinPelanggaran = s.reports.reduce(
        (sum, r) =>
          sum +
          (r.item?.tipe === "pelanggaran" && typeof r.pointSaat === "number"
            ? r.pointSaat // Sudah negatif di database
            : 0),
        0
      );
      const prestasi = s.reports.filter(
        (r) => r.item?.tipe === "prestasi"
      ).length;
      const totalPoinPrestasi = s.reports.reduce(
        (sum, r) =>
          sum +
          (r.item?.tipe === "prestasi" && typeof r.pointSaat === "number"
            ? r.pointSaat
            : 0),
        0
      );
      const jmlPenanganan = s.pointAdjustments ? s.pointAdjustments.length : 0;
      const totalPoinPenanganan = s.pointAdjustments
        ? s.pointAdjustments.reduce(
            (sum, adj) =>
              sum +
              (typeof adj.pointPengurangan === "number"
                ? adj.pointPengurangan
                : 0),
            0
          )
        : 0;
      const totalScore = s.reports.reduce((sum, r) => {
        if (typeof r.pointSaat !== "number") return sum;
        return sum + r.pointSaat; // Point sudah benar di database
      }, 0);
      const totalAdjustment = s.pointAdjustments
        ? s.pointAdjustments.reduce(
            (sum, adj) =>
              sum -
              (typeof adj.pointPengurangan === "number"
                ? adj.pointPengurangan
                : 0),
            0
          )
        : 0;
      const totalScoreWithAdjustment = totalScore + totalPoinPenanganan;
      sheet.addRow({
        nisn: s.nisn,
        nama: s.user?.name,
        kelas: s.classroom?.kodeKelas,
        angkatan: s.angkatan?.tahun,
        totalScore: totalScoreWithAdjustment,
        status: s.isArchived ? "Arsip" : "Aktif",
        pelanggaran,
        totalPoinPelanggaran,
        prestasi,
        totalPoinPrestasi,
        jmlPenanganan,
        totalPoinPenanganan,
      });
    });

    // Pewarnaan header dan cell data setelah header benar-benar ada
    // Kolom: 6 = Jml Pelanggaran (merah), 7 = Poin Pelanggaran (merah)
    //        8 = Jml Prestasi (hijau), 9 = Poin Prestasi (hijau)
    //        10 = Jml Penanganan (biru), 11 = Poin Penanganan (biru)
    const headerRow = sheet.getRow(1);
    // Header coloring
    // Pelanggaran
    headerRow.getCell(6).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFC7CE" }, // light red
    };
    headerRow.getCell(7).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFC7CE" }, // light red
    };
    // Prestasi
    headerRow.getCell(8).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFC6EFCE" }, // light green
    };
    headerRow.getCell(9).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFC6EFCE" }, // light green
    };
    // Penanganan
    headerRow.getCell(10).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFCCE5FF" }, // light blue
    };
    headerRow.getCell(11).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFCCE5FF" }, // light blue
    };
    // Data coloring
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      // Pelanggaran
      row.getCell(6).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFC7CE" },
      };
      row.getCell(7).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFC7CE" },
      };
      // Prestasi
      row.getCell(8).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFC6EFCE" },
      };
      row.getCell(9).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFC6EFCE" },
      };
      // Penanganan
      row.getCell(10).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFCCE5FF" },
      };
      row.getCell(11).fill = {
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
      `attachment; filename=poin_siswa_export.xlsx`
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

module.exports = {
  exportLaporan,
  exportPoinSiswa,
  exportRekapLaporanSiswa,
  previewLaporan,
  previewPoinSiswa,
  getRekapOptions,
};
