const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const XLSX = require("xlsx");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const upload = multer({ dest: "uploads/" });

// Get all classrooms with complete information
const getAllClassrooms = async (req, res) => {
  try {
    const [classrooms, total] = await Promise.all([
      prisma.classroom.findMany({
        include: {
          waliKelas: {
            select: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              students: true, // Menghitung jumlah siswa aktual
            },
          },
        },
        orderBy: { namaKelas: "desc" },
      }),
      prisma.classroom.count(),
    ]);

    const formattedClassrooms = classrooms.map((c) => ({
      id: c.id,
      kodeKelas: c.kodeKelas,
      namaKelas: c.namaKelas,
      jmlSiswa: c._count.students, // Menggunakan hasil count yang aktual
      waliKelas: c.waliKelas?.user?.name || null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    res.json({
      data: formattedClassrooms,
    });
  } catch (err) {
    console.error("Error getting classrooms:", err);
    res.status(500).json({ error: "Failed to fetch classrooms" });
  }
};

// Get all students with basic information
const getAllStudents = async (req, res) => {
  try {
    const { page = 1, limit = 10, classroomId, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where conditions
    let whereConditions = {
      role: "siswa",
    };

    // Filter by classroom if provided
    if (classroomId) {
      whereConditions.student = {
        classroomId: parseInt(classroomId),
      };
    }

    // Add search functionality
    if (search) {
      whereConditions.OR = [
        { student: { nisn: { contains: search, mode: "insensitive" } } },
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [students, total] = await Promise.all([
      prisma.user.findMany({
        where: whereConditions,
        include: {
          student: {
            select: {
              nisn: true,
              noHp: true,
              classroom: {
                select: {
                  id: true,
                  namaKelas: true,
                  kodeKelas: true,
                },
              },
              angkatan: {
                select: {
                  id: true,
                  tahun: true,
                },
              },
            },
          },
        },
        orderBy: [{ student: { nisn: "asc" } }, { name: "asc" }],
        skip,
        take: parseInt(limit),
      }),
      prisma.user.count({
        where: whereConditions,
      }),
    ]);

    const formattedStudents = students.map((user) => ({
      id: user.id,
      nisn: user.student?.nisn || null,
      nama: user.name,
      email: user.email,
      noHp: user.student?.noHp || null,
      kelas: user.student?.classroom
        ? {
            id: user.student.classroom.id,
            nama: user.student.classroom.namaKelas,
            kode: user.student.classroom.kodeKelas,
          }
        : null,
      angkatan: user.student?.angkatan
        ? {
            id: user.student.angkatan.id,
            tahun: user.student.angkatan.tahun,
          }
        : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    res.json({
      data: formattedStudents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Error getting students:", err);
    res.status(500).json({ error: "Failed to fetch students" });
  }
};

// Get students by classroom ID
const getStudentsByClassroom = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const { page = 1, limit = 50, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where conditions
    let whereConditions = {
      role: "siswa",
      student: {
        classroomId: parseInt(classroomId),
      },
    };

    // Add search functionality
    if (search) {
      whereConditions.OR = [
        { student: { nisn: { contains: search, mode: "insensitive" } } },
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [students, total, classroom] = await Promise.all([
      prisma.user.findMany({
        where: whereConditions,
        include: {
          student: {
            select: {
              nisn: true,
              noHp: true,
              gender: true,
              tempatLahir: true,
              tglLahir: true,
              alamat: true,
              angkatan: {
                select: {
                  id: true,
                  tahun: true,
                },
              },
            },
          },
        },
        orderBy: [{ student: { nisn: "asc" } }, { name: "asc" }],
        skip,
        take: parseInt(limit),
      }),
      prisma.user.count({
        where: whereConditions,
      }),
      prisma.classroom.findUnique({
        where: { id: parseInt(classroomId) },
        select: {
          id: true,
          namaKelas: true,
          kodeKelas: true,
          waliKelas: {
            select: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const formattedStudents = students.map((user) => ({
      id: user.id,
      nisn: user.student?.nisn || null,
      nama: user.name,
      email: user.email,
      noHp: user.student?.noHp || null,
      gender: user.student?.gender || null,
      tempatLahir: user.student?.tempatLahir || null,
      tglLahir: user.student?.tglLahir || null,
      alamat: user.student?.alamat || null,
      angkatan: user.student?.angkatan
        ? {
            id: user.student.angkatan.id,
            tahun: user.student.angkatan.tahun,
          }
        : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    res.json({
      data: formattedStudents,
      classroom: classroom,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Error getting students by classroom:", err);
    res.status(500).json({ error: "Failed to fetch students by classroom" });
  }
};

// Create new student
const createStudent = async (req, res) => {
  try {
    const { classroomId } = req.params; // Get classroomId from URL params
    const {
      nisn,
      name,
      gender,
      tempatLahir,
      tglLahir,
      alamat,
      noHp,
      angkatanId,
      orangTuaId,
    } = req.body;

    // Validate required fields (classroomId tidak perlu karena dari params)
    if (
      !nisn ||
      !name ||
      !gender ||
      !tempatLahir ||
      !tglLahir ||
      !alamat ||
      !noHp ||
      !angkatanId
    ) {
      return res.status(400).json({
        error:
          "NISN, nama, jenis kelamin, tempat lahir, tanggal lahir, alamat, no HP, dan angkatan wajib diisi",
      });
    }

    // Check if classroom exists
    const classroom = await prisma.classroom.findUnique({
      where: { id: parseInt(classroomId) },
    });

    if (!classroom) {
      return res.status(400).json({ error: "Kelas tidak ditemukan" });
    }

    // Check if NISN already exists
    const existingNISN = await prisma.student.findFirst({
      where: { nisn: nisn },
    });

    if (existingNISN) {
      return res.status(400).json({ error: "NISN sudah terdaftar" });
    }

    // Auto-generate email based on NISN
    const email = `${nisn}@smkn14garut.sch.id`;

    // Check if email already exists
    const existingEmail = await prisma.user.findFirst({
      where: { email: email },
    });

    if (existingEmail) {
      return res.status(400).json({ error: "Email sudah terdaftar" });
    }

    // Check if angkatan exists
    const angkatan = await prisma.angkatan.findUnique({
      where: { id: parseInt(angkatanId) },
    });

    if (!angkatan) {
      return res.status(400).json({ error: "Angkatan tidak ditemukan" });
    }

    // Hash default password
    const defaultPassword = "smkn14garut";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Create user first
    const newUser = await prisma.user.create({
      data: {
        name: name,
        email: email,
        password: hashedPassword,
        role: "siswa",
      },
    });

    // Create student record with classroomId from params
    const newStudent = await prisma.student.create({
      data: {
        userId: newUser.id,
        nisn: nisn,
        gender: gender,
        tempatLahir: tempatLahir,
        tglLahir: new Date(tglLahir),
        alamat: alamat,
        noHp: noHp,
        classroomId: parseInt(classroomId), // Menggunakan classroomId dari params
        angkatanId: parseInt(angkatanId),
        orangTuaId: orangTuaId ? parseInt(orangTuaId) : null,
      },
    });

    // Fetch created student with relations
    const studentWithRelations = await prisma.user.findUnique({
      where: { id: newUser.id },
      include: {
        student: {
          include: {
            classroom: {
              select: {
                id: true,
                namaKelas: true,
                kodeKelas: true,
              },
            },
            angkatan: {
              select: {
                id: true,
                tahun: true,
              },
            },
          },
        },
      },
    });

    const formattedStudent = {
      id: studentWithRelations.id,
      nama: studentWithRelations.name,
      email: studentWithRelations.email,
      nisn: studentWithRelations.student?.nisn || null,
      kelas: studentWithRelations.student?.classroom
        ? `${studentWithRelations.student.classroom.namaKelas} ${studentWithRelations.student.classroom.kodeKelas}`
        : null,
      classroomId: studentWithRelations.student?.classroom?.id || null,
      gender: studentWithRelations.student?.gender || null,
      noHp: studentWithRelations.student?.noHp || null,
      alamat: studentWithRelations.student?.alamat || null,
      tempatLahir: studentWithRelations.student?.tempatLahir || null,
      tglLahir: studentWithRelations.student?.tglLahir || null,
      angkatan: studentWithRelations.student?.angkatan
        ? {
            id: studentWithRelations.student.angkatan.id,
            tahun: studentWithRelations.student.angkatan.tahun,
          }
        : null,
      defaultPassword: defaultPassword, // Include for admin reference
    };

    res.status(201).json({
      success: true,
      message: "Siswa berhasil ditambahkan",
      data: formattedStudent,
    });
  } catch (err) {
    console.error("Error creating student:", err);
    if (err.code === "P2002") {
      // Unique constraint violation
      if (err.meta?.target?.includes("email")) {
        return res.status(400).json({ error: "Email sudah terdaftar" });
      }
      if (err.meta?.target?.includes("nisn")) {
        return res.status(400).json({ error: "NISN sudah terdaftar" });
      }
    }
    res.status(500).json({ error: "Gagal menambahkan siswa" });
  }
};

// Get student detail by ID
const getStudentDetail = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await prisma.user.findUnique({
      where: {
        id: parseInt(studentId),
        role: "siswa",
      },
      include: {
        student: {
          include: {
            classroom: {
              select: {
                id: true,
                namaKelas: true,
                kodeKelas: true,
              },
            },
            angkatan: {
              select: {
                id: true,
                tahun: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const formattedStudent = {
      id: student.id,
      nama: student.name,
      email: student.email,
      nisn: student.student?.nisn || null,
      kelas: student.student?.classroom
        ? `${student.student.classroom.namaKelas} ${student.student.classroom.kodeKelas}`
        : null,
      classroomId: student.student?.classroom?.id || null,
      gender: student.student?.gender || null,
      noHp: student.student?.noHp || null,
      alamat: student.student?.alamat || null,
      tempatLahir: student.student?.tempatLahir || null,
      tglLahir: student.student?.tglLahir || null,
      angkatan: student.student?.angkatan
        ? {
            id: student.student.angkatan.id,
            tahun: student.student.angkatan.tahun,
          }
        : null,
    };

    res.json({
      success: true,
      data: formattedStudent,
    });
  } catch (err) {
    console.error("Error getting student detail:", err);
    res.status(500).json({ error: "Failed to fetch student detail" });
  }
};

// Update student data
const updateStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const {
      nisn,
      name,
      email,
      gender,
      tempatLahir,
      tglLahir,
      alamat,
      noHp,
      classroomId,
      angkatanId,
    } = req.body;

    // Check if student exists
    const existingStudent = await prisma.user.findUnique({
      where: {
        id: parseInt(studentId),
        role: "siswa",
      },
      include: {
        student: true,
      },
    });

    if (!existingStudent) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Check if NISN is already taken by another student
    if (nisn && nisn !== existingStudent.student?.nisn) {
      const existingNISN = await prisma.student.findFirst({
        where: {
          nisn: nisn,
          userId: {
            not: parseInt(studentId),
          },
        },
      });

      if (existingNISN) {
        return res.status(400).json({ error: "NISN already exists" });
      }
    }

    // Check if email is already taken by another user
    if (email && email !== existingStudent.email) {
      const existingEmail = await prisma.user.findFirst({
        where: {
          email: email,
          id: {
            not: parseInt(studentId),
          },
        },
      });

      if (existingEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }
    }

    // Update user data
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(studentId) },
      data: {
        name: name || existingStudent.name,
        email: email || existingStudent.email,
      },
    });

    // Update student data
    const updatedStudent = await prisma.student.update({
      where: { userId: parseInt(studentId) },
      data: {
        nisn: nisn || existingStudent.student?.nisn,
        gender: gender || existingStudent.student?.gender,
        tempatLahir: tempatLahir || existingStudent.student?.tempatLahir,
        tglLahir: tglLahir
          ? new Date(tglLahir)
          : existingStudent.student?.tglLahir,
        alamat: alamat || existingStudent.student?.alamat,
        noHp: noHp || existingStudent.student?.noHp,
        classroomId: classroomId
          ? parseInt(classroomId)
          : existingStudent.student?.classroomId,
        angkatanId: angkatanId
          ? parseInt(angkatanId)
          : existingStudent.student?.angkatanId,
      },
    });

    // Fetch updated student with relations
    const studentWithRelations = await prisma.user.findUnique({
      where: { id: parseInt(studentId) },
      include: {
        student: {
          include: {
            classroom: {
              select: {
                id: true,
                namaKelas: true,
                kodeKelas: true,
              },
            },
            angkatan: {
              select: {
                id: true,
                tahun: true,
              },
            },
          },
        },
      },
    });

    const formattedStudent = {
      id: studentWithRelations.id,
      nama: studentWithRelations.name,
      email: studentWithRelations.email,
      nisn: studentWithRelations.student?.nisn || null,
      kelas: studentWithRelations.student?.classroom
        ? `${studentWithRelations.student.classroom.namaKelas} ${studentWithRelations.student.classroom.kodeKelas}`
        : null,
      classroomId: studentWithRelations.student?.classroom?.id || null,
      gender: studentWithRelations.student?.gender || null,
      noHp: studentWithRelations.student?.noHp || null,
      alamat: studentWithRelations.student?.alamat || null,
      tempatLahir: studentWithRelations.student?.tempatLahir || null,
      tglLahir: studentWithRelations.student?.tglLahir || null,
      angkatan: studentWithRelations.student?.angkatan
        ? {
            id: studentWithRelations.student.angkatan.id,
            tahun: studentWithRelations.student.angkatan.tahun,
          }
        : null,
    };

    res.json({
      success: true,
      message: "Student updated successfully",
      data: formattedStudent,
    });
  } catch (err) {
    console.error("Error updating student:", err);
    res.status(500).json({ error: "Failed to update student" });
  }
};

// Delete student
const deleteStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Check if student exists
    const existingStudent = await prisma.user.findUnique({
      where: {
        id: parseInt(studentId),
        role: "siswa",
      },
      include: {
        student: true,
      },
    });

    if (!existingStudent) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Check if student has violations or achievements
    const [violations, achievements] = await Promise.all([
      prisma.studentReport.count({
        where: {
          studentId: existingStudent.student.id,
          tipe: "violation",
        },
      }),
      prisma.studentReport.count({
        where: {
          studentId: existingStudent.student.id,
          tipe: "achievement",
        },
      }),
    ]);

    if (violations > 0 || achievements > 0) {
      return res.status(400).json({
        error:
          "Cannot delete student with existing violations or achievements. Please remove them first.",
      });
    }

    // Delete related notifications first
    await prisma.notification.deleteMany({
      where: { studentId: existingStudent.student.id },
    });

    // Delete student record first (due to foreign key constraint)
    await prisma.student.delete({
      where: { id: existingStudent.student.id },
    });

    // Delete user record
    await prisma.user.delete({
      where: { id: parseInt(studentId) },
    });

    res.json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting student:", err);
    if (err.code === "P2003") {
      res.status(400).json({
        error:
          "Cannot delete student due to existing references in other records",
      });
    } else {
      res.status(500).json({ error: "Failed to delete student" });
    }
  }
};

module.exports = {
  getAllClassrooms,
  getAllStudents,
  getStudentsByClassroom,
  getStudentDetail,
  createStudent,
  updateStudent,
  deleteStudent,
};
