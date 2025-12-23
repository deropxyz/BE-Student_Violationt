const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const multer = require("multer");
const xlsx = require("xlsx"); // kalau pakai excel
const ExcelJS = require("exceljs");

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
      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      // Skip baris instruksi (baris 1), baca header dari baris 2
      prestasi = xlsx.utils.sheet_to_json(sheet, { range: 1 }); // Start from row 2 (index 1)
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
      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      // Skip baris instruksi (baris 1), baca header dari baris 2
      pelanggaran = xlsx.utils.sheet_to_json(sheet, { range: 1 }); // Start from row 2 (index 1)
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

// Download template Excel untuk import prestasi
const downloadTemplatePrestasiExcel = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Template Import Prestasi");

    // Instruksi
    worksheet.mergeCells("A1:E1");
    worksheet.getCell("A1").value =
      "INSTRUKSI: Jangan ubah nama kolom di baris 2. Isi data mulai dari baris 3. Kolom isActive isi true/false";
    worksheet.getCell("A1").font = {
      size: 10,
      italic: true,
      color: { argb: "FF666666" },
    };
    worksheet.getCell("A1").alignment = { wrapText: true };
    worksheet.getRow(1).height = 30;

    // Header
    worksheet.getRow(2).values = [
      "nama",
      "kategoriNama",
      "jenis",
      "point",
      "isActive",
    ];

    // Set column widths
    worksheet.columns = [
      { key: "nama", width: 40 },
      { key: "kategoriNama", width: 25 },
      { key: "jenis", width: 20 },
      { key: "point", width: 12 },
      { key: "isActive", width: 20 },
    ];

    // Style header
    worksheet.getRow(2).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(2).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4CAF50" },
    };
    worksheet.getRow(2).alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    // Ambil daftar kategori prestasi untuk referensi
    const kategoris = await prisma.kategori.findMany({
      where: { tipe: "prestasi" },
      select: { nama: true },
    });

    // Tambahkan contoh data
    worksheet.addRow({
      nama: "Juara 1 Lomba Matematika Tingkat Provinsi",
      kategoriNama: kategoris[0]?.nama || "Prestasi Akademik",
      jenis: "Lomba",
      point: 50,
      isActive: true,
    });

    worksheet.addRow({
      nama: "Juara 2 Lomba Coding Tingkat Nasional",
      kategoriNama: kategoris[0]?.nama || "Prestasi Akademik",
      jenis: "Lomba",
      point: 40,
      isActive: true,
    });

    // Tambahkan sheet untuk referensi kategori
    const refSheet = workbook.addWorksheet("Referensi Kategori");
    refSheet.columns = [
      { header: "Kategori Prestasi yang Tersedia", key: "nama", width: 40 },
    ];
    refSheet.getRow(1).font = { bold: true };
    refSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2196F3" },
    };

    kategoris.forEach((k) => {
      refSheet.addRow({ nama: k.nama });
    });

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Template_Import_Prestasi.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error generating template prestasi:", err);
    res.status(500).json({ error: "Gagal generate template" });
  }
};

// Download template Excel untuk import pelanggaran
const downloadTemplatePelanggaranExcel = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Template Import Pelanggaran");

    // Instruksi
    worksheet.mergeCells("A1:E1");
    worksheet.getCell("A1").value =
      "INSTRUKSI: Jangan ubah nama kolom di baris 2. Isi data mulai dari baris 3. Point harus negatif. Kolom isActive isi true/false";
    worksheet.getCell("A1").font = {
      size: 10,
      italic: true,
      color: { argb: "FF666666" },
    };
    worksheet.getCell("A1").alignment = { wrapText: true };
    worksheet.getRow(1).height = 30;

    // Header
    worksheet.getRow(2).values = [
      "nama",
      "kategoriNama",
      "jenis",
      "point",
      "isActive",
    ];

    // Set column widths
    worksheet.columns = [
      { key: "nama", width: 40 },
      { key: "kategoriNama", width: 25 },
      { key: "jenis", width: 20 },
      { key: "point", width: 15 },
      { key: "isActive", width: 20 },
    ];

    // Style header
    worksheet.getRow(2).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(2).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF44336" },
    };
    worksheet.getRow(2).alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    // Ambil daftar kategori pelanggaran untuk referensi
    const kategoris = await prisma.kategori.findMany({
      where: { tipe: "pelanggaran" },
      select: { nama: true },
    });

    // Tambahkan contoh data
    worksheet.addRow({
      nama: "Terlambat masuk sekolah",
      kategoriNama: kategoris[0]?.nama || "Pelanggaran Ringan",
      jenis: "Kedisiplinan",
      point: -5,
      isActive: true,
    });

    worksheet.addRow({
      nama: "Tidak menggunakan seragam lengkap",
      kategoriNama: kategoris[0]?.nama || "Pelanggaran Ringan",
      jenis: "Kedisiplinan",
      point: -10,
      isActive: true,
    });

    // Tambahkan sheet untuk referensi kategori
    const refSheet = workbook.addWorksheet("Referensi Kategori");
    refSheet.columns = [
      { header: "Kategori Pelanggaran yang Tersedia", key: "nama", width: 40 },
    ];
    refSheet.getRow(1).font = { bold: true };
    refSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFF9800" },
    };

    kategoris.forEach((k) => {
      refSheet.addRow({ nama: k.nama });
    });

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Template_Import_Pelanggaran.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error generating template pelanggaran:", err);
    res.status(500).json({ error: "Gagal generate template" });
  }
};

module.exports = {
  importStudents,
  importTeachers,
  importPrestasiHandler,
  importPelanggaran,
  downloadTemplatePrestasiExcel,
  downloadTemplatePelanggaranExcel,
};
