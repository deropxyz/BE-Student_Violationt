const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Generate kenaikan kelas
const generateKenaikanKelas = async (req, res) => {
  const { tahunAjaran, deskripsi } = req.body;

  try {
    // Get all active students
    const students = await prisma.student.findMany({
      where: { isArchived: false },
      include: {
        classroom: true,
        angkatan: true,
      },
    });

    let sukses = 0;
    let gagal = 0;

    // Logic for promotion (example: students with total score < 300 can be promoted)
    for (const student of students) {
      if (student.totalScore < 300) {
        // Promote student (this is where you'd implement your promotion logic)
        sukses++;
      } else {
        // Student needs special handling
        gagal++;
      }
    }

    // Create kenaikan kelas record
    const kenaikanKelas = await prisma.kenaikanKelas.create({
      data: {
        tahunAjaran,
        deskripsi,
        totalSiswa: students.length,
        sukses,
        gagal,
      },
    });

    res.status(201).json({
      message: "Kenaikan kelas berhasil diproses",
      data: kenaikanKelas,
      detail: {
        totalSiswa: students.length,
        sukses,
        gagal,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal memproses kenaikan kelas" });
  }
};

// Get all kenaikan kelas records
const getAllKenaikanKelas = async (req, res) => {
  try {
    const records = await prisma.kenaikanKelas.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil data kenaikan kelas" });
  }
};

// Get kenaikan kelas detail
const getKenaikanKelasDetail = async (req, res) => {
  const { id } = req.params;
  try {
    const record = await prisma.kenaikanKelas.findUnique({
      where: { id: parseInt(id) },
    });

    if (!record) {
      return res
        .status(404)
        .json({ error: "Data kenaikan kelas tidak ditemukan" });
    }

    res.json(record);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil detail kenaikan kelas" });
  }
};

module.exports = {
  generateKenaikanKelas,
  getAllKenaikanKelas,
  getKenaikanKelasDetail,
};
