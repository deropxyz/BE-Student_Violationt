const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Manage Master Data - Superadmin Functions
const getAllClassrooms = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [classrooms, total] = await Promise.all([
      prisma.classroom.findMany({
        include: {
          waliKelas: {
            select: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              students: true,
            },
          },
        },
        orderBy: { namaKelas: "asc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.classroom.count(),
    ]);

    const formattedClassrooms = classrooms.map((c) => ({
      id: c.id,
      kodeKelas: c.kodeKelas,
      namaKelas: c.namaKelas,
      waliKelas: c.waliKelas?.user?.name || null,
      jumlahSiswa: c._count.students,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    res.json({
      data: formattedClassrooms,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Error getting classrooms:", err);
    res.status(500).json({ error: "Failed to fetch classrooms" });
  }
};

// Get classroom detail by ID
const getClassroomById = async (req, res) => {
  try {
    const { id } = req.params;

    const classroom = await prisma.classroom.findUnique({
      where: { id: parseInt(id) },
      include: {
        waliKelas: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            nip: true,
          },
        },
        students: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            nisn: true,
            gender: true,
            totalScore: true,
          },
          orderBy: {
            user: {
              name: "asc",
            },
          },
        },
        _count: {
          select: {
            students: true,
          },
        },
      },
    });

    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    const formattedClassroom = {
      id: classroom.id,
      kodeKelas: classroom.kodeKelas,
      namaKelas: classroom.namaKelas,
      waliKelas: classroom.waliKelas?.user?.name || null,
      waliKelasId: classroom.waliKelasId || null,
      waliKelasEmail: classroom.waliKelas?.user?.email || null,
      waliKelasNIP: classroom.waliKelas?.nip || null,
      jumlahSiswa: classroom._count.students,
      students: classroom.students.map((student) => ({
        id: student.id,
        nama: student.user.name,
        email: student.user.email,
        nisn: student.nisn,
        gender: student.gender,
        totalScore: student.totalScore,
      })),
      createdAt: classroom.createdAt,
      updatedAt: classroom.updatedAt,
    };

    res.json({
      success: true,
      data: formattedClassroom,
    });
  } catch (err) {
    console.error("Error getting classroom detail:", err);
    res.status(500).json({ error: "Failed to fetch classroom detail" });
  }
};

const createClassroom = async (req, res) => {
  try {
    const { kodeKelas, namaKelas, waliKelasId } = req.body;

    console.log("Create classroom request:", {
      kodeKelas,
      namaKelas,
      waliKelasId,
      waliKelasIdType: typeof waliKelasId,
    });

    // Check if classroom code already exists
    if (kodeKelas) {
      const existingKode = await prisma.classroom.findUnique({
        where: { kodeKelas },
      });

      if (existingKode) {
        return res.status(400).json({ error: "Classroom code already exists" });
      }
    }

    // Check if classroom name already exists
    if (namaKelas) {
      const existingNama = await prisma.classroom.findFirst({
        where: { namaKelas },
      });

      if (existingNama) {
        return res.status(400).json({ error: "Classroom name already exists" });
      }
    }

    // Check if wali kelas exists and is already assigned (only if waliKelasId is provided)
    if (waliKelasId && waliKelasId !== "") {
      // First check if the teacher exists
      const teacherExists = await prisma.teacher.findUnique({
        where: { id: parseInt(waliKelasId) },
      });

      if (!teacherExists) {
        return res.status(400).json({ error: "Teacher not found" });
      }

      // Then check if already assigned as wali kelas
      const existingWali = await prisma.classroom.findFirst({
        where: { waliKelasId: parseInt(waliKelasId) },
      });

      if (existingWali) {
        return res
          .status(400)
          .json({ error: "This teacher is already assigned as wali kelas" });
      }
    }

    const classroom = await prisma.classroom.create({
      data: {
        kodeKelas: kodeKelas || null,
        namaKelas: namaKelas || null,
        waliKelasId:
          waliKelasId && waliKelasId !== "" ? parseInt(waliKelasId) : null,
      },
      include: {
        waliKelas: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    console.log("Created classroom:", {
      id: classroom.id,
      waliKelasId: classroom.waliKelasId,
      waliKelasName: classroom.waliKelas?.user?.name,
    });

    res.status(201).json({
      id: classroom.id,
      kodeKelas: classroom.kodeKelas,
      namaKelas: classroom.namaKelas,
      waliKelas: classroom.waliKelas?.user?.name || null,
      waliKelasId: classroom.waliKelasId,
      jumlahSiswa: 0,
    });
  } catch (err) {
    console.error("Error creating classroom:", err);
    res.status(500).json({ error: "Failed to create classroom" });
  }
};

const updateClassroom = async (req, res) => {
  try {
    const { id } = req.params;
    const { kodeKelas, namaKelas, waliKelasId } = req.body;

    console.log("Update classroom request:", {
      id,
      kodeKelas,
      namaKelas,
      waliKelasId,
      waliKelasIdType: typeof waliKelasId,
    });

    // Check if classroom exists
    const existingClassroom = await prisma.classroom.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingClassroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    // Check if kode is being updated and already exists
    if (kodeKelas && kodeKelas !== existingClassroom.kodeKelas) {
      const kodeExists = await prisma.classroom.findUnique({
        where: { kodeKelas },
      });
      if (kodeExists) {
        return res.status(400).json({ error: "Classroom code already exists" });
      }
    }

    // Check if name is being updated and already exists
    if (namaKelas && namaKelas !== existingClassroom.namaKelas) {
      const nameExists = await prisma.classroom.findFirst({
        where: { namaKelas },
      });
      if (nameExists) {
        return res.status(400).json({ error: "Classroom name already exists" });
      }
    }

    // Check if wali kelas exists and is already assigned to another classroom
    if (
      waliKelasId &&
      waliKelasId !== "" &&
      waliKelasId !== existingClassroom.waliKelasId
    ) {
      // First check if the teacher exists
      const teacherExists = await prisma.teacher.findUnique({
        where: { id: parseInt(waliKelasId) },
      });

      if (!teacherExists) {
        return res.status(400).json({ error: "Teacher not found" });
      }

      // Then check if already assigned as wali kelas
      const existingWali = await prisma.classroom.findFirst({
        where: {
          waliKelasId: parseInt(waliKelasId),
          id: { not: parseInt(id) },
        },
      });

      if (existingWali) {
        return res
          .status(400)
          .json({ error: "This teacher is already assigned as wali kelas" });
      }
    }

    // Prepare update data
    const updateData = {};
    if (kodeKelas !== undefined) updateData.kodeKelas = kodeKelas;
    if (namaKelas !== undefined) updateData.namaKelas = namaKelas;

    // Handle wali kelas assignment - allow setting to null or empty string
    if (waliKelasId !== undefined) {
      updateData.waliKelasId =
        waliKelasId && waliKelasId !== "" ? parseInt(waliKelasId) : null;
    }

    const classroom = await prisma.classroom.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        waliKelas: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            nip: true,
          },
        },
        _count: {
          select: {
            students: true,
          },
        },
      },
    });

    console.log("Updated classroom:", {
      id: classroom.id,
      waliKelasId: classroom.waliKelasId,
      waliKelasName: classroom.waliKelas?.user?.name,
    });

    res.json({
      id: classroom.id,
      kodeKelas: classroom.kodeKelas,
      namaKelas: classroom.namaKelas,
      waliKelas: classroom.waliKelas?.user?.name || null,
      waliKelasId: classroom.waliKelasId,
      jumlahSiswa: classroom._count.students,
    });
  } catch (err) {
    console.error("Error updating classroom:", err);
    res.status(500).json({ error: "Failed to update classroom" });
  }
};

const deleteClassroom = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if classroom exists
    const classroom = await prisma.classroom.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            students: true,
          },
        },
      },
    });

    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    // Check if classroom has students
    if (classroom._count.students > 0) {
      return res.status(400).json({
        error:
          "Cannot delete classroom with students. Please move students first.",
      });
    }

    await prisma.classroom.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: "Classroom deleted successfully" });
  } catch (err) {
    console.error("Error deleting classroom:", err);
    res.status(500).json({ error: "Failed to delete classroom" });
  }
};

// Angkatan Management
const getAllAngkatan = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [angkatan, total] = await Promise.all([
      prisma.angkatan.findMany({
        include: {
          _count: {
            select: {
              students: true,
            },
          },
        },
        orderBy: { tahun: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.angkatan.count(),
    ]);

    const formattedAngkatan = angkatan.map((a) => ({
      id: a.id,
      tahun: a.tahun,
      status: a.status,
      jumlahSiswa: a._count.students,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));

    res.json({
      data: formattedAngkatan,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Error getting angkatan:", err);
    res.status(500).json({ error: "Failed to fetch angkatan" });
  }
};

// Get angkatan detail by ID
const getAngkatanById = async (req, res) => {
  try {
    const { id } = req.params;

    const angkatan = await prisma.angkatan.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            students: true,
          },
        },
      },
    });

    if (!angkatan) {
      return res.status(404).json({ error: "Angkatan not found" });
    }

    const formattedAngkatan = {
      id: angkatan.id,
      tahun: angkatan.tahun,
      status: angkatan.status,
      jumlahSiswa: angkatan._count.students,
      createdAt: angkatan.createdAt,
      updatedAt: angkatan.updatedAt,
    };

    res.json({
      success: true,
      data: formattedAngkatan,
    });
  } catch (err) {
    console.error("Error getting angkatan detail:", err);
    res.status(500).json({ error: "Failed to fetch angkatan detail" });
  }
};

const createAngkatan = async (req, res) => {
  try {
    const { tahun, status = "aktif" } = req.body;

    // Check if angkatan already exists
    const existingAngkatan = await prisma.angkatan.findUnique({
      where: { tahun },
    });

    if (existingAngkatan) {
      return res.status(400).json({ error: "Angkatan already exists" });
    }

    const angkatan = await prisma.angkatan.create({
      data: {
        tahun,
        status,
      },
    });

    res.status(201).json(angkatan);
  } catch (err) {
    console.error("Error creating angkatan:", err);
    res.status(500).json({ error: "Failed to create angkatan" });
  }
};

const updateAngkatan = async (req, res) => {
  try {
    const { id } = req.params;
    const { tahun, status } = req.body;

    // Check if angkatan exists
    const existingAngkatan = await prisma.angkatan.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingAngkatan) {
      return res.status(404).json({ error: "Angkatan not found" });
    }

    // Check if tahun is being updated and already exists
    if (tahun && tahun !== existingAngkatan.tahun) {
      const tahunExists = await prisma.angkatan.findUnique({
        where: { tahun },
      });
      if (tahunExists) {
        return res.status(400).json({ error: "Angkatan already exists" });
      }
    }

    // Prepare update data
    const updateData = {};
    if (tahun !== undefined) updateData.tahun = tahun;
    if (status !== undefined) updateData.status = status;

    const angkatan = await prisma.angkatan.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.json(angkatan);
  } catch (err) {
    console.error("Error updating angkatan:", err);
    res.status(500).json({ error: "Failed to update angkatan" });
  }
};

const deleteAngkatan = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if angkatan exists
    const angkatan = await prisma.angkatan.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            students: true,
          },
        },
      },
    });

    if (!angkatan) {
      return res.status(404).json({ error: "Angkatan not found" });
    }

    // Check if angkatan has students
    if (angkatan._count.students > 0) {
      return res.status(400).json({
        error:
          "Cannot delete angkatan with students. Please move students first.",
      });
    }

    await prisma.angkatan.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: "Angkatan deleted successfully" });
  } catch (err) {
    console.error("Error deleting angkatan:", err);
    res.status(500).json({ error: "Failed to delete angkatan" });
  }
};

// Get all teachers for dropdown
const getAllTeachers = async (req, res) => {
  try {
    const teachers = await prisma.teacher.findMany({
      select: {
        id: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        nip: true,
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    const formattedTeachers = teachers.map((teacher) => ({
      id: teacher.id,
      name: teacher.user.name,
      email: teacher.user.email,
      nip: teacher.nip,
    }));

    res.json({
      success: true,
      data: formattedTeachers,
    });
  } catch (err) {
    console.error("Error getting teachers:", err);
    res.status(500).json({ error: "Failed to fetch teachers" });
  }
};

module.exports = {
  // Classroom Management
  getAllClassrooms,
  getClassroomById,
  createClassroom,
  updateClassroom,
  deleteClassroom,

  // Teacher Management
  getAllTeachers,

  // Angkatan Management
  getAllAngkatan,
  getAngkatanById,
  createAngkatan,
  updateAngkatan,
  deleteAngkatan,
};
