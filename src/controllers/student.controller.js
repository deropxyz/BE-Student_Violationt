const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const XLSX = require("xlsx");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const getAllSiswa = async (req, res) => {
  // Ambil classroomId dari params jika ada, fallback ke query
  const classroomId = req.params.classroomId || req.query.classroomId;
  let filter = {};
  if (classroomId) {
    filter = { classroomId: parseInt(classroomId) };
  }
  try {
    const siswa = await prisma.student.findMany({
      where: filter,
      include: { user: true, classroom: true },
    });
    res.json(siswa);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil data siswa" });
  }
};

const createSiswa = async (req, res) => {
  const { nis, name, classroomId } = req.body;
  const email = `${nis}@smk14.sch.id`;
  const password = "smkn14garut";
  try {
    // Cek apakah NIS sudah ada
    const nisExist = await prisma.student.findUnique({
      where: { nis },
    });
    if (nisExist) {
      return res.status(400).json({ error: "NIS sudah ada" });
    }
    const user = await prisma.user.create({
      data: { name, email, password, role: "siswa" },
    });
    const student = await prisma.student.create({
      data: {
        userId: user.id,
        nis,
        class: "",
        classroomId: parseInt(classroomId),
      },
    });
    res.json(student);
  } catch (err) {
    // Handle error unik NIS dari Prisma
    if (err.code === "P2002" && err.meta?.target?.includes("nis")) {
      return res.status(400).json({ error: "NIS sudah ada" });
    }
    res.status(500).json({ error: "Gagal menambah siswa" });
  }
};

const updateSiswa = async (req, res) => {
  const { id } = req.params;
  const { nis, name, classroomId } = req.body;
  try {
    const student = await prisma.student.update({
      where: { id: parseInt(id) },
      data: {
        nis,
        classroomId: parseInt(classroomId),
      },
    });
    // Update nama user jika ada
    if (name) {
      await prisma.user.update({
        where: { id: student.userId },
        data: { name },
      });
    }
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: "Gagal update siswa" });
  }
};

const deleteSiswa = async (req, res) => {
  const { id } = req.params;
  try {
    const student = await prisma.student.delete({
      where: { id: parseInt(id) },
    });
    // Hapus user juga jika perlu
    await prisma.user.delete({ where: { id: student.userId } });
    res.json({ message: "Siswa dihapus" });
  } catch (err) {
    res.status(500).json({ error: "Gagal hapus siswa" });
  }
};

const importSiswa = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "File tidak ditemukan" });

  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const siswaList = XLSX.utils.sheet_to_json(sheet);

    for (const siswa of siswaList) {
      const { nis, name, kelas } = siswa;
      const email = `${nis}@smk14.sch.id`;
      const password = "smkn14garut";

      // Cari kelas berdasarkan nama
      let classroom = await prisma.classroom.findUnique({
        where: { name: kelas },
      });
      // Buat user dan student
      await prisma.user
        .create({
          data: { name, email, password, role: "siswa" },
        })
        .then(async (user) => {
          await prisma.student.create({
            data: {
              userId: user.id,
              nis,
              class: "",
              classroomId: classroom.id,
            },
          });
        });
    }
    res.json({ message: "Import siswa berhasil" });
  } catch (err) {
    res.status(500).json({ error: "Gagal import siswa" });
  }
};

// Ambil detail satu siswa berdasarkan ID
const getDetailSiswa = async (req, res) => {
  const { id } = req.params;
  try {
    const siswa = await prisma.student.findUnique({
      where: { id: parseInt(id) },
      include: { user: true, classroom: true },
    });
    if (!siswa) return res.status(404).json({ error: "Siswa tidak ditemukan" });
    res.json(siswa);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil detail siswa" });
  }
};

// Pencarian siswa berdasarkan nama atau NIS
const searchSiswa = async (req, res) => {
  const { q } = req.query;
  try {
    const siswa = await prisma.student.findMany({
      where: {
        OR: [
          { nis: { contains: q || "", mode: "insensitive" } },
          { user: { name: { contains: q || "", mode: "insensitive" } } },
        ],
      },
      include: { user: true, classroom: true },
    });
    res.json(siswa);
  } catch (err) {
    res.status(500).json({ error: "Gagal mencari siswa" });
  }
};

// Export data siswa ke Excel
const exportSiswa = async (req, res) => {
  try {
    const siswa = await prisma.student.findMany({
      include: { user: true, classroom: true },
    });
    const data = siswa.map((s) => ({
      Nama: s.user?.name,
      NIS: s.nis,
      Email: s.user?.email,
      Kelas: s.classroom?.name,
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Siswa");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", "attachment; filename=siswa.xlsx");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: "Gagal export data siswa" });
  }
};

module.exports = {
  getAllSiswa,
  createSiswa,
  updateSiswa,
  deleteSiswa,
  importSiswa,
  getDetailSiswa,
  searchSiswa,
  exportSiswa,
};
