const { PrismaClient } = require("@prisma/client");
const {
  validateActiveAcademicYear,
  getTargetAcademicYear,
  canCreateReports,
} = require("../../utils/academicYearUtils");
const { checkAndTriggerSuratPeringatan } = require("../bk/automasi.controller");
const prisma = new PrismaClient();

// Fungsi util: rekap totalScore siswa dari report dan pointAdjustment, hanya untuk tahun ajaran aktif
async function rekapTotalScoreStudent(studentId) {
  // Ambil tahun ajaran aktif siswa (dari student.classroom atau field lain jika ada)
  const student = await prisma.student.findUnique({
    where: { id: parseInt(studentId) },
    include: { classroom: true },
  });
  // Ambil tahun ajaran aktif
  const activeYear = await prisma.tahunAjaran.findFirst({
    where: { isActive: true },
  });
  if (!activeYear) throw new Error("Tidak ada tahun ajaran aktif");
  // Hitung total dari semua report APPROVED di tahun ajaran aktif
  const reports = await prisma.studentReport.findMany({
    where: {
      studentId: parseInt(studentId),
      tahunAjaranId: activeYear.id,
      status: "approved", // Only count approved reports
    },
    include: { item: { select: { tipe: true } } },
  });
  let totalReport = 0;
  for (const r of reports) {
    // Point sudah benar di database (negatif untuk pelanggaran, positif untuk prestasi)
    totalReport += r.pointSaat;
  }
  // Hitung total dari semua pointAdjustment di tahun ajaran aktif
  const adjustments = await prisma.pointAdjustment.findMany({
    where: {
      studentId: parseInt(studentId),
      tahunAjaranId: activeYear.id,
    },
  });
  let totalAdjustment = 0;
  for (const adj of adjustments) {
    totalAdjustment += adj.pointPengurangan;
  }
  // Set totalScore siswa
  const totalScore = totalReport + totalAdjustment;
  await prisma.student.update({
    where: { id: parseInt(studentId) },
    data: { totalScore },
  });
  return totalScore;
}

// ==================== NEW STUDENT REPORT FUNCTIONS ====================

// Get all student reports (violation + achievement) with filtering and pagination
const getAllStudentReports = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      studentId,
      classroomId,
      tipe, // pelanggaran atau prestasi
      startDate,
      endDate,
      kategoriId,
      jenis,
      tahunAjaranId, // Filter by academic year
      status, // pending, approved, rejected
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {};
    if (studentId) where.studentId = parseInt(studentId);

    // Filter by status - default approved unless explicitly specified
    // This ensures only validated reports are shown in general views
    if (status) {
      where.status = status;
    } else {
      // Default: only show approved reports
      where.status = "approved";
    }

    // Filter search by nama siswa atau nisn
    if (req.query.search) {
      const search = req.query.search;
      where.OR = [
        { student: { nisn: { contains: search, mode: "insensitive" } } },
        {
          student: {
            user: { name: { contains: search, mode: "insensitive" } },
          },
        },
      ];
    }

    // Tahun ajaran: jika 'all' atau tidak dikirim, ambil semua; jika tidak, filter aktif jika tidak ada param
    if (tahunAjaranId && tahunAjaranId !== "all") {
      where.tahunAjaranId = parseInt(tahunAjaranId);
    } else if (!tahunAjaranId) {
      // Default: tahun ajaran aktif
      const activeYear = await prisma.tahunAjaran.findFirst({
        where: { isActive: true },
      });
      if (!activeYear) {
        return res.status(400).json({
          error: "Tidak ada tahun ajaran aktif, data tidak dapat ditampilkan.",
          code: "NO_ACTIVE_YEAR",
          data: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            totalPages: 0,
          },
        });
      }
      where.tahunAjaranId = activeYear.id;
    }

    // Filter by student's classroom
    if (classroomId) {
      where.student = { classroomId: parseInt(classroomId) };
    }

    // Filter by report item type
    if (tipe) {
      where.item = { tipe };
    }

    // Filter by category
    if (kategoriId) {
      where.item = { ...where.item, kategoriId: parseInt(kategoriId) };
    }

    // Filter by jenis (subkategori)
    if (jenis) {
      where.item = { ...where.item, jenis };
    }

    if (startDate || endDate) {
      where.tanggal = {};
      if (startDate) where.tanggal.gte = new Date(startDate);
      if (endDate) where.tanggal.lte = new Date(endDate);
    }

    const [reports, total] = await Promise.all([
      prisma.studentReport.findMany({
        where,
        include: {
          student: {
            include: {
              user: { select: { name: true, email: true } },
              classroom: { select: { namaKelas: true, kodeKelas: true } },
              angkatan: { select: { tahun: true } },
            },
          },
          item: { include: { kategori: true } },
          reporter: { select: { name: true, role: true } },
          // HAPUS: bukti: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.studentReport.count({ where }),
    ]);

    const formattedReports = reports.map((r) => ({
      id: r.id,
      student: {
        id: r.student.id,
        nama: r.student.user.name,
        email: r.student.user.email,
        nisn: r.student.nisn,
        kelas: r.student.classroom?.namaKelas,
        kodeKelas: r.student.classroom?.kodeKelas,
        angkatan: r.student.angkatan?.tahun,
        totalScore: r.student.totalScore,
      },
      item: {
        id: r.item.id,
        nama: r.item.nama,
        tipe: r.item.tipe,
        kategori: r.item.kategori.nama,
        jenis: r.item.jenis,
        point: r.item.point,
      },
      // Flat properties for easier access
      siswa: r.student.user.name,
      nisn: r.student.nisn,
      kelas: r.student.classroom?.namaKelas,
      namaItem: r.item.nama,
      tipe: r.item.tipe,
      point: r.item.point,
      tanggal: r.tanggal,
      waktu: r.waktu,
      deskripsi: r.deskripsi,
      bukti: r.bukti,
      pointSaat: r.pointSaat,
      reporter: r.reporter.name,
      reporterRole: r.reporter.role,
      status: r.status,
      validatedBy: r.validatedBy,
      validatedAt: r.validatedAt,
      rejectionNote: r.rejectionNote,
      createdAt: r.createdAt,
    }));

    res.json({
      data: formattedReports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Error getting student reports:", err);
    res.status(500).json({ error: "Gagal mengambil data laporan siswa" });
  }
};

// Get student report by ID
const getStudentReportById = async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await prisma.studentReport.findUnique({
      where: { id: parseInt(reportId) },
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } },
            classroom: { select: { namaKelas: true, kodeKelas: true } },
            angkatan: { select: { tahun: true } },
          },
        },
        item: {
          include: {
            kategori: true,
          },
        },
        reporter: { select: { name: true, role: true } },
      },
    });

    if (!report) {
      return res.status(404).json({ error: "Laporan siswa tidak ditemukan" });
    }

    const formattedReport = {
      id: report.id,
      student: {
        id: report.student.id,
        nama: report.student.user.name,
        email: report.student.user.email,
        nisn: report.student.nisn,
        kelas: report.student.classroom?.namaKelas,
        kodeKelas: report.student.classroom?.kodeKelas,
        angkatan: report.student.angkatan?.tahun,
        totalScore: report.student.totalScore,
      },
      item: {
        id: report.item.id,
        nama: report.item.nama,
        tipe: report.item.tipe,
        kategori: report.item.kategori.nama,
        jenis: report.item.jenis,
        point: report.item.point,
      },
      tanggal: report.tanggal,
      waktu: report.waktu,
      deskripsi: report.deskripsi,
      bukti: report.bukti,
      pointSaat: report.pointSaat,
      reporter: report.reporter.name,
      reporterRole: report.reporter.role,
      createdAt: report.createdAt,
    };

    res.json({
      success: true,
      data: formattedReport,
    });
  } catch (err) {
    console.error("Error getting student report:", err);
    res.status(500).json({ error: "Gagal mengambil detail laporan siswa" });
  }
};

// Create student report (violation or achievement)
const createStudentReport = async (req, res) => {
  const reporterId = req.user.id;

  try {
    const file = req.file;
    let buktiPath = null;
    const { studentId, itemId, tanggal, waktu, deskripsi, point } = req.body;
    // Penamaan file bukti agar mudah dikenali
    if (file) {
      // Ambil data siswa untuk penamaan file
      const student = await prisma.student.findUnique({
        where: { id: parseInt(studentId) },
        select: { nisn: true },
      });
      const ext = file.originalname.split(".").pop();
      const dateStr = tanggal ? tanggal.replace(/-/g, "") : "";
      const timestamp = Date.now();
      const nisn = student?.nisn || "unknown";
      const newFileName = `bukti_${nisn}_${dateStr}_${timestamp}.${ext}`;
      // Rename file di filesystem jika perlu
      const fs = require("fs");
      const path = require("path");
      const oldPath = path.join(
        __dirname,
        "../../uploads/bukti/",
        file.filename
      );
      const newPath = path.join(__dirname, "../../uploads/bukti/", newFileName);
      try {
        fs.renameSync(oldPath, newPath);
        buktiPath = `/uploads/bukti/${newFileName}`;
      } catch (e) {
        // Jika gagal rename, fallback ke nama lama
        buktiPath = `/uploads/bukti/${file.filename}`;
      }
    }

    // Validate active academic year for creating new reports
    let activeYear;
    try {
      activeYear = await validateActiveAcademicYear();
    } catch (error) {
      if (error.code === "ACADEMIC_YEAR_REQUIRED") {
        return res.status(400).json({
          error: "Belum ada tahun ajaran Aktif",
          message:
            "Tidak dapat membuat laporan baru. Silakan hubungi administrator untuk mengatur tahun ajaran aktif.",
        });
      }
      throw error;
    }

    // Validate input
    if (!itemId) {
      return res.status(400).json({
        error: "itemId wajib diisi",
      });
    }

    // Validate student exists
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
      include: { user: true, classroom: true },
    });

    if (!student) {
      return res.status(404).json({ error: "Siswa tidak ditemukan" });
    }

    // Check if student is archived (graduated)
    if (student.isArchived) {
      return res.status(400).json({
        error: "Tidak dapat membuat laporan untuk siswa yang sudah lulus",
        message: "Siswa ini sudah lulus dan tidak dapat dilaporkan lagi",
      });
    }

    // Validate ReportItem exists and is active
    const reportItem = await prisma.reportItem.findUnique({
      where: { id: parseInt(itemId) },
      include: { kategori: true },
    });

    if (!reportItem) {
      return res.status(404).json({ error: "Item laporan tidak ditemukan" });
    }

    if (!reportItem.isActive) {
      return res.status(400).json({ error: "Item laporan sudah tidak aktif" });
    }

    reportItem.point;

    // Validate and parse waktu
    let parsedWaktu = null;
    if (waktu) {
      // If waktu is just time (HH:MM), combine with tanggal
      if (waktu.includes(":") && !waktu.includes("T")) {
        parsedWaktu = new Date(`${tanggal}T${waktu}:00.000Z`);
      } else {
        parsedWaktu = new Date(waktu);
      }

      // Check if the date is valid
      if (isNaN(parsedWaktu.getTime())) {
        parsedWaktu = null;
      }
    }

    // Determine status based on reporter role
    // BK and Superadmin reports are auto-approved
    // Guru reports need validation
    const userRole = req.user.role;
    const initialStatus = userRole === "guru" ? "pending" : "approved";
    const needsValidation = userRole === "guru";

    // Create student report record
    const studentReport = await prisma.studentReport.create({
      data: {
        studentId: parseInt(studentId),
        reporterId,
        itemId: parseInt(itemId),
        tahunAjaranId: activeYear.id,
        tanggal: new Date(tanggal),
        waktu: parsedWaktu,
        deskripsi,
        pointSaat: reportItem.point,
        classAtTime: student.classroom ? student.classroom.namaKelas : "-",
        bukti: buktiPath,
        status: initialStatus,
        validatedBy: initialStatus === "approved" ? reporterId : null,
        validatedAt: initialStatus === "approved" ? new Date() : null,
      },
      include: {
        student: { include: { user: true, classroom: true } },
        item: { include: { kategori: true } },
        reporter: { select: { name: true, role: true } },
      },
    });

    // Only update score if auto-approved (BK/Superadmin)
    let newTotalScore = student.totalScore;
    let oldTotalScore = student.totalScore;

    if (!needsValidation) {
      // Get old total score before recalculation
      oldTotalScore = student.totalScore;
      // Update student total score (rekap ulang)
      newTotalScore = await rekapTotalScoreStudent(studentId);

      // Trigger automasi surat peringatan jika ini adalah pelanggaran
      if (reportItem.tipe === "pelanggaran") {
        await checkAndTriggerSuratPeringatan(
          studentId,
          newTotalScore,
          oldTotalScore
        );
      }

      // Create notification for student ONLY if auto-approved (BK/Superadmin)
      // For guru reports, notification will be sent when BK approves
      const notificationTitle =
        reportItem.tipe === "pelanggaran"
          ? "Pelanggaran Baru"
          : "Prestasi Baru";
      const notificationMessage =
        reportItem.tipe === "pelanggaran"
          ? `Anda telah melakukan pelanggaran: ${reportItem.nama}. Poin: -${reportItem.point}`
          : `Selamat! Anda meraih prestasi: ${reportItem.nama}. Poin: +${reportItem.point}`;

      await prisma.notification.create({
        data: {
          studentId: parseInt(studentId),
          judul: notificationTitle,
          pesan: notificationMessage,
          isRead: false,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: needsValidation
        ? `Laporan ${
            reportItem.tipe === "pelanggaran" ? "pelanggaran" : "prestasi"
          } berhasil dibuat dan menunggu validasi BK`
        : `Laporan ${
            reportItem.tipe === "pelanggaran" ? "pelanggaran" : "prestasi"
          } berhasil dibuat`,
      data: {
        id: studentReport.id,
        status: studentReport.status,
        needsValidation,
        student: {
          nama: studentReport.student.user.name,
          nisn: studentReport.student.nisn,
          kelas: studentReport.student.classroom?.namaKelas,
        },
        item: {
          nama: reportItem.nama,
          tipe: reportItem.tipe,
          kategori: reportItem.kategori.nama,
          point: reportItem.point,
        },
        tanggal: studentReport.tanggal,
        reporter: studentReport.reporter.name,
        bukti: studentReport.bukti, // path file
      },
    });
  } catch (err) {
    console.error("Error creating student report:", err);
    res.status(500).json({ error: "Gagal membuat laporan siswa" });
  }
};

// Update student report
const updateStudentReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { studentId, itemId, tanggal, waktu, deskripsi, pointSaat } =
      req.body;
    const file = req.file;
    // Check if report exists
    const existingReport = await prisma.studentReport.findUnique({
      where: { id: parseInt(reportId) },
      include: {
        student: true,
        item: { include: { kategori: true } },
      },
    });
    if (!existingReport) {
      return res.status(404).json({ error: "Laporan tidak ditemukan" });
    }
    let newReportItem = existingReport.item;
    let finalPointSaat = pointSaat;
    // If itemId changed, validate new ReportItem
    if (itemId && parseInt(itemId) !== existingReport.itemId) {
      newReportItem = await prisma.reportItem.findUnique({
        where: { id: parseInt(itemId) },
        include: { kategori: true },
      });
      if (!newReportItem) {
        return res
          .status(404)
          .json({ error: "Item laporan baru tidak ditemukan" });
      }
      if (!newReportItem.isActive) {
        return res
          .status(400)
          .json({ error: "Item laporan baru sudah tidak aktif" });
      }
    }
    finalPointSaat = pointSaat || newReportItem.point;
    const oldPoints = existingReport.pointSaat;
    const pointDifference = finalPointSaat - oldPoints;
    // Validate and parse waktu for update
    let parsedWaktu = undefined;
    if (waktu !== undefined) {
      if (waktu) {
        if (waktu.includes(":") && !waktu.includes("T")) {
          const dateToUse =
            tanggal || existingReport.tanggal.toISOString().split("T")[0];
          parsedWaktu = new Date(`${dateToUse}T${waktu}:00.000Z`);
        } else {
          parsedWaktu = new Date(waktu);
        }
        if (isNaN(parsedWaktu.getTime())) {
          parsedWaktu = null;
        }
      } else {
        parsedWaktu = null;
      }
    }
    // Penamaan file bukti jika ada file baru
    let buktiPath = undefined;
    if (file) {
      const student = await prisma.student.findUnique({
        where: {
          id: studentId ? parseInt(studentId) : existingReport.studentId,
        },
        select: { nisn: true },
      });
      const ext = file.originalname.split(".").pop();
      const dateStr = (
        tanggal
          ? tanggal
          : existingReport.tanggal
          ? existingReport.tanggal.toISOString().split("T")[0]
          : ""
      ).replace(/-/g, "");
      const timestamp = Date.now();
      const nisn = student?.nisn || "unknown";
      const newFileName = `bukti_${nisn}_${dateStr}_${timestamp}.${ext}`;
      const fs = require("fs");
      const path = require("path");
      const oldPath = path.join(
        __dirname,
        "../../uploads/bukti/",
        file.filename
      );
      const newPath = path.join(__dirname, "../../uploads/bukti/", newFileName);
      try {
        fs.renameSync(oldPath, newPath);
        buktiPath = `/uploads/bukti/${newFileName}`;
      } catch (e) {
        buktiPath = `/uploads/bukti/${file.filename}`;
      }
    }
    // Update report record
    const updatedReport = await prisma.studentReport.update({
      where: { id: parseInt(reportId) },
      data: {
        studentId: studentId ? parseInt(studentId) : undefined,
        itemId: itemId ? parseInt(itemId) : undefined,
        tanggal: tanggal ? new Date(tanggal) : undefined,
        waktu: parsedWaktu,
        deskripsi,
        pointSaat: finalPointSaat,
        ...(buktiPath ? { bukti: buktiPath } : {}),
      },
      include: {
        student: { include: { user: true, classroom: true } },
        item: { include: { kategori: true } },
        reporter: { select: { name: true, role: true } },
      },
    });
    // Update student total score (rekap ulang)
    await rekapTotalScoreStudent(existingReport.studentId);
    res.json({
      success: true,
      message: "Laporan berhasil diperbarui",
      data: updatedReport,
    });
  } catch (err) {
    console.error("Error updating student report:", err);
    res.status(500).json({ error: "Gagal memperbarui laporan" });
  }
};

// Delete student report
const deleteStudentReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const existingReport = await prisma.studentReport.findUnique({
      where: { id: parseInt(reportId) },
      include: {
        student: true,
        item: { include: { kategori: true } },
      },
    });
    if (!existingReport) {
      return res.status(404).json({ error: "Laporan tidak ditemukan" });
    }
    // Hapus file bukti jika ada
    if (existingReport.bukti) {
      const fs = require("fs");
      const path = require("path");
      // Hilangkan leading slash jika ada, lalu join ke root project (bukan src)
      let relativePath = existingReport.bukti.startsWith("/")
        ? existingReport.bukti.slice(1)
        : existingReport.bukti;
      const buktiPath = path.join(process.cwd(), relativePath);
      try {
        if (fs.existsSync(buktiPath)) {
          fs.unlinkSync(buktiPath);
        }
      } catch (e) {
        // Log error, tapi lanjutkan proses hapus report
        console.error("Gagal menghapus file bukti:", e);
      }
    }
    // Setelah hapus report, rekap ulang totalScore siswa
    // Delete the report record
    await prisma.studentReport.delete({
      where: { id: parseInt(reportId) },
    });
    // Rekap totalScore setelah delete
    await rekapTotalScoreStudent(existingReport.studentId);
    res.json({
      success: true,
      message: "Laporan berhasil dihapus",
    });
  } catch (err) {
    console.error("Error deleting student report:", err);
    res.status(500).json({ error: "Gagal menghapus laporan" });
  }
};

// Recalculate all student total scores based on actual reports
const recalculateAllTotalScores = async (req, res) => {
  try {
    // Get all students
    const students = await prisma.student.findMany({
      include: {
        user: { select: { name: true } },
      },
    });

    let updatedCount = 0;
    const results = [];

    for (const student of students) {
      // Calculate actual total score from reports
      const reports = await prisma.studentReport.findMany({
        where: {
          studentId: student.id,
        },
        include: {
          item: true,
        },
      });

      // Calculate correct total score
      let correctTotalScore = 0;

      reports.forEach((report) => {
        // Point sudah benar di database (negatif untuk pelanggaran, positif untuk prestasi)
        correctTotalScore += report.pointSaat;
      });

      const currentTotalScore = student.totalScore;

      if (correctTotalScore !== currentTotalScore) {
        // Update student total score
        await prisma.student.update({
          where: { id: student.id },
          data: { totalScore: correctTotalScore },
        });

        updatedCount++;
        results.push({
          studentId: student.id,
          studentName: student.user.name,
          oldScore: currentTotalScore,
          newScore: correctTotalScore,
          difference: correctTotalScore - currentTotalScore,
          totalReports: reports.length,
        });
      }
    }

    res.json({
      message: "Total score recalculation completed",
      totalStudents: students.length,
      updatedStudents: updatedCount,
      results: results,
    });
  } catch (err) {
    console.error("Error recalculating total scores:", err);
    res.status(500).json({ error: "Gagal melakukan recalculation" });
  }
};

// Validate report (approve/reject) - Only BK
const validateReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { action, rejectionNote } = req.body; // action: "approve" or "reject"
    const validatorId = req.user.id;

    if (!action || !["approve", "reject"].includes(action)) {
      return res.status(400).json({
        error: "Action harus 'approve' atau 'reject'",
      });
    }

    if (action === "reject" && !rejectionNote) {
      return res.status(400).json({
        error: "Catatan penolakan wajib diisi saat menolak laporan",
      });
    }

    // Get report with full details
    const report = await prisma.studentReport.findUnique({
      where: { id: parseInt(reportId) },
      include: {
        student: {
          include: {
            user: true,
            classroom: true,
          },
        },
        item: {
          include: {
            kategori: true,
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

    if (!report) {
      return res.status(404).json({ error: "Laporan tidak ditemukan" });
    }

    if (report.status !== "pending") {
      return res.status(400).json({
        error: `Laporan sudah ${report.status}`,
        message: "Hanya laporan dengan status pending yang bisa divalidasi",
      });
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    // Update report status
    const updatedReport = await prisma.studentReport.update({
      where: { id: parseInt(reportId) },
      data: {
        status: newStatus,
        validatedBy: validatorId,
        validatedAt: new Date(),
        rejectionNote: action === "reject" ? rejectionNote : null,
      },
      include: {
        student: {
          include: {
            user: true,
            classroom: true,
          },
        },
        item: {
          include: {
            kategori: true,
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

    // If approved, update student score and send notification
    if (action === "approve") {
      // Get old total score before recalculation
      const oldTotalScore = report.student.totalScore;

      // Update student total score (rekap ulang)
      const newTotalScore = await rekapTotalScoreStudent(report.studentId);

      // Trigger automasi surat peringatan jika ini adalah pelanggaran
      if (report.item.tipe === "pelanggaran") {
        await checkAndTriggerSuratPeringatan(
          report.studentId,
          newTotalScore,
          oldTotalScore
        );
      }

      // Create notification for student
      const notificationTitle =
        report.item.tipe === "pelanggaran"
          ? "Laporan Pelanggaran Disetujui"
          : "Laporan Prestasi Disetujui";
      const notificationMessage =
        report.item.tipe === "pelanggaran"
          ? `Laporan pelanggaran Anda telah disetujui: ${report.item.nama}. Poin: -${report.item.point}`
          : `Selamat! Laporan prestasi Anda telah disetujui: ${report.item.nama}. Poin: +${report.item.point}`;

      await prisma.notification.create({
        data: {
          studentId: report.studentId,
          judul: notificationTitle,
          pesan: notificationMessage,
          isRead: false,
        },
      });
    } else {
      // If rejected, no notification for student (report rejected)
      // Only guru can see the rejection in their report list
    }

    res.json({
      success: true,
      message:
        action === "approve"
          ? "Laporan berhasil disetujui"
          : "Laporan berhasil ditolak",
      data: {
        id: updatedReport.id,
        status: updatedReport.status,
        validatedAt: updatedReport.validatedAt,
        rejectionNote: updatedReport.rejectionNote,
        student: {
          nama: updatedReport.student.user.name,
          nisn: updatedReport.student.nisn,
          kelas: updatedReport.student.classroom?.namaKelas,
        },
        item: {
          nama: updatedReport.item.nama,
          tipe: updatedReport.item.tipe,
          point: updatedReport.item.point,
        },
      },
    });
  } catch (err) {
    console.error("Error validating report:", err);
    res.status(500).json({ error: "Gagal memvalidasi laporan" });
  }
};

module.exports = {
  // New Student Report Functions (Combined)
  getAllStudentReports,
  getStudentReportById,
  createStudentReport,
  updateStudentReport,
  deleteStudentReport,

  // Validation Functions
  validateReport,

  // Utility Functions
  recalculateAllTotalScores,
  rekapTotalScoreStudent,
};
