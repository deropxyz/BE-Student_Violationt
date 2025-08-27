const { PrismaClient } = require("@prisma/client");
const XLSX = require("xlsx");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

// Import data from Excel
const importFromExcel = async (req, res) => {
  const { type } = req.params; // 'students', 'teachers', 'bk'

  if (!req.file) {
    return res.status(400).json({ error: "File tidak ditemukan" });
  }

  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const defaultPassword = process.env.DEFAULT_PASSWORD;
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    let imported = 0;
    let errors = [];

    for (const row of data) {
      try {
        if (type === "students") {
          await importStudent(row, hashedPassword);
        } else if (type === "teachers") {
          await importTeacher(row, hashedPassword);
        } else if (type === "bk") {
          await importBK(row, hashedPassword);
        }
        imported++;
      } catch (err) {
        errors.push({ row: row, error: err.message });
      }
    }

    res.json({
      message: `Import ${type} berhasil`,
      imported,
      errors: errors.length,
      errorDetails: errors,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Gagal import ${type}` });
  }
};

// Helper function to import student (dengan validasi lebih baik)
const importStudent = async (data, hashedPassword) => {
  let {
    nisn,
    nama,
    gender,
    tempatLahir,
    tglLahir,
    alamat,
    noHp,
    kelas,
    angkatan,
    namaOrtu,
    nohpOrtu,
  } = data;
  nisn = nisn ? String(nisn) : "";
  // Validasi kolom wajib
  if (
    !nisn ||
    !nama ||
    !gender ||
    !tempatLahir ||
    !tglLahir ||
    !alamat ||
    !kelas ||
    !angkatan
  ) {
    throw new Error(
      "Data wajib (nisn, nama, gender, tempatLahir, tglLahir, alamat, kelas, angkatan) tidak boleh kosong"
    );
  }

  // Validasi format tanggal (harus yyyy-mm-dd)
  let tglLahirDate;
  if (/^\d{4}-\d{2}-\d{2}$/.test(tglLahir)) {
    tglLahirDate = new Date(tglLahir);
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(tglLahir)) {
    // dd/mm/yyyy
    const [d, m, y] = tglLahir.split("/");
    tglLahirDate = new Date(`${y}-${m}-${d}`);
  } else {
    throw new Error("Format tglLahir harus yyyy-mm-dd atau dd/mm/yyyy");
  }
  if (isNaN(tglLahirDate.getTime())) {
    throw new Error("Format tglLahir tidak valid");
  }

  // Cek NISN sudah ada
  const existStudent = await prisma.student.findUnique({ where: { nisn } });
  if (existStudent) {
    throw new Error("NISN sudah terdaftar");
  }

  // Find classroom by kodeKelas (kelas = kode kelas di file import)
  let classroom = await prisma.classroom.findFirst({
    where: { kodeKelas: kelas },
  });
  if (!classroom) {
    throw new Error(`Kelas dengan kode ${kelas} tidak ditemukan`);
  }

  // Find or create angkatan
  let angkatanRecord = await prisma.angkatan.findFirst({
    where: { tahun: angkatan.toString() },
  });
  if (!angkatanRecord) {
    angkatanRecord = await prisma.angkatan.create({
      data: { tahun: angkatan.toString() },
    });
  }

  const email = `${nisn}@smk14.sch.id`;
  const user = await prisma.user.create({
    data: {
      name: nama,
      email,
      password: hashedPassword,
      role: "siswa",
    },
  });

  await prisma.student.create({
    data: {
      userId: user.id,
      nisn,
      gender: gender === "L" ? "L" : "P",
      tempatLahir,
      tglLahir: tglLahirDate,
      alamat,
      noHp,
      classroomId: classroom.id,
      angkatanId: angkatanRecord.id,
      namaOrtu: namaOrtu || null,
      nohpOrtu: nohpOrtu || null,
    },
  });
};

// Helper function to import teacher
const importTeacher = async (data, hashedPassword) => {
  const { nama, email, nip, noHp, alamat } = data;

  const user = await prisma.user.create({
    data: {
      name: nama,
      email,
      password: hashedPassword,
      role: "guru",
    },
  });

  await prisma.teacher.create({
    data: {
      userId: user.id,
      nip,
      noHp,
      alamat,
    },
  });
};

// Helper function to import BK
const importBK = async (data, hashedPassword) => {
  const { nama, email, nip, noHp, alamat } = data;

  await prisma.user.create({
    data: {
      name: nama,
      email,
      password: hashedPassword,
      role: "bk",
    },
  });
};

module.exports = {
  importFromExcel,
  importStudent,
  importTeacher,
  importBK,
};
