const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get all konsultasi with filters
const getAllKonsultasi = async (req, res) => {
  try {
    const {
      studentId,
      bkId,
      startDate,
      endDate,
      search, // untuk cari nama atau nisn
      page = 1,
      limit = 10,
    } = req.query;

    const where = {};

    if (studentId) {
      where.studentId = parseInt(studentId);
    }

    if (bkId) {
      where.bkId = parseInt(bkId);
    }

    if (startDate || endDate) {
      where.tanggal = {};
      if (startDate) where.tanggal.gte = new Date(startDate);
      if (endDate) where.tanggal.lte = new Date(endDate);
    }

    // Search by student name or NISN
    if (search) {
      where.student = {
        OR: [
          { nisn: { contains: search, mode: "insensitive" } },
          { user: { name: { contains: search, mode: "insensitive" } } },
        ],
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [konsultasi, total] = await Promise.all([
      prisma.konsultasi.findMany({
        where,
        skip,
        take,
        include: {
          student: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
              classroom: true,
            },
          },
          bk: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          tanggal: "desc",
        },
      }),
      prisma.konsultasi.count({ where }),
    ]);

    res.json({
      success: true,
      data: konsultasi,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error getting konsultasi:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mendapatkan data konsultasi",
      error: error.message,
    });
  }
};

// Get konsultasi by ID
const getKonsultasiById = async (req, res) => {
  try {
    const { id } = req.params;

    const konsultasi = await prisma.konsultasi.findUnique({
      where: { id: parseInt(id) },
      include: {
        student: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            classroom: true,
          },
        },
        bk: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!konsultasi) {
      return res.status(404).json({
        success: false,
        message: "Konsultasi tidak ditemukan",
      });
    }

    res.json({
      success: true,
      data: konsultasi,
    });
  } catch (error) {
    console.error("Error getting konsultasi by ID:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mendapatkan data konsultasi",
      error: error.message,
    });
  }
};

// Get konsultasi by student ID
const getKonsultasiBySiswa = async (req, res) => {
  try {
    const { studentId } = req.params;

    const konsultasi = await prisma.konsultasi.findMany({
      where: { studentId: parseInt(studentId) },
      include: {
        bk: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        tanggal: "desc",
      },
    });

    res.json({
      success: true,
      data: konsultasi,
      total: konsultasi.length,
    });
  } catch (error) {
    console.error("Error getting konsultasi by student:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mendapatkan riwayat konsultasi siswa",
      error: error.message,
    });
  }
};

// Create konsultasi
const createKonsultasi = async (req, res) => {
  try {
    const { studentId, judul, deskripsi, tanggal } = req.body;
    const bkId = req.user.id; // ID BK dari middleware auth

    // Validasi input
    if (!studentId || !judul || !deskripsi) {
      return res.status(400).json({
        success: false,
        message: "Data tidak lengkap. Mohon isi semua field yang diperlukan",
      });
    }

    // Cek apakah siswa ada
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Siswa tidak ditemukan",
      });
    }

    // Create konsultasi
    const konsultasi = await prisma.konsultasi.create({
      data: {
        studentId: parseInt(studentId),
        bkId,
        judul,
        deskripsi,
        tanggal: tanggal ? new Date(tanggal) : new Date(),
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            classroom: true,
          },
        },
        bk: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Konsultasi berhasil ditambahkan",
      data: konsultasi,
    });
  } catch (error) {
    console.error("Error creating konsultasi:", error);
    res.status(500).json({
      success: false,
      message: "Gagal menambahkan konsultasi",
      error: error.message,
    });
  }
};

// Update konsultasi
const updateKonsultasi = async (req, res) => {
  try {
    const { id } = req.params;
    const { judul, deskripsi, tanggal } = req.body;

    // Cek apakah konsultasi ada
    const existingKonsultasi = await prisma.konsultasi.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingKonsultasi) {
      return res.status(404).json({
        success: false,
        message: "Konsultasi tidak ditemukan",
      });
    }

    // Update konsultasi
    const konsultasi = await prisma.konsultasi.update({
      where: { id: parseInt(id) },
      data: {
        ...(judul && { judul }),
        ...(deskripsi && { deskripsi }),
        ...(tanggal && { tanggal: new Date(tanggal) }),
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            classroom: true,
          },
        },
        bk: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: "Konsultasi berhasil diperbarui",
      data: konsultasi,
    });
  } catch (error) {
    console.error("Error updating konsultasi:", error);
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui konsultasi",
      error: error.message,
    });
  }
};

// Delete konsultasi
const deleteKonsultasi = async (req, res) => {
  try {
    const { id } = req.params;

    // Cek apakah konsultasi ada
    const existingKonsultasi = await prisma.konsultasi.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingKonsultasi) {
      return res.status(404).json({
        success: false,
        message: "Konsultasi tidak ditemukan",
      });
    }

    await prisma.konsultasi.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: "Konsultasi berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleting konsultasi:", error);
    res.status(500).json({
      success: false,
      message: "Gagal menghapus konsultasi",
      error: error.message,
    });
  }
};

module.exports = {
  getAllKonsultasi,
  getKonsultasiById,
  getKonsultasiBySiswa,
  createKonsultasi,
  updateKonsultasi,
  deleteKonsultasi,
};
