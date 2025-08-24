const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Search students by NISN or name (across all classes, active year only)
const searchStudents = async (req, res) => {
  const { q } = req.query;
  try {
    const students = await prisma.student.findMany({
      where: {
        OR: [
          { nisn: { contains: q || "", mode: "insensitive" } },
          { user: { name: { contains: q || "", mode: "insensitive" } } },
        ],
        isArchived: false,
      },
      include: {
        user: { select: { name: true } },
        classroom: { select: { namaKelas: true, kodeKelas: true } },
      },
      orderBy: { nisn: "asc" },
      take: 20,
    });
    const data = students.map((siswa) => ({
      nisn: siswa.nisn,
      nama: siswa.user?.name,
      kelas: siswa.classroom?.namaKelas || "-",
      kodeKelas: siswa.classroom?.kodeKelas || "-",
    }));
    res.json({ data });
  } catch (err) {
    console.error("Error searching students:", err);
    res.status(500).json({ error: "Failed to search students" });
  }
};

const getClassroomWithReports = async (req, res) => {
  try {
    // Ambil tahun ajaran aktif

    const classrooms = await prisma.classroom.findMany({
      include: {
        students: {
          include: {
            reports: {
              include: { item: true },
            },
          },
        },
      },
      orderBy: { namaKelas: "asc" },
    });

    const data = classrooms.map((kelas) => {
      const jmlSiswa = kelas.students.length;
      let jmlPelanggaran = 0;
      let jmlPrestasi = 0;
      let totalPoint = 0;

      kelas.students.forEach((siswa) => {
        siswa.reports.forEach((report) => {
          if (report.item.tipe === "pelanggaran") {
            jmlPelanggaran++;
            totalPoint -= report.pointSaat || 0;
          } else if (report.item.tipe === "prestasi") {
            jmlPrestasi++;
            totalPoint += report.pointSaat || 0;
          }
        });
      });

      const avrgPoint = jmlSiswa > 0 ? Math.round(totalPoint / jmlSiswa) : 0;

      return {
        id: kelas.id,
        kodeKelas: kelas.kodeKelas,
        namaKelas: kelas.namaKelas,
        jmlSiswa,
        jmlPelanggaran,
        jmlPrestasi,
        avrgPoint,
      };
    });

    res.json({ data });
  } catch (err) {
    console.error("Error getting classroom violation stats:", err);
    res.status(500).json({ error: "Failed to fetch classroom stats" });
  }
};

// Ambil data siswa dalam kelas tertentu (berdasarkan tahun ajaran yang dipilih atau aktif)
const getStudents = async (req, res) => {
  const { classroomId } = req.params;
  const { tahunAjaranId } = req.query;
  try {
    // Ambil semua siswa di kelas tersebut
    const students = await prisma.student.findMany({
      where: { classroomId: parseInt(classroomId) },
      include: {
        user: { select: { name: true } },
        reports: {
          where:
            tahunAjaranId && tahunAjaranId !== "all"
              ? { tahunAjaranId: parseInt(tahunAjaranId) }
              : {},
          include: { item: true },
        },
      },
      orderBy: { nisn: "asc" },
    });

    const data = students.map((siswa) => {
      let pelanggaran = 0;
      let prestasi = 0;
      let totalScore = 0;
      siswa.reports.forEach((report) => {
        if (report.item.tipe === "pelanggaran") {
          pelanggaran++;
          totalScore -= report.pointSaat || 0;
        } else if (report.item.tipe === "prestasi") {
          prestasi++;
          totalScore += report.pointSaat || 0;
        }
      });
      return {
        nisn: siswa.nisn,
        nama: siswa.user?.name,
        pelanggaran,
        prestasi,
        totalScore,
      };
    });

    res.json({ data });
  } catch (err) {
    console.error("Error getting students in classroom:", err);
    res.status(500).json({ error: "Failed to fetch students in classroom" });
  }
};

// Ambil detail siswa untuk monitoring BK
const getStudentDetailBK = async (req, res) => {
  const { nisn } = req.params;
  const { tahunAjaranId } = req.query;
  try {
    // Ambil data siswa berdasarkan NISN
    const student = await prisma.student.findUnique({
      where: { nisn },
      include: {
        user: { select: { name: true } },
        classroom: { select: { kodeKelas: true } },
        angkatan: { select: { tahun: true } },
        reports: {
          where:
            tahunAjaranId && tahunAjaranId !== "all"
              ? { tahunAjaranId: parseInt(tahunAjaranId) }
              : {},
          include: {
            item: true,
            reporter: { select: { name: true, role: true } },
            bukti: true,
            tahunAjaran: { select: { tahunAjaran: true } },
          },
          orderBy: { tanggal: "desc" },
        },
      },
    });
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Hitung total pelanggaran, prestasi, dan score
    let totalPelanggaran = 0;
    let totalPrestasi = 0;
    let subtotalScore = 0;
    student.reports.forEach((report) => {
      if (report.item.tipe === "pelanggaran") {
        totalPelanggaran++;
        subtotalScore -= report.pointSaat || 0;
      } else if (report.item.tipe === "prestasi") {
        totalPrestasi++;
        subtotalScore += report.pointSaat || 0;
      }
    });

    // Format laporan siswa
    const laporan = student.reports.map((report) => ({
      id: report.id,
      tahunAjaran: report.tahunAjaran?.tahunAjaran || null,
      namaTahunAjaran: report.tahunAjaran?.tahunAjaran || null,
      tanggal: report.tanggal,
      tipe: report.item.tipe,
      namaItem: report.item.nama,
      kategori: report.item.kategoriId, // bisa di-join jika perlu nama kategori
      point: report.pointSaat,
      deskripsi: report.deskripsi,
      reporter: report.reporter,
      bukti: report.bukti,
      kelasSaatLaporan: report.classAtTime,
    }));

    res.json({
      siswa: {
        nisn: student.nisn,
        nama: student.user?.name,
        kelas: student.classroom?.kodeKelas,
        angkatan: student.angkatan?.tahun,
        totalPelanggaran,
        totalPrestasi,
        subtotalScore,
        totalScore: student.totalScore,
      },
      laporan,
    });
  } catch (err) {
    console.error("Error getting student detail for BK:", err);
    res.status(500).json({ error: "Failed to fetch student detail" });
  }
};

module.exports = {
  getClassroomWithReports,
  getStudents,
  getStudentDetailBK,
  searchStudents,
};
