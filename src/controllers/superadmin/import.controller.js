const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const multer = require("multer");
const xlsx = require("xlsx"); // kalau pakai excel

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

const importPrestasiHandler = async (req, res) => {
  try {
    let prestasi = [];

    if (req.file) {
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      prestasi = XLSX.utils.sheet_to_json(sheet);
    } else if (req.body.prestasi) {
      prestasi = req.body.prestasi;
    }

    if (!Array.isArray(prestasi) || prestasi.length === 0) {
      return res
        .status(400)
        .json({ error: "Data prestasi kosong atau tidak valid" });
    }

    let successCount = 0;
    let failed = [];

    for (const p of prestasi) {
      try {
        if (!p.nama || !p.kategoriNama || p.point === undefined) {
          failed.push({
            nama: p.nama,
            reason: "Nama/kategori/point wajib diisi (kategoriNama)",
          });
          continue;
        }

        const kategori = await prisma.kategori.findFirst({
          where: { nama: p.kategoriNama, tipe: "prestasi" },
        });
        if (!kategori) {
          failed.push({
            nama: p.nama,
            reason: `Kategori '${p.kategoriNama}' tidak ditemukan`,
          });
          continue;
        }

        const point = parseInt(p.point);
        if (isNaN(point)) {
          failed.push({ nama: p.nama, reason: "Point harus berupa angka" });
          continue;
        }

        const exist = await prisma.reportItem.findFirst({
          where: { nama: p.nama, kategoriId: kategori.id, tipe: "prestasi" },
        });
        if (exist) {
          failed.push({
            nama: p.nama,
            reason: "Nama prestasi sudah ada di kategori ini",
          });
          continue;
        }

        await prisma.reportItem.create({
          data: {
            nama: p.nama,
            tipe: "prestasi",
            kategoriId: kategori.id,
            jenis: p.jenis || null,
            point: point,
            isActive: p.isActive !== undefined ? !!p.isActive : true,
          },
        });

        successCount++;
      } catch (err) {
        failed.push({ nama: p.nama, reason: err.message });
      }
    }

    res.json({ success: failed.length === 0, imported: successCount, failed });
  } catch (err) {
    console.error("Error importing prestasi:", err);
    res.status(500).json({ error: "Gagal import data prestasi" });
  }
};

const importPelanggaran = async (req, res) => {
  try {
    let pelanggaran = [];

    if (req.file) {
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      pelanggaran = XLSX.utils.sheet_to_json(sheet);
    } else if (req.body.pelanggaran) {
      pelanggaran = req.body.pelanggaran;
    }

    if (!Array.isArray(pelanggaran) || pelanggaran.length === 0) {
      return res
        .status(400)
        .json({ error: "Data pelanggaran kosong atau tidak valid" });
    }

    let successCount = 0;
    let failed = [];

    for (const p of pelanggaran) {
      try {
        if (!p.nama || !p.kategoriNama || p.point === undefined) {
          failed.push({
            nama: p.nama,
            reason: "Nama/kategori/point wajib diisi (kategoriNama)",
          });
          continue;
        }

        const kategori = await prisma.kategori.findFirst({
          where: { nama: p.kategoriNama, tipe: "pelanggaran" },
        });
        if (!kategori) {
          failed.push({
            nama: p.nama,
            reason: `Kategori '${p.kategoriNama}' tidak ditemukan`,
          });
          continue;
        }

        const point = parseInt(p.point);
        if (isNaN(point)) {
          failed.push({ nama: p.nama, reason: "Point harus berupa angka" });
          continue;
        }

        const exist = await prisma.reportItem.findFirst({
          where: { nama: p.nama, kategoriId: kategori.id, tipe: "pelanggaran" },
        });
        if (exist) {
          failed.push({
            nama: p.nama,
            reason: "Nama pelanggaran sudah ada di kategori ini",
          });
          continue;
        }

        await prisma.reportItem.create({
          data: {
            nama: p.nama,
            tipe: "pelanggaran",
            kategoriId: kategori.id,
            jenis: p.jenis || null,
            point: point,
            isActive: p.isActive !== undefined ? !!p.isActive : true,
          },
        });

        successCount++;
      } catch (err) {
        failed.push({ nama: p.nama, reason: err.message });
      }
    }

    res.json({ success: failed.length === 0, imported: successCount, failed });
  } catch (err) {
    console.error("Error importing pelanggaran:", err);
    res.status(500).json({ error: "Gagal import data pelanggaran" });
  }
};

module.exports = {
  importStudents,
  importTeachers,
  importPrestasiHandler,
  importPelanggaran,
};
