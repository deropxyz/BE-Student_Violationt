const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

// Get all teachers with basic information
const getAllTeachers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where conditions
    let whereConditions = {
      role: "guru",
    };

    // Add search functionality
    if (search) {
      whereConditions.OR = [
        { teacher: { nip: { contains: search, mode: "insensitive" } } },
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [teachers, total] = await Promise.all([
      prisma.user.findMany({
        where: whereConditions,
        include: {
          teacher: {
            select: {
              nip: true,
              noHp: true,
              classrooms: {
                select: {
                  namaKelas: true,
                },
              },
            },
          },
        },
        orderBy: [{ name: "asc" }],
        skip,
        take: parseInt(limit),
      }),
      prisma.user.count({
        where: whereConditions,
      }),
    ]);

    const formattedTeachers = teachers.map((user) => ({
      id: user.id,
      nip: user.teacher?.nip || null,
      nama: user.name,
      email: user.email,
      noHp: user.teacher?.noHp || null,
      role: user.role, // Tambahkan role sebagai pembeda
      waliKelas: user.teacher?.classrooms?.[0]?.namaKelas || null, // Informasi wali kelas
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    res.json({
      data: formattedTeachers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Error getting teachers:", err);
    res.status(500).json({ error: "Failed to fetch teachers" });
  }
};

// Get all BK counselors with basic information
const getAllBK = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where conditions
    let whereConditions = {
      role: "bk",
    };

    // Add search functionality
    if (search) {
      whereConditions.OR = [
        { teacher: { nip: { contains: search, mode: "insensitive" } } },
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [bkCounselors, total] = await Promise.all([
      prisma.user.findMany({
        where: whereConditions,
        include: {
          teacher: {
            select: {
              nip: true,
              noHp: true,
              classrooms: {
                select: {
                  namaKelas: true,
                },
              },
            },
          },
        },
        orderBy: [{ name: "asc" }],
        skip,
        take: parseInt(limit),
      }),
      prisma.user.count({
        where: whereConditions,
      }),
    ]);

    const formattedBK = bkCounselors.map((user) => ({
      id: user.id,
      nip: user.teacher?.nip || null,
      nama: user.name, // Hapus label BK dari nama
      email: user.email,
      noHp: user.teacher?.noHp || null,
      role: user.role, // Role sebagai pembeda
      waliKelas: user.teacher?.classrooms?.[0]?.namaKelas || null, // Informasi wali kelas
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    res.json({
      data: formattedBK,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Error getting BK counselors:", err);
    res.status(500).json({ error: "Failed to fetch BK counselors" });
  }
};

// Get all teachers and BK combined
const getAllTeachersAndBK = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where conditions
    let whereConditions = {
      role: {
        in: ["guru", "bk"],
      },
    };

    // Filter by specific role if provided
    if (role && (role === "guru" || role === "bk")) {
      whereConditions.role = role;
    }

    // Add search functionality
    if (search) {
      whereConditions.OR = [
        { teacher: { nip: { contains: search, mode: "insensitive" } } },
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereConditions,
        include: {
          teacher: {
            select: {
              nip: true,
              noHp: true,
              classrooms: {
                select: {
                  kodeKelas: true,
                },
              },
            },
          },
        },
        orderBy: [{ role: "asc" }, { name: "asc" }],
        skip,
        take: parseInt(limit),
      }),
      prisma.user.count({
        where: whereConditions,
      }),
    ]);

    const formattedUsers = users.map((user) => ({
      id: user.id,
      nip: user.teacher?.nip || null,
      nama: user.name, // Hapus label BK, gunakan nama asli
      email: user.email,
      noHp: user.teacher?.noHp || null,
      role: user.role, // Role sebagai pembeda antara guru dan BK
      waliKelas: user.teacher?.classrooms?.[0]?.kodeKelas || null, // Informasi wali kelas
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    res.json({
      data: formattedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Error getting teachers and BK:", err);
    res.status(500).json({ error: "Failed to fetch teachers and BK" });
  }
};

// Get teacher detail by ID
const getTeacherDetail = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const teacher = await prisma.user.findUnique({
      where: {
        id: parseInt(teacherId),
        role: {
          in: ["guru", "bk"],
        },
      },
      include: {
        teacher: {
          include: {
            classrooms: {
              select: {
                namaKelas: true,
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const formattedTeacher = {
      id: teacher.id,
      nama: teacher.name, // Hapus label BK, gunakan nama asli
      email: teacher.email,
      nip: teacher.teacher?.nip || null,
      noHp: teacher.teacher?.noHp || null,
      role: teacher.role, // Role sebagai pembeda
      waliKelas: teacher.teacher?.classrooms?.[0]?.namaKelas || null, // Informasi wali kelas
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt,
    };

    res.json({
      success: true,
      data: formattedTeacher,
    });
  } catch (err) {
    console.error("Error getting teacher detail:", err);
    res.status(500).json({ error: "Failed to fetch teacher detail" });
  }
};

// Create new teacher or BK
const createTeacher = async (req, res) => {
  try {
    const { nama, email, nip, noHp, alamat, role, password } = req.body;

    // Validate required fields
    if (!nama || !email || !nip || !role) {
      return res.status(400).json({
        error: "Nama, email, NIP, dan role harus diisi",
      });
    }

    // Validate role
    if (!["guru", "bk"].includes(role)) {
      return res.status(400).json({
        error: "Role harus guru atau bk",
      });
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return res.status(400).json({
        error: "Email sudah digunakan",
      });
    }

    // Check if NIP already exists
    const existingNIP = await prisma.teacher.findUnique({
      where: { nip },
    });

    if (existingNIP) {
      return res.status(400).json({
        error: "NIP sudah digunakan",
      });
    }

    // Hash password (use default if not provided)
    const defaultPassword = password || "smkn14garut";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Create user and teacher in transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Create user
      const user = await prisma.user.create({
        data: {
          name: nama,
          email,
          password: hashedPassword,
          role,
        },
      });

      // Create teacher record
      const teacher = await prisma.teacher.create({
        data: {
          userId: user.id,
          nip,
          noHp: noHp || null,
          alamat: alamat || null,
        },
      });

      return { user, teacher };
    });

    // Format response
    const formattedTeacher = {
      id: result.user.id,
      nama: result.user.name,
      email: result.user.email,
      nip: result.teacher.nip,
      noHp: result.teacher.noHp,
      alamat: result.teacher.alamat,
      role: result.user.role,
      waliKelas: null, // New teacher, no class assigned yet
      createdAt: result.user.createdAt,
    };

    res.status(201).json({
      success: true,
      message: `${role === "guru" ? "Guru" : "BK"} berhasil dibuat`,
      data: formattedTeacher,
    });
  } catch (err) {
    console.error("Error creating teacher:", err);
    res.status(500).json({ error: "Gagal membuat data guru/BK" });
  }
};

// Update teacher or BK
const updateTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { nama, email, nip, noHp, alamat, role, password } = req.body;

    // Validate teacherId
    if (!teacherId || isNaN(parseInt(teacherId))) {
      return res.status(400).json({
        error: "ID guru tidak valid",
      });
    }

    // Check if teacher exists
    const existingTeacher = await prisma.user.findUnique({
      where: {
        id: parseInt(teacherId),
        role: {
          in: ["guru", "bk"],
        },
      },
      include: {
        teacher: true,
      },
    });

    if (!existingTeacher) {
      return res.status(404).json({
        error: "Guru/BK tidak ditemukan",
      });
    }

    // Validate role if provided
    if (role && !["guru", "bk"].includes(role)) {
      return res.status(400).json({
        error: "Role harus guru atau bk",
      });
    }

    // Check if email already exists (exclude current user)
    if (email && email !== existingTeacher.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingEmail) {
        return res.status(400).json({
          error: "Email sudah digunakan",
        });
      }
    }

    // Check if NIP already exists (exclude current teacher)
    if (nip && nip !== existingTeacher.teacher.nip) {
      const existingNIP = await prisma.teacher.findUnique({
        where: { nip },
      });

      if (existingNIP) {
        return res.status(400).json({
          error: "NIP sudah digunakan",
        });
      }
    }

    // Prepare update data
    const updateData = {};
    const teacherUpdateData = {};

    // Update user fields
    if (nama) updateData.name = nama;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update teacher fields
    if (nip) teacherUpdateData.nip = nip;
    if (noHp !== undefined) teacherUpdateData.noHp = noHp || null;
    if (alamat !== undefined) teacherUpdateData.alamat = alamat || null;

    // Update in transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: parseInt(teacherId) },
        data: updateData,
      });

      // Update teacher
      const updatedTeacher = await prisma.teacher.update({
        where: { userId: parseInt(teacherId) },
        data: teacherUpdateData,
        include: {
          classrooms: {
            select: {
              namaKelas: true,
            },
          },
        },
      });

      return { user: updatedUser, teacher: updatedTeacher };
    });

    // Format response
    const formattedTeacher = {
      id: result.user.id,
      nama: result.user.name,
      email: result.user.email,
      nip: result.teacher.nip,
      noHp: result.teacher.noHp,
      alamat: result.teacher.alamat,
      role: result.user.role,
      waliKelas: result.teacher.classrooms?.[0]?.namaKelas || null,
      updatedAt: result.user.updatedAt || new Date(),
    };

    res.json({
      success: true,
      message: `${
        result.user.role === "guru" ? "Guru" : "BK"
      } berhasil diperbarui`,
      data: formattedTeacher,
    });
  } catch (err) {
    console.error("Error updating teacher:", err);
    res.status(500).json({ error: "Gagal memperbarui data guru/BK" });
  }
};

// Delete teacher or BK
const deleteTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Validate teacherId
    if (!teacherId || isNaN(parseInt(teacherId))) {
      return res.status(400).json({
        error: "ID guru tidak valid",
      });
    }

    // Check if teacher exists
    const existingTeacher = await prisma.user.findUnique({
      where: {
        id: parseInt(teacherId),
        role: {
          in: ["guru", "bk"],
        },
      },
      include: {
        teacher: {
          include: {
            classrooms: true,
          },
        },
      },
    });

    if (!existingTeacher) {
      return res.status(404).json({
        error: "Guru/BK tidak ditemukan",
      });
    }

    // Check if teacher is currently a wali kelas
    if (existingTeacher.teacher?.classrooms?.length > 0) {
      return res.status(400).json({
        error:
          "Tidak dapat menghapus guru yang masih menjadi wali kelas. Harap hapus assignment wali kelas terlebih dahulu.",
      });
    }

    // Delete in transaction (will cascade delete teacher record)
    await prisma.$transaction(async (prisma) => {
      // Delete user (will cascade delete teacher record due to onDelete: Cascade)
      await prisma.user.delete({
        where: { id: parseInt(teacherId) },
      });
    });

    const roleLabel = existingTeacher.role === "guru" ? "Guru" : "BK";
    res.json({
      success: true,
      message: `${roleLabel} berhasil dihapus`,
    });
  } catch (err) {
    console.error("Error deleting teacher:", err);
    res.status(500).json({ error: "Gagal menghapus data guru/BK" });
  }
};

// Reset teacher password to default
const resetTeacherPassword = async (req, res) => {
  const { teacherId } = req.params;
  const defaultPassword = process.env.DEFAULT_PASSWORD;

  if (!defaultPassword) {
    return res.status(500).json({
      error: "DEFAULT_PASSWORD belum diatur di .env",
    });
  }

  try {
    // Find teacher/BK user
    const teacher = await prisma.user.findUnique({
      where: { id: parseInt(teacherId) },
      include: { teacher: true },
    });

    if (!teacher || (teacher.role !== "guru" && teacher.role !== "bk")) {
      return res.status(404).json({ error: "Guru/BK tidak ditemukan" });
    }

    // Hash default password
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Update user password
    await prisma.user.update({
      where: { id: parseInt(teacherId) },
      data: { password: hashedPassword },
    });

    const roleLabel = teacher.role === "guru" ? "guru" : "BK";
    res.json({
      success: true,
      message: `Password ${roleLabel} berhasil direset ke default`,
    });
  } catch (err) {
    console.error("Error resetting teacher password:", err);
    res.status(500).json({ error: "Gagal reset password guru/BK" });
  }
};

module.exports = {
  getAllTeachers,
  getAllBK,
  getAllTeachersAndBK,
  getTeacherDetail,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  resetTeacherPassword,
};
