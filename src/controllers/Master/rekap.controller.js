// Ambil semua tahun ajaran (aktif & nonaktif)
const getTahunAjaran = async (req, res) => {
  try {
    const tahunAjaranList = await prisma.tahunAjaran.findMany({
      orderBy: { id: "desc" },
    });
    // Tambahkan properti nama untuk kemudahan frontend
    const tahunAjaranListWithNama = tahunAjaranList.map((t) => ({
      ...t,
      nama: t.tahunAjaran,
    }));
    res.json(tahunAjaranListWithNama);
  } catch (err) {
    console.error("Error getTahunAjaran:", err);
    res.status(500).json({ error: "Gagal mengambil tahun ajaran" });
  }
};
// Rekap laporan per siswa berdasarkan tahun ajaran dan kelas (opsional)
const getRekapPerSiswa = async (req, res) => {
  try {
    const tahunAjaranId = Number(req.query.tahunAjaranId);
    const classroomId = req.query.classroomId
      ? Number(req.query.classroomId)
      : undefined;
    if (!tahunAjaranId) {
      return res.status(400).json({ error: "tahunAjaranId wajib diisi" });
    }
    // Ambil semua siswa (filter kelas jika ada)
    const siswaList = await prisma.student.findMany({
      where: classroomId ? { classroomId } : {},
      select: {
        id: true,
        nisn: true,
        user: { select: { name: true } },
        classroom: { select: { namaKelas: true } },
        scoreHistory: {
          where: { tanggal: { gte: new Date("2000-01-01") } }, // ambil semua, filter manual
          select: {
            pointBaru: true,
            tanggal: true,
            alasan: true,
            createdAt: true,
          },
        },
        totalScore: true,
      },
    });
    // Ambil semua laporan pada tahun ajaran tsb
    const laporan = await prisma.studentReport.findMany({
      where: { tahunAjaranId },
      include: { item: true, student: { select: { id: true } } },
    });
    // Rekap per siswa
    const rekap = siswaList.map((siswa) => {
      const laporanSiswa = laporan.filter((lap) => lap.student.id === siswa.id);
      const totalLaporan = laporanSiswa.length;
      const totalPelanggaran = laporanSiswa.filter(
        (lap) => lap.item.tipe === "pelanggaran"
      ).length;
      const totalPrestasi = laporanSiswa.filter(
        (lap) => lap.item.tipe === "prestasi"
      ).length;
      // Ambil score terakhir di tahun ajaran tsb (jika ada scoreHistory di tahun ajaran itu)
      let totalScore = siswa.totalScore;
      // Jika ada scoreHistory, cari yang tanggalnya dalam range tahun ajaran
      // (butuh info tahun ajaran, misal tanggalMulai dan tanggalSelesai)
      // Untuk sekarang, fallback ke totalScore
      return {
        siswaId: siswa.id,
        nama: siswa.user.name,
        nisn: siswa.nisn,
        kelas: siswa.classroom?.namaKelas || "-",
        totalScore,
        totalLaporan,
        totalPelanggaran,
        totalPrestasi,
      };
    });
    res.json(rekap);
  } catch (err) {
    console.error("Error getRekapPerSiswa:", err);
    res.status(500).json({ error: "Gagal mengambil rekap per siswa" });
  }
};
// Rekap laporan per kelas berdasarkan tahun ajaran
const getRekapPerKelas = async (req, res) => {
  try {
    const tahunAjaranId = Number(req.query.tahunAjaranId);
    if (!tahunAjaranId) {
      return res.status(400).json({ error: "tahunAjaranId wajib diisi" });
    }
    // Ambil semua kelas
    const kelasList = await prisma.classroom.findMany({
      select: {
        id: true,
        namaKelas: true,
        students: { select: { id: true } },
      },
    });
    // Ambil semua laporan pada tahun ajaran tsb
    const laporan = await prisma.studentReport.findMany({
      where: { tahunAjaranId },
      include: {
        item: true,
        student: { select: { classroomId: true } },
      },
    });
    // Rekap per kelas
    const rekap = kelasList.map((kelas) => {
      const laporanKelas = laporan.filter(
        (lap) => lap.student.classroomId === kelas.id
      );
      const totalLaporan = laporanKelas.length;
      const totalPelanggaran = laporanKelas.filter(
        (lap) => lap.item.tipe === "pelanggaran"
      ).length;
      const totalPrestasi = laporanKelas.filter(
        (lap) => lap.item.tipe === "prestasi"
      ).length;
      const totalSiswa = kelas.students.length;
      return {
        kelasId: kelas.id,
        namaKelas: kelas.namaKelas,
        totalSiswa,
        totalLaporan,
        totalPelanggaran,
        totalPrestasi,
      };
    });
    res.json(rekap);
  } catch (err) {
    console.error("Error getRekapPerKelas:", err);
    res.status(500).json({ error: "Gagal mengambil rekap per kelas" });
  }
};
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Ambil daftar tahun ajaran nonaktif
const getTahunAjaranNonAktif = async (req, res) => {
  try {
    const tahunAjaranList = await prisma.tahunAjaran.findMany({
      where: { isActive: false },
      orderBy: { id: "desc" },
    });
    // Tambahkan properti nama untuk kemudahan frontend
    const tahunAjaranListWithNama = tahunAjaranList.map((t) => ({
      ...t,
      nama: t.tahunAjaran,
    }));
    res.json(tahunAjaranListWithNama);
  } catch (err) {
    console.error("Error getTahunAjaranNonAktif:", err);
    res.status(500).json({ error: "Gagal mengambil tahun ajaran nonaktif" });
  }
};

// Rekap histori laporan berdasarkan id tahun ajaran dipilih
const getLaporanHistori = async (req, res) => {
  try {
    let tahunAjaranIds = req.query.tahunAjaranId || req.body?.tahunAjaranId;
    if (!tahunAjaranIds) {
      return res
        .status(400)
        .json({ error: "tahunAjaranId harus diisi (array atau satu id)" });
    }
    if (!Array.isArray(tahunAjaranIds)) tahunAjaranIds = [tahunAjaranIds];
    const tahunAjaranList = await prisma.tahunAjaran.findMany({
      where: { id: { in: tahunAjaranIds.map(Number) } },
      select: { id: true, tahunAjaran: true },
    });
    const tahunIds = tahunAjaranList.map((t) => t.id);
    const totalTahunAjaran = tahunIds.length;
    const tahunAjaranDipilih = tahunAjaranList;
    if (totalTahunAjaran === 0) {
      return res.json({
        totalTahunAjaran: 0,
        totalLaporan: 0,
        totalPelanggaran: 0,
        totalPrestasi: 0,
        tahunAjaranDipilih: [],
      });
    }
    const laporan = await prisma.studentReport.findMany({
      where: { tahunAjaranId: { in: tahunIds } },
      include: { item: true },
    });
    let totalLaporan = laporan.length;
    let totalPelanggaran = 0;
    let totalPrestasi = 0;
    laporan.forEach((lap) => {
      if (lap.item.tipe === "pelanggaran") totalPelanggaran++;
      if (lap.item.tipe === "prestasi") totalPrestasi++;
    });
    return res.json({
      totalTahunAjaran,
      totalLaporan,
      totalPelanggaran,
      totalPrestasi,
      tahunAjaranDipilih,
    });
  } catch (err) {
    console.error("Error getLaporanHistori:", err);
    res.status(500).json({ error: "Gagal mengambil histori laporan" });
  }
};

module.exports = {
  getTahunAjaranNonAktif,
  getTahunAjaran,
  getLaporanHistori,
  getRekapPerKelas,
  getRekapPerSiswa,
};
