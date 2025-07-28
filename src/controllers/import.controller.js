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

    const defaultPassword = "smkn14@garut";
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

// Helper function to import student
const importStudent = async (data, hashedPassword) => {
  const {
    nisn,
    nama,
    gender,
    tempatLahir,
    tglLahir,
    alamat,
    noHp,
    kelas,
    angkatan,
  } = data;
  const email = `${nisn}@smk14.sch.id`;

  // Find or create classroom
  let classroom = await prisma.classroom.findFirst({
    where: { namaKelas: kelas },
  });

  // Find or create angkatan
  let angkatanRecord = await prisma.angkatan.findFirst({
    where: { tahun: angkatan.toString() },
  });

  if (!angkatanRecord) {
    angkatanRecord = await prisma.angkatan.create({
      data: { tahun: angkatan.toString() },
    });
  }

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
      tglLahir: new Date(tglLahir),
      alamat,
      noHp,
      classroomId: classroom?.id,
      angkatanId: angkatanRecord.id,
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
};
