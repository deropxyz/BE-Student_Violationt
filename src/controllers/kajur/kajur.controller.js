const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get all classes for kajur's jurusan
const getKajurClasses = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0, search = "" } = req.query;

    // Find teacher and their jurusan
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: {
        jurusan: true,
      },
    });

    if (!teacher || !teacher.jurusan) {
      return res.status(403).json({
        error: "Anda tidak memiliki akses sebagai Kepala Jurusan",
      });
    }

    // Build where clause
    const whereClause = {
      jurusanId: teacher.jurusan.id,
    };

    // Add search filter
    if (search) {
      whereClause.OR = [
        {
          namaKelas: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          kodeKelas: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    // Get total count
    const total = await prisma.classroom.count({
      where: whereClause,
    });

    // Get all classes in the jurusan with pagination
    const classes = await prisma.classroom.findMany({
      where: whereClause,
      include: {
        waliKelas: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
        _count: {
          select: { students: true },
        },
      },
      orderBy: {
        namaKelas: "asc",
      },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const formattedClasses = classes.map((kelas) => ({
      id: kelas.id,
      namaKelas: kelas.namaKelas,
      kodeKelas: kelas.kodeKelas,
      waliKelas: kelas.waliKelas,
      _count: {
        students: kelas._count.students,
      },
    }));

    res.json({
      classes: formattedClasses,
      total,
      jurusan: {
        id: teacher.jurusan.id,
        kodeJurusan: teacher.jurusan.kodeJurusan,
        nama: teacher.jurusan.namaJurusan,
      },
    });
  } catch (error) {
    console.error("Error getting kajur classes:", error);
    res.status(500).json({ error: "Gagal mengambil data kelas" });
  }
};

// Get students in a class
const getClassStudents = async (req, res) => {
  try {
    const userId = req.user.id;
    const classId = parseInt(req.params.classId);
    const { limit = 20, offset = 0, search = "" } = req.query;

    // Verify kajur has access to this class
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: { jurusan: true },
    });

    if (!teacher || !teacher.jurusan) {
      return res.status(403).json({
        error: "Anda tidak memiliki akses sebagai Kepala Jurusan",
      });
    }

    // Verify class belongs to kajur's jurusan
    const classroom = await prisma.classroom.findFirst({
      where: {
        id: classId,
        jurusanId: teacher.jurusan.id,
      },
      include: {
        waliKelas: {
          include: {
            user: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!classroom) {
      return res.status(403).json({
        error: "Kelas tidak ditemukan atau bukan bagian dari jurusan Anda",
      });
    }

    // Build where clause
    const whereClause = {
      classroomId: classId,
      isArchived: false,
    };

    // Add search filter
    if (search) {
      whereClause.OR = [
        {
          nisn: {
            contains: search,
          },
        },
        {
          user: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    // Get total count
    const total = await prisma.student.count({
      where: whereClause,
    });

    // Get students
    const students = await prisma.student.findMany({
      where: whereClause,
      include: {
        user: {
          select: { name: true, email: true },
        },
        angkatan: {
          select: { tahun: true },
        },
      },
      orderBy: {
        user: { name: "asc" },
      },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    res.json({
      students,
      total,
      classroom,
    });
  } catch (error) {
    console.error("Error getting class students:", error);
    res.status(500).json({ error: "Gagal mengambil data siswa" });
  }
};

// Get student detail
const getStudentDetail = async (req, res) => {
  try {
    const userId = req.user.id;
    const studentNisn = req.params.studentId; // This is actually NISN from frontend

    // Verify kajur has access
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: { jurusan: true },
    });

    if (!teacher || !teacher.jurusan) {
      return res.status(403).json({
        error: "Anda tidak memiliki akses sebagai Kepala Jurusan",
      });
    }

    // Get student and verify they're in kajur's jurusan
    const student = await prisma.student.findFirst({
      where: {
        nisn: studentNisn,
        classroom: {
          jurusanId: teacher.jurusan.id,
        },
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
        classroom: {
          include: {
            waliKelas: {
              include: {
                user: {
                  select: { name: true },
                },
              },
            },
          },
        },
        angkatan: true,
      },
    });

    if (!student) {
      return res.status(404).json({
        error: "Siswa tidak ditemukan atau bukan bagian dari jurusan Anda",
      });
    }

    res.json({ student });
  } catch (error) {
    console.error("Error getting student detail:", error);
    res.status(500).json({ error: "Gagal mengambil detail siswa" });
  }
};

// Get student reports
const getStudentReports = async (req, res) => {
  try {
    const userId = req.user.id;
    const studentNisn = req.params.studentId; // This is actually NISN from frontend
    const { tahunAjaranId } = req.query;

    // Verify kajur has access
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: { jurusan: true },
    });

    if (!teacher || !teacher.jurusan) {
      return res.status(403).json({
        error: "Anda tidak memiliki akses sebagai Kepala Jurusan",
      });
    }

    // Verify student is in kajur's jurusan and get student ID
    const student = await prisma.student.findFirst({
      where: {
        nisn: studentNisn,
        classroom: {
          jurusanId: teacher.jurusan.id,
        },
      },
    });

    if (!student) {
      return res.status(403).json({
        error: "Siswa tidak ditemukan atau bukan bagian dari jurusan Anda",
      });
    }

    // Build where clause for reports
    const whereClause = {
      studentId: student.id,
      status: "approved", // Only show approved reports
    };

    // Add tahun ajaran filter if provided
    if (tahunAjaranId) {
      whereClause.tahunAjaranId = parseInt(tahunAjaranId);
    }

    // Get reports
    const reports = await prisma.studentReport.findMany({
      where: whereClause,
      include: {
        item: {
          include: {
            kategori: true,
          },
        },
        reporter: {
          select: { name: true },
        },
      },
      orderBy: {
        tanggal: "desc",
      },
    });

    // Format laporan agar konsisten dengan format BK
    const formattedReports = reports.map((report) => ({
      id: report.id,
      tanggal: report.tanggal,
      tipe: report.item.tipe,
      namaItem: report.item.nama,
      kategori: report.item.kategoriId,
      point: report.pointSaat,
      deskripsi: report.deskripsi,
      reporter: report.reporter,
      bukti: report.bukti,
      kelasSaatLaporan: report.classAtTime,
      item: report.item, // Keep for backward compatibility
    }));

    res.json({ reports: formattedReports });
  } catch (error) {
    console.error("Error getting student reports:", error);
    res.status(500).json({ error: "Gagal mengambil laporan siswa" });
  }
};

// Get all reports in kajur's jurusan
const getAllReports = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0, search = "" } = req.query;

    // Verify kajur has access
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: { jurusan: true },
    });

    if (!teacher || !teacher.jurusan) {
      return res.status(403).json({
        error: "Anda tidak memiliki akses sebagai Kepala Jurusan",
      });
    }

    // Build where clause
    const whereClause = {
      status: "approved", // Only show approved reports
      student: {
        classroom: {
          jurusanId: teacher.jurusan.id,
        },
      },
    };

    // Add search filter
    if (search) {
      whereClause.OR = [
        {
          student: {
            nisn: {
              contains: search,
            },
          },
        },
        {
          student: {
            user: {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
      ];
    }

    // Get total count
    const total = await prisma.studentReport.count({
      where: whereClause,
    });

    // Get reports with pagination
    const reports = await prisma.studentReport.findMany({
      where: whereClause,
      include: {
        student: {
          include: {
            user: {
              select: { name: true },
            },
            classroom: {
              select: { namaKelas: true },
            },
          },
        },
        item: {
          select: {
            nama: true,
            tipe: true,
            point: true,
          },
        },
        reporter: {
          select: { name: true },
        },
      },
      orderBy: {
        tanggal: "desc",
      },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    // Format reports
    const formattedReports = reports.map((report) => ({
      id: report.id,
      tanggal: report.tanggal,
      nisn: report.student.nisn,
      namaSiswa: report.student.user.name,
      namaKelas: report.student.classroom.namaKelas,
      tipe: report.item.tipe,
      namaItem: report.item.nama,
      point: report.pointSaat,
      reporter: report.reporter.name,
    }));

    res.json({
      reports: formattedReports,
      total,
    });
  } catch (error) {
    console.error("Error getting all reports:", error);
    res.status(500).json({ error: "Gagal mengambil laporan" });
  }
};

module.exports = {
  getKajurClasses,
  getClassStudents,
  getStudentDetail,
  getStudentReports,
  getAllReports,
};
