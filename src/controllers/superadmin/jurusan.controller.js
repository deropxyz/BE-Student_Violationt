const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get all jurusan with their kajur
const getAllJurusan = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = search
      ? {
          OR: [
            { kodeJurusan: { contains: search, mode: "insensitive" } },
            { namaJurusan: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const [jurusan, total] = await Promise.all([
      prisma.jurusan.findMany({
        where: whereClause,
        include: {
          kajur: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          _count: {
            select: { classrooms: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.jurusan.count({ where: whereClause }),
    ]);

    res.json({
      data: jurusan.map((j) => ({
        id: j.id,
        kodeJurusan: j.kodeJurusan,
        namaJurusan: j.namaJurusan,
        deskripsi: j.deskripsi,
        isActive: j.isActive,
        kajur: j.kajur
          ? {
              id: j.kajur.id,
              name: j.kajur.user.name,
              email: j.kajur.user.email,
              nip: j.kajur.nip,
            }
          : null,
        totalKelas: j._count.classrooms,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil data jurusan" });
  }
};

// Get jurusan by ID
const getJurusanById = async (req, res) => {
  const { id } = req.params;
  try {
    const jurusan = await prisma.jurusan.findUnique({
      where: { id: parseInt(id) },
      include: {
        kajur: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        classrooms: {
          include: {
            _count: {
              select: { students: true },
            },
          },
          orderBy: { namaKelas: "asc" },
        },
      },
    });

    if (!jurusan) {
      return res.status(404).json({ error: "Jurusan tidak ditemukan" });
    }

    res.json({
      data: {
        id: jurusan.id,
        kodeJurusan: jurusan.kodeJurusan,
        namaJurusan: jurusan.namaJurusan,
        deskripsi: jurusan.deskripsi,
        isActive: jurusan.isActive,
        kajur: jurusan.kajur
          ? {
              id: jurusan.kajur.id,
              name: jurusan.kajur.user.name,
              email: jurusan.kajur.user.email,
              nip: jurusan.kajur.nip,
            }
          : null,
        classrooms: jurusan.classrooms.map((c) => ({
          id: c.id,
          kodeKelas: c.kodeKelas,
          namaKelas: c.namaKelas,
          tingkat: c.tingkat,
          rombel: c.rombel,
          totalSiswa: c._count.students,
        })),
        createdAt: jurusan.createdAt,
        updatedAt: jurusan.updatedAt,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil data jurusan" });
  }
};

// Create new jurusan
const createJurusan = async (req, res) => {
  const { kodeJurusan, namaJurusan, deskripsi, kajurId } = req.body;

  try {
    // Validate required fields
    if (!kodeJurusan || !namaJurusan) {
      return res.status(400).json({
        error: "Kode jurusan dan nama jurusan wajib diisi",
      });
    }

    // Check if kodeJurusan already exists
    const existingJurusan = await prisma.jurusan.findUnique({
      where: { kodeJurusan: kodeJurusan.toUpperCase() },
    });

    if (existingJurusan) {
      return res.status(400).json({
        error: "Kode jurusan sudah digunakan",
      });
    }

    // If kajurId provided, validate teacher exists and is not already kajur
    if (kajurId) {
      const teacher = await prisma.teacher.findUnique({
        where: { id: parseInt(kajurId) },
      });

      if (!teacher) {
        return res.status(400).json({ error: "Guru tidak ditemukan" });
      }

      const existingKajur = await prisma.jurusan.findFirst({
        where: { kajurId: parseInt(kajurId) },
      });

      if (existingKajur) {
        return res.status(400).json({
          error: "Guru sudah menjadi kepala jurusan di jurusan lain",
        });
      }
    }

    const jurusan = await prisma.jurusan.create({
      data: {
        kodeJurusan: kodeJurusan.toUpperCase(),
        namaJurusan,
        deskripsi: deskripsi || null,
        kajurId: kajurId ? parseInt(kajurId) : null,
      },
      include: {
        kajur: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    res.status(201).json({
      message: "Jurusan berhasil dibuat",
      data: {
        id: jurusan.id,
        kodeJurusan: jurusan.kodeJurusan,
        namaJurusan: jurusan.namaJurusan,
        deskripsi: jurusan.deskripsi,
        isActive: jurusan.isActive,
        kajur: jurusan.kajur
          ? {
              id: jurusan.kajur.id,
              name: jurusan.kajur.user.name,
              email: jurusan.kajur.user.email,
              nip: jurusan.kajur.nip,
            }
          : null,
        createdAt: jurusan.createdAt,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal membuat jurusan" });
  }
};

// Update jurusan
const updateJurusan = async (req, res) => {
  const { id } = req.params;
  const { kodeJurusan, namaJurusan, deskripsi, kajurId, isActive } = req.body;

  try {
    // Check if jurusan exists
    const existingJurusan = await prisma.jurusan.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingJurusan) {
      return res.status(404).json({ error: "Jurusan tidak ditemukan" });
    }

    // If kodeJurusan changed, check uniqueness
    if (
      kodeJurusan &&
      kodeJurusan.toUpperCase() !== existingJurusan.kodeJurusan
    ) {
      const duplicateKode = await prisma.jurusan.findUnique({
        where: { kodeJurusan: kodeJurusan.toUpperCase() },
      });

      if (duplicateKode) {
        return res.status(400).json({
          error: "Kode jurusan sudah digunakan",
        });
      }
    }

    // If kajurId provided, validate teacher exists and is not already kajur elsewhere
    if (kajurId) {
      const teacher = await prisma.teacher.findUnique({
        where: { id: parseInt(kajurId) },
      });

      if (!teacher) {
        return res.status(400).json({ error: "Guru tidak ditemukan" });
      }

      const existingKajur = await prisma.jurusan.findFirst({
        where: {
          kajurId: parseInt(kajurId),
          NOT: { id: parseInt(id) }, // Exclude current jurusan
        },
      });

      if (existingKajur) {
        return res.status(400).json({
          error: "Guru sudah menjadi kepala jurusan di jurusan lain",
        });
      }
    }

    const updatedJurusan = await prisma.jurusan.update({
      where: { id: parseInt(id) },
      data: {
        ...(kodeJurusan && { kodeJurusan: kodeJurusan.toUpperCase() }),
        ...(namaJurusan && { namaJurusan }),
        ...(deskripsi !== undefined && { deskripsi }),
        ...(kajurId !== undefined && {
          kajurId: kajurId ? parseInt(kajurId) : null,
        }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        kajur: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    res.json({
      message: "Jurusan berhasil diupdate",
      data: {
        id: updatedJurusan.id,
        kodeJurusan: updatedJurusan.kodeJurusan,
        namaJurusan: updatedJurusan.namaJurusan,
        deskripsi: updatedJurusan.deskripsi,
        isActive: updatedJurusan.isActive,
        kajur: updatedJurusan.kajur
          ? {
              id: updatedJurusan.kajur.id,
              name: updatedJurusan.kajur.user.name,
              email: updatedJurusan.kajur.user.email,
              nip: updatedJurusan.kajur.nip,
            }
          : null,
        updatedAt: updatedJurusan.updatedAt,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengupdate jurusan" });
  }
};

// Delete jurusan
const deleteJurusan = async (req, res) => {
  const { id } = req.params;

  try {
    // Check if jurusan exists
    const existingJurusan = await prisma.jurusan.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: { classrooms: true },
        },
      },
    });

    if (!existingJurusan) {
      return res.status(404).json({ error: "Jurusan tidak ditemukan" });
    }

    // Check if jurusan has classes
    if (existingJurusan._count.classrooms > 0) {
      return res.status(400).json({
        error: "Tidak dapat menghapus jurusan yang masih memiliki kelas",
      });
    }

    await prisma.jurusan.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: "Jurusan berhasil dihapus" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal menghapus jurusan" });
  }
};

// Assign/Remove kajur
const assignKajur = async (req, res) => {
  const { jurusanId, teacherId } = req.body;

  try {
    // Validate jurusan exists
    const jurusan = await prisma.jurusan.findUnique({
      where: { id: parseInt(jurusanId) },
    });

    if (!jurusan) {
      return res.status(404).json({ error: "Jurusan tidak ditemukan" });
    }

    // If teacherId is null, remove kajur
    if (!teacherId) {
      await prisma.jurusan.update({
        where: { id: parseInt(jurusanId) },
        data: { kajurId: null },
      });

      return res.json({ message: "Kepala jurusan berhasil dihapus" });
    }

    // Validate teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { id: parseInt(teacherId) },
      include: {
        user: {
          select: { name: true },
        },
      },
    });

    if (!teacher) {
      return res.status(404).json({ error: "Guru tidak ditemukan" });
    }

    // Check if teacher is already kajur elsewhere
    const existingKajur = await prisma.jurusan.findFirst({
      where: {
        kajurId: parseInt(teacherId),
        NOT: { id: parseInt(jurusanId) },
      },
    });

    if (existingKajur) {
      return res.status(400).json({
        error: "Guru sudah menjadi kepala jurusan di jurusan lain",
      });
    }

    await prisma.jurusan.update({
      where: { id: parseInt(jurusanId) },
      data: { kajurId: parseInt(teacherId) },
    });

    res.json({
      message: `${teacher.user.name} berhasil ditugaskan sebagai kepala jurusan`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal menugaskan kepala jurusan" });
  }
};

// Get available teachers for kajur (not already assigned as kajur)
const getAvailableTeachers = async (req, res) => {
  try {
    const teachers = await prisma.teacher.findMany({
      where: {
        // Exclude teachers who are already kajur
        jurusan: null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: {
        user: { name: "asc" },
      },
    });

    res.json({
      data: teachers.map((t) => ({
        id: t.id,
        name: t.user.name,
        email: t.user.email,
        nip: t.nip,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil data guru" });
  }
};

// Get jurusan statistics
const getJurusanStats = async (req, res) => {
  try {
    const stats = await prisma.jurusan.findMany({
      include: {
        _count: {
          select: {
            classrooms: true,
          },
        },
        classrooms: {
          include: {
            _count: {
              select: { students: true },
            },
          },
        },
      },
    });

    const formattedStats = stats.map((jurusan) => {
      const totalSiswa = jurusan.classrooms.reduce(
        (sum, classroom) => sum + classroom._count.students,
        0
      );

      return {
        id: jurusan.id,
        kodeJurusan: jurusan.kodeJurusan,
        namaJurusan: jurusan.namaJurusan,
        totalKelas: jurusan._count.classrooms,
        totalSiswa,
        isActive: jurusan.isActive,
      };
    });

    const summary = {
      totalJurusan: stats.length,
      totalJurusanAktif: stats.filter((j) => j.isActive).length,
      totalKelas: stats.reduce((sum, j) => sum + j._count.classrooms, 0),
      totalSiswa: formattedStats.reduce((sum, j) => sum + j.totalSiswa, 0),
    };

    res.json({
      summary,
      data: formattedStats,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil statistik jurusan" });
  }
};

module.exports = {
  getAllJurusan,
  getJurusanById,
  createJurusan,
  updateJurusan,
  deleteJurusan,
  assignKajur,
  getAvailableTeachers,
  getJurusanStats,
};
