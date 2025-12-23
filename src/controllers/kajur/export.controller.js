const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ExcelJS = require("exceljs");

// Get jurusan info for kajur
const getJurusanInfo = async (req, res) => {
  try {
    const userId = req.user.id;

    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: {
        jurusan: true,
      },
    });

    if (!teacher || !teacher.jurusan) {
      return res.status(404).json({
        success: false,
        error: "Anda tidak memiliki akses sebagai Kepala Jurusan",
      });
    }

    res.json({
      success: true,
      data: {
        id: teacher.jurusan.id,
        kodeJurusan: teacher.jurusan.kodeJurusan,
        namaJurusan: teacher.jurusan.namaJurusan,
      },
    });
  } catch (err) {
    console.error("Get jurusan info error:", err);
    res
      .status(500)
      .json({ success: false, error: "Gagal mengambil info jurusan" });
  }
};

// Preview laporan untuk jurusan yang diampu kajur
const previewLaporanKajur = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bulan, tahunAjaranId, tipe, kelasId } = req.query;

    // Cari guru dan jurusan yang diampu
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: { jurusan: true },
    });

    if (!teacher || !teacher.jurusan) {
      return res.status(404).json({
        success: false,
        error: "Anda tidak memiliki akses sebagai Kepala Jurusan",
      });
    }

    const jurusanId = teacher.jurusan.id;

    // Setup filter
    let where = {
      student: { classroom: { jurusanId } },
    };

    if (tahunAjaranId) where.tahunAjaranId = parseInt(tahunAjaranId);
    if (tipe && tipe !== "all") where["item"] = { tipe };
    if (kelasId)
      where.student = { ...where.student, classroomId: parseInt(kelasId) };
    if (bulan) {
      const bulanInt = parseInt(bulan);
      const tahunSekarang = new Date().getFullYear();
      const nextMonth = bulanInt === 12 ? 1 : bulanInt + 1;
      const nextYear = bulanInt === 12 ? tahunSekarang + 1 : tahunSekarang;

      where.tanggal = {
        gte: new Date(tahunSekarang, bulanInt - 1, 1),
        lt: new Date(nextYear, nextMonth - 1, 1),
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
      id: r.id,
      nisn: r.student?.nisn,
      namaSiswa: r.student?.user?.name,
      kelas: r.student?.classroom?.kodeKelas || r.classAtTime,
      namaKelas: r.student?.classroom?.namaKelas,
      tanggal: r.tanggal.toISOString().slice(0, 10),
      tipe: r.item?.tipe,
      kategori: r.item?.kategori?.nama,
      item: r.item?.nama,
      poin: r.pointSaat,
      deskripsi: r.deskripsi,
      pelapor: r.reporter?.name,
      tahunAjaran: r.tahunAjaran?.tahunAjaran,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error("Preview laporan Kajur error:", err);
    res.status(500).json({ success: false, error: "Gagal preview laporan" });
  }
};

// Export laporan untuk jurusan yang diampu kajur
const exportLaporanKajur = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bulan, tahunAjaranId, tipe, kelasId } = req.query;

    // Cari guru dan jurusan yang diampu
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: { jurusan: true },
    });

    if (!teacher || !teacher.jurusan) {
      return res.status(404).json({
        success: false,
        error: "Anda tidak memiliki akses sebagai Kepala Jurusan",
      });
    }

    const jurusanId = teacher.jurusan.id;
    const namaJurusan = teacher.jurusan.namaJurusan;

    // Setup filter
    let where = {
      student: { classroom: { jurusanId } },
    };

    if (tahunAjaranId) where.tahunAjaranId = parseInt(tahunAjaranId);
    if (tipe && tipe !== "all") where["item"] = { tipe };
    if (kelasId)
      where.student = { ...where.student, classroomId: parseInt(kelasId) };
    if (bulan) {
      const bulanInt = parseInt(bulan);
      const tahunSekarang = new Date().getFullYear();
      const nextMonth = bulanInt === 12 ? 1 : bulanInt + 1;
      const nextYear = bulanInt === 12 ? tahunSekarang + 1 : tahunSekarang;

      where.tanggal = {
        gte: new Date(tahunSekarang, bulanInt - 1, 1),
        lt: new Date(nextYear, nextMonth - 1, 1),
      };
    }

    // Labels untuk filter
    let tipeLabel =
      tipe === "all" || !tipe
        ? "Semua"
        : tipe.charAt(0).toUpperCase() + tipe.slice(1);
    let bulanLabel = bulan ? getNamaBulan(parseInt(bulan)) : "Semua Bulan";
    let tahunAjaranLabel = "Semua Tahun Ajaran";
    let kelasLabel = "Semua Kelas";

    if (tahunAjaranId) {
      const tahunObj = await prisma.tahunAjaran.findUnique({
        where: { id: parseInt(tahunAjaranId) },
      });
      if (tahunObj) tahunAjaranLabel = tahunObj.tahunAjaran;
    }

    if (kelasId) {
      const kelasObj = await prisma.classroom.findUnique({
        where: { id: parseInt(kelasId) },
      });
      if (kelasObj) kelasLabel = kelasObj.kodeKelas;
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
      orderBy: { tanggal: "desc" },
    });

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Laporan Siswa");

    // Title and filter info
    worksheet.mergeCells("A1:J1");
    worksheet.getCell(
      "A1"
    ).value = `LAPORAN SISWA JURUSAN ${namaJurusan.toUpperCase()}`;
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

    // Send file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=laporan_${namaJurusan}_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Export laporan Kajur error:", err);
    res.status(500).json({ success: false, error: "Gagal export laporan" });
  }
};

// Preview poin siswa untuk jurusan yang diampu kajur
const previewPoinSiswaKajur = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bulan, tahunAjaranId, kelasId } = req.query;

    // Cari guru dan jurusan yang diampu
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: { jurusan: true },
    });

    if (!teacher || !teacher.jurusan) {
      return res.status(404).json({
        success: false,
        error: "Anda tidak memiliki akses sebagai Kepala Jurusan",
      });
    }

    const jurusanId = teacher.jurusan.id;

    // Setup filter untuk siswa
    let whereStudent = {
      isArchived: false,
      classroom: { jurusanId },
    };

    if (kelasId) whereStudent.classroomId = parseInt(kelasId);

    const students = await prisma.student.findMany({
      where: whereStudent,
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
          const bulanInt = parseInt(bulan);
          const tahunSekarang = new Date().getFullYear();
          const nextMonth = bulanInt === 12 ? 1 : bulanInt + 1;
          const nextYear = bulanInt === 12 ? tahunSekarang + 1 : tahunSekarang;
          const gte = new Date(tahunSekarang, bulanInt - 1, 1);
          const lt = new Date(nextYear, nextMonth - 1, 1);

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
          const bulanInt = parseInt(bulan);
          const tahunSekarang = new Date().getFullYear();
          const nextMonth = bulanInt === 12 ? 1 : bulanInt + 1;
          const nextYear = bulanInt === 12 ? tahunSekarang + 1 : tahunSekarang;
          const gte = new Date(tahunSekarang, bulanInt - 1, 1);
          const lt = new Date(nextYear, nextMonth - 1, 1);

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
        id: s.id,
        nisn: s.nisn,
        name: s.user?.name,
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
        poinPelanggaran: totalPoinPelanggaran, // alias untuk kompatibilitas frontend
        poinPrestasi: totalPoinPrestasi, // alias untuk kompatibilitas frontend
        totalPoin: totalScoreWithAdjustment, // alias untuk kompatibilitas frontend
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error("Preview poin siswa Kajur error:", err);
    res.status(500).json({ success: false, error: "Gagal preview poin siswa" });
  }
};

// Export poin siswa untuk jurusan yang diampu kajur
const exportPoinSiswaKajur = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bulan, tahunAjaranId, kelasId } = req.query;

    // Cari guru dan jurusan yang diampu
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: { jurusan: true },
    });

    if (!teacher || !teacher.jurusan) {
      return res.status(404).json({
        success: false,
        error: "Anda tidak memiliki akses sebagai Kepala Jurusan",
      });
    }

    const jurusanId = teacher.jurusan.id;
    const namaJurusan = teacher.jurusan.namaJurusan;

    // Setup filter untuk siswa
    let whereStudent = {
      isArchived: false,
      classroom: { jurusanId },
    };

    if (kelasId) whereStudent.classroomId = parseInt(kelasId);

    const students = await prisma.student.findMany({
      where: whereStudent,
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

    // Setup filter untuk laporan
    let whereReport = {
      student: { classroom: { jurusanId } },
    };

    if (tahunAjaranId) whereReport.tahunAjaranId = parseInt(tahunAjaranId);
    if (kelasId)
      whereReport.student = {
        ...whereReport.student,
        classroomId: parseInt(kelasId),
      };
    if (bulan) {
      const bulanInt = parseInt(bulan);
      const tahunSekarang = new Date().getFullYear();
      const nextMonth = bulanInt === 12 ? 1 : bulanInt + 1;
      const nextYear = bulanInt === 12 ? tahunSekarang + 1 : tahunSekarang;

      whereReport.tanggal = {
        gte: new Date(tahunSekarang, bulanInt - 1, 1),
        lt: new Date(nextYear, nextMonth - 1, 1),
      };
    }

    // Only show approved reports
    whereReport.status = "approved";

    const reports = await prisma.studentReport.findMany({
      where: whereReport,
      include: {
        item: { select: { tipe: true } },
      },
    });

    // Labels untuk filter
    let bulanLabel = bulan ? getNamaBulan(parseInt(bulan)) : "Semua Bulan";
    let tahunAjaranLabel = "Semua Tahun Ajaran";
    let kelasLabel = "Semua Kelas";

    if (tahunAjaranId) {
      const tahunObj = await prisma.tahunAjaran.findUnique({
        where: { id: parseInt(tahunAjaranId) },
      });
      if (tahunObj) tahunAjaranLabel = tahunObj.tahunAjaran;
    }

    if (kelasId) {
      const kelasObj = await prisma.classroom.findUnique({
        where: { id: parseInt(kelasId) },
      });
      if (kelasObj) kelasLabel = kelasObj.kodeKelas;
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Poin Siswa");

    // Title and filter info
    worksheet.mergeCells("A1:J1");
    worksheet.getCell(
      "A1"
    ).value = `REKAP POIN SISWA JURUSAN ${namaJurusan.toUpperCase()}`;
    worksheet.getCell("A1").font = { bold: true, size: 14 };
    worksheet.getCell("A1").alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    worksheet.mergeCells("A2:J2");
    worksheet.getCell(
      "A2"
    ).value = `Filter: Bulan ${bulanLabel}, Tahun Ajaran ${tahunAjaranLabel}, Kelas ${kelasLabel}`;
    worksheet.getCell("A2").font = { size: 11 };
    worksheet.getCell("A2").alignment = { horizontal: "center" };

    // Headers
    worksheet.addRow([]);
    const headerRow = worksheet.addRow([
      "No",
      "NISN",
      "Nama Siswa",
      "Kelas",
      "Pelanggaran",
      "Prestasi",
      "Penanganan",
      "Poin Pelanggaran",
      "Poin Prestasi",
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
      } else if (colNum === 7) {
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

    // Data rows
    students.forEach((s, idx) => {
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
          const bulanInt = parseInt(bulan);
          const tahunSekarang = new Date().getFullYear();
          const nextMonth = bulanInt === 12 ? 1 : bulanInt + 1;
          const nextYear = bulanInt === 12 ? tahunSekarang + 1 : tahunSekarang;
          const gte = new Date(tahunSekarang, bulanInt - 1, 1);
          const lt = new Date(nextYear, nextMonth - 1, 1);

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
          const bulanInt = parseInt(bulan);
          const tahunSekarang = new Date().getFullYear();
          const nextMonth = bulanInt === 12 ? 1 : bulanInt + 1;
          const nextYear = bulanInt === 12 ? tahunSekarang + 1 : tahunSekarang;
          const gte = new Date(tahunSekarang, bulanInt - 1, 1);
          const lt = new Date(nextYear, nextMonth - 1, 1);

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
        idx + 1,
        s.nisn,
        s.user?.name,
        s.classroom?.kodeKelas,
        pelanggaran,
        prestasi,
        jmlPenanganan,
        totalPoinPelanggaran,
        totalPoinPrestasi,
        totalScoreWithAdjustment,
      ]);

      row.eachCell((cell, colNum) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        if (colNum === 1 || colNum >= 5) {
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
    });

    // Column widths
    worksheet.columns = [
      { width: 5 },
      { width: 12 },
      { width: 25 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 18 },
      { width: 15 },
      { width: 12 },
    ];

    // Send file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=poin_siswa_${namaJurusan}_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Export poin siswa Kajur error:", err);
    res.status(500).json({ success: false, error: "Gagal export poin siswa" });
  }
};

// Helper function
function getNamaBulan(bulan) {
  const namaBulan = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  return namaBulan[bulan - 1] || "Tidak Valid";
}

module.exports = {
  getJurusanInfo,
  previewLaporanKajur,
  exportLaporanKajur,
  previewPoinSiswaKajur,
  exportPoinSiswaKajur,
};
