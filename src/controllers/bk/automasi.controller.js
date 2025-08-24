const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ============= SISTEM OTOMATISASI SURAT PERINGATAN =============
// Create konfigurasi automasi
const createAutomasiConfig = async (req, res) => {
  try {
    const {
      nama,
      threshold,
      jenisSurat,
      tingkat,
      judulTemplate,
      isiTemplate,
      isActive,
    } = req.body;
    const config = await prisma.automasiConfig.create({
      data: {
        nama,
        threshold: parseInt(threshold),
        jenisSurat,
        tingkat: tingkat ? parseInt(tingkat) : 1,
        judulTemplate,
        isiTemplate,
        isActive: isActive !== undefined ? isActive : true,
      },
    });
    res.json({ success: true, config });
  } catch (error) {
    console.error("Error create automasi config:", error);
    res.status(500).json({ error: "Gagal membuat konfigurasi automasi" });
  }
};

// Delete konfigurasi automasi
const deleteAutomasiConfig = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.automasiConfig.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error delete automasi config:", error);
    res.status(500).json({ error: "Gagal menghapus konfigurasi automasi" });
  }
};

// Fungsi untuk cek dan trigger surat peringatan otomatis
const checkAndTriggerSuratPeringatan = async (
  studentId,
  newTotalScore,
  oldTotalScore = null
) => {
  try {
    // Ambil konfigurasi automasi yang aktif
    const configs = await prisma.automasiConfig.findMany({
      where: { isActive: true },
      orderBy: { threshold: "desc" }, // Urutkan dari threshold tertinggi ke terendah
    });

    // Cek apakah score melewati threshold tertentu
    for (const config of configs) {
      const melewatiThreshold =
        newTotalScore <= config.threshold &&
        (oldTotalScore === null || oldTotalScore > config.threshold);

      if (melewatiThreshold) {
        // Cek apakah surat jenis ini sudah pernah dikirim untuk threshold ini
        const existingSurat = await prisma.suratPeringatan.findFirst({
          where: {
            studentId: parseInt(studentId),
            jenisSurat: config.jenisSurat,
            totalScoreSaat: { lte: config.threshold },
          },
        });

        if (!existingSurat) {
          await createSuratPeringatan(studentId, config, newTotalScore);
        }
      }
    }
  } catch (error) {
    console.error("Error checking surat peringatan:", error);
  }
};

// Fungsi untuk membuat surat peringatan
const createSuratPeringatan = async (studentId, config, totalScore) => {
  try {
    // Ambil data siswa lengkap
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
      include: {
        user: { select: { name: true, email: true } },
        classroom: { select: { namaKelas: true } },
        orangTua: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (!student) return;

    // Generate isi surat dengan template
    const isiSurat = generateIsiSurat(student, config, totalScore);

    // Tentukan email dan nomor HP yang akan dikirim
    let emailSiswa = student.user.email;
    let emailOrtu = student.orangTua?.user?.email;
    let nomorHpOrtu = student.orangTua?.noHp;

    // Buat record surat peringatan
    const suratPeringatan = await prisma.suratPeringatan.create({
      data: {
        studentId: parseInt(studentId),
        jenisSurat: config.jenisSurat,
        tingkatSurat: config.tingkat,
        totalScoreSaat: totalScore,
        judul: config.judulTemplate.replace("{NAMA_SISWA}", student.user.name),
        isiSurat,
        emailSiswa,
        emailOrtu,
        nomorHpOrtu,
        statusKirim: "pending",
      },
    });

    // Buat notifikasi untuk siswa
    await prisma.notification.create({
      data: {
        studentId: parseInt(studentId),
        judul: `Surat Peringatan ${config.jenisSurat}`,
        pesan: `Anda menerima ${config.nama} karena total poin pelanggaran mencapai ${totalScore}. Silakan perbaiki perilaku Anda.`,
      },
    });

    console.log(
      `Surat peringatan ${config.jenisSurat} dibuat untuk siswa ${student.user.name} (Score: ${totalScore})`
    );

    return suratPeringatan;
  } catch (error) {
    console.error("Error creating surat peringatan:", error);
    throw error;
  }
};

// Fungsi untuk generate isi surat
const generateIsiSurat = (student, config, totalScore) => {
  const tanggal = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let isiSurat = config.isiTemplate;

  // Replace placeholder dengan data siswa
  isiSurat = isiSurat.replace(/{TANGGAL}/g, tanggal);
  isiSurat = isiSurat.replace(/{NAMA_SISWA}/g, student.user.name);
  isiSurat = isiSurat.replace(/{NISN}/g, student.nisn);
  isiSurat = isiSurat.replace(/{KELAS}/g, student.classroom?.namaKelas || "-");
  isiSurat = isiSurat.replace(/{TOTAL_SCORE}/g, totalScore);
  isiSurat = isiSurat.replace(
    /{NAMA_ORTU}/g,
    student.orangTua?.user?.name || "Orang Tua/Wali"
  );

  return isiSurat;
};

// ============= API ENDPOINTS =============

// Get konfigurasi automasi
const getAutomasiConfig = async (req, res) => {
  try {
    const configs = await prisma.automasiConfig.findMany({
      orderBy: { threshold: "asc" },
    });

    res.json({ data: configs });
  } catch (error) {
    console.error("Error get automasi config:", error);
    res.status(500).json({ error: "Gagal mengambil konfigurasi automasi" });
  }
};

// Update konfigurasi automasi
const updateAutomasiConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nama,
      threshold,
      jenisSurat,
      tingkat,
      judulTemplate,
      isiTemplate,
      isActive,
    } = req.body;

    const config = await prisma.automasiConfig.update({
      where: { id: parseInt(id) },
      data: {
        nama,
        threshold: threshold ? parseInt(threshold) : undefined,
        jenisSurat: jenisSurat || undefined,
        tingkat: tingkat ? parseInt(tingkat) : 1,
        judulTemplate,
        isiTemplate,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    res.json({ success: true, config });
  } catch (error) {
    console.error("Error update automasi config:", error);
    res.status(500).json({ error: "Gagal update konfigurasi automasi" });
  }
};

// Get history surat peringatan
const getHistorySuratPeringatan = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      studentId,
      nisn,
      jenisSurat,
      statusKirim,
    } = req.query;
    const skip = (page - 1) * limit;

    const where = {};

    // Support pencarian berdasarkan studentId atau nisn
    if (studentId) {
      where.studentId = parseInt(studentId);
    } else if (nisn) {
      // Jika menggunakan nisn, kita perlu join dengan tabel student
      where.student = {
        nisn: nisn,
      };
    }

    if (jenisSurat) where.jenisSurat = jenisSurat;
    if (statusKirim) where.statusKirim = statusKirim;

    const [suratList, total] = await Promise.all([
      prisma.suratPeringatan.findMany({
        where,
        include: {
          student: {
            include: {
              user: { select: { name: true } },
              classroom: { select: { namaKelas: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.suratPeringatan.count({ where }),
    ]);

    const formattedData = suratList.map((surat) => ({
      id: surat.id,
      student: {
        nama: surat.student.user.name,
        nisn: surat.student.nisn,
        kelas: surat.student.classroom?.namaKelas,
      },
      jenisSurat: surat.jenisSurat,
      tingkatSurat: surat.tingkatSurat,
      totalScoreSaat: surat.totalScoreSaat,
      judul: surat.judul,
      statusKirim: surat.statusKirim,
      tanggalKirim: surat.tanggalKirim,
      createdAt: surat.createdAt,
    }));

    res.json({
      data: formattedData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error get history surat:", error);
    res.status(500).json({ error: "Gagal mengambil history surat peringatan" });
  }
};

// Get detail surat peringatan
const getDetailSuratPeringatan = async (req, res) => {
  try {
    const { id } = req.params;

    const surat = await prisma.suratPeringatan.findUnique({
      where: { id: parseInt(id) },
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } },
            classroom: { select: { namaKelas: true } },
            orangTua: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
          },
        },
      },
    });

    if (!surat) {
      return res
        .status(404)
        .json({ error: "Surat peringatan tidak ditemukan" });
    }

    res.json({ data: surat });
  } catch (error) {
    console.error("Error get detail surat:", error);
    res.status(500).json({ error: "Gagal mengambil detail surat peringatan" });
  }
};

// Manual trigger surat peringatan
const manualTriggerSurat = async (req, res) => {
  try {
    const { studentId, configId } = req.body;

    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
    });

    const config = await prisma.automasiConfig.findUnique({
      where: { id: parseInt(configId) },
    });

    if (!student || !config) {
      return res
        .status(404)
        .json({ error: "Siswa atau konfigurasi tidak ditemukan" });
    }

    const surat = await createSuratPeringatan(
      studentId,
      config,
      student.totalScore
    );

    res.json({ success: true, surat });
  } catch (error) {
    console.error("Error manual trigger surat:", error);
    res.status(500).json({ error: "Gagal membuat surat peringatan manual" });
  }
};

// Update status kirim surat
const updateStatusKirimSurat = async (req, res) => {
  try {
    const { id } = req.params;
    const { statusKirim } = req.body;

    const surat = await prisma.suratPeringatan.update({
      where: { id: parseInt(id) },
      data: {
        statusKirim,
        tanggalKirim: statusKirim === "sent" ? new Date() : null,
      },
    });

    res.json({ success: true, surat });
  } catch (error) {
    console.error("Error update status kirim:", error);
    res.status(500).json({ error: "Gagal update status kirim surat" });
  }
};

module.exports = {
  checkAndTriggerSuratPeringatan,
  createSuratPeringatan,
  getAutomasiConfig,
  updateAutomasiConfig,
  createAutomasiConfig,
  deleteAutomasiConfig,
  getHistorySuratPeringatan,
  getDetailSuratPeringatan,
  manualTriggerSurat,
  updateStatusKirimSurat,
};
