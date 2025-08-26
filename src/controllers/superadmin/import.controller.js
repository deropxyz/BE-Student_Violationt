const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Contoh: import siswa dari array JSON di body
// Untuk import dari file (xlsx/csv), gunakan library seperti 'xlsx' atau 'csv-parse'
const importStudents = async (req, res) => {
  try {
    const { students } = req.body; // students: array of siswa
    if (!Array.isArray(students) || students.length === 0) {
      return res
        .status(400)
        .json({ error: "Data siswa kosong atau tidak valid" });
    }

    let successCount = 0;
    let failed = [];

    for (const s of students) {
      try {
        // Validasi minimal
        if (
          !s.nisn ||
          !s.name ||
          !s.gender ||
          !s.tempatLahir ||
          !s.tglLahir ||
          !s.alamat ||
          !s.angkatanTahun ||
          !s.kodeKelas
        ) {
          failed.push({
            nisn: s.nisn,
            reason:
              "Data wajib ada yang kosong (termasuk kodeKelas & angkatanTahun)",
          });
          continue;
        }
        // Cek NISN sudah ada
        const exist = await prisma.student.findUnique({
          where: { nisn: s.nisn },
        });
        if (exist) {
          failed.push({ nisn: s.nisn, reason: "NISN sudah terdaftar" });
          continue;
        }
        // Cari classroomId dari kodeKelas
        const classroom = await prisma.classroom.findUnique({
          where: { kodeKelas: s.kodeKelas },
        });
        if (!classroom) {
          failed.push({
            nisn: s.nisn,
            reason: `Kelas dengan kode ${s.kodeKelas} tidak ditemukan`,
          });
          continue;
        }
        // Cari angkatanId dari tahun
        const angkatan = await prisma.angkatan.findUnique({
          where: { tahun: s.angkatanTahun },
        });
        if (!angkatan) {
          failed.push({
            nisn: s.nisn,
            reason: `Angkatan dengan tahun ${s.angkatanTahun} tidak ditemukan`,
          });
          continue;
        }
        // Buat user
        const user = await prisma.user.create({
          data: {
            name: s.name,
            email: s.email || `${s.nisn}@mail.com`,
            password: s.password || process.env.DEFAULT_PASSWORD, // hash di real app
            role: "siswa",
          },
        });
        // Buat student
        await prisma.student.create({
          data: {
            userId: user.id,
            nisn: s.nisn,
            gender: s.gender,
            tempatLahir: s.tempatLahir,
            tglLahir: new Date(s.tglLahir),
            alamat: s.alamat,
            noHp: s.noHp || null,
            namaOrtu: s.namaOrtu || null,
            nohpOrtu: s.nohpOrtu || null,
            angkatanId: angkatan.id,
            classroomId: classroom.id,
          },
        });
        successCount++;
      } catch (err) {
        failed.push({ nisn: s.nisn, reason: err.message });
      }
    }
    res.json({
      success: true,
      imported: successCount,
      failed,
    });
  } catch (err) {
    console.error("Error importing students:", err);
    res.status(500).json({ error: "Gagal import data siswa" });
  }
};

const importTeachers = async (req, res) => {
  try {
    const { teachers } = req.body; // teachers: array of guru
    if (!Array.isArray(teachers) || teachers.length === 0) {
      return res
        .status(400)
        .json({ error: "Data guru kosong atau tidak valid" });
    }

    let successCount = 0;
    let failed = [];

    for (const t of teachers) {
      try {
        // Validasi minimal
        if (!t.nip || !t.name) {
          failed.push({ nip: t.nip, reason: "NIP/nama wajib diisi" });
          continue;
        }
        // Cek NIP sudah ada
        const exist = await prisma.teacher.findUnique({
          where: { nip: t.nip },
        });
        if (exist) {
          failed.push({ nip: t.nip, reason: "NIP sudah terdaftar" });
          continue;
        }
        // Buat user
        const user = await prisma.user.create({
          data: {
            name: t.name,
            email: t.email || `${t.nip}@mail.com`,
            password: t.password || "default123", // hash di real app
            role: "guru",
          },
        });
        // Buat teacher
        await prisma.teacher.create({
          data: {
            userId: user.id,
            nip: t.nip,
            noHp: t.noHp || null,
            alamat: t.alamat || null,
          },
        });
        successCount++;
      } catch (err) {
        failed.push({ nip: t.nip, reason: err.message });
      }
    }
    res.json({
      success: true,
      imported: successCount,
      failed,
    });
  } catch (err) {
    console.error("Error importing teachers:", err);
    res.status(500).json({ error: "Gagal import data guru" });
  }
};

const importViolations = async (req, res) => {
  try {
    const { violations } = req.body; // violations: array of pelanggaran
    if (!Array.isArray(violations) || violations.length === 0) {
      return res
        .status(400)
        .json({ error: "Data pelanggaran kosong atau tidak valid" });
    }

    let successCount = 0;
    let failed = [];

    for (const v of violations) {
      try {
        // Validasi minimal
        if (!v.nama || !v.kategoriNama || v.point === undefined) {
          failed.push({
            nama: v.nama,
            reason: "Nama/kategori/point wajib diisi (kategoriNama)",
          });
          continue;
        }
        // Cari kategori berdasarkan nama
        const kategori = await prisma.kategori.findFirst({
          where: { nama: v.kategoriNama, tipe: "pelanggaran" },
        });
        if (!kategori) {
          failed.push({
            nama: v.nama,
            reason: `Kategori dengan nama '${v.kategoriNama}' tidak ditemukan`,
          });
          continue;
        }
        // Cek nama sudah ada di kategori yang sama
        const exist = await prisma.reportItem.findFirst({
          where: {
            nama: v.nama,
            kategoriId: kategori.id,
            tipe: "pelanggaran",
          },
        });
        if (exist) {
          failed.push({
            nama: v.nama,
            reason: "Nama pelanggaran sudah ada di kategori ini",
          });
          continue;
        }
        // Buat report item (pelanggaran)
        await prisma.reportItem.create({
          data: {
            nama: v.nama,
            tipe: "pelanggaran",
            kategoriId: kategori.id,
            jenis: v.jenis || null,
            point: parseInt(v.point),
            isActive: v.isActive !== undefined ? !!v.isActive : true,
          },
        });
        successCount++;
      } catch (err) {
        failed.push({ nama: v.nama, reason: err.message });
      }
    }
    res.json({
      success: true,
      imported: successCount,
      failed,
    });
  } catch (err) {
    console.error("Error importing violations:", err);
    res.status(500).json({ error: "Gagal import data pelanggaran" });
  }
};

module.exports = { importStudents, importTeachers, importViolations };
