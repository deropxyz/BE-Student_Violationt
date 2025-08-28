// seed-students.js
// Jalankan: node seed-students.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
require("dotenv").config();

const prisma = new PrismaClient();

const jurusanList = ["RPL", "TPM", "DKV", "TKRO", "TITL", "MPLB"];
const tingkatList = ["X", "XI", "XII"];

// Buat 1 kelas per kombinasi tingkat x jurusan (total 18 kelas)
const kelasList = [];
let kelasCounter = {};
for (const tingkat of tingkatList) {
  for (const jurusan of jurusanList) {
    const key = `${tingkat}-${jurusan}`;
    if (!kelasCounter[key]) kelasCounter[key] = 1;
    const kodeKelas = `${tingkat}-${jurusan}-${kelasCounter[key]}`;
    kelasList.push({ namaKelas: `${tingkat} ${jurusan}`, kodeKelas });
    kelasCounter[key]++;
  }
}

// Buat 10 siswa per kelas
function generateSiswa(kelas, idxKelas) {
  const siswa = [];
  for (let i = 1; i <= 10; i++) {
    const nisn = `${idxKelas + 1}${String(i).padStart(4, "0")}`; // unik per kelas
    const nama = `Siswa ${kelas.namaKelas} ${i}`;
    const email = `${nisn}@smkn14.sch.id`;
    siswa.push({ nama, nisn, email, kelas: kelas.namaKelas });
  }
  return siswa;
}

async function main() {
  const defaultPassword = process.env.DEFAULT_PASSWORD || "smkn14garut";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // Seed angkatan
  const angkatanMap = {
    X: "2025",
    XI: "2024",
    XII: "2023",
  };
  const angkatanIdMap = {};
  for (const [tingkat, tahun] of Object.entries(angkatanMap)) {
    let angkatan = await prisma.angkatan.findFirst({ where: { tahun } });
    if (!angkatan) {
      angkatan = await prisma.angkatan.create({ data: { tahun } });
      console.log(`Angkatan dibuat: ${tahun}`);
    }
    angkatanIdMap[tingkat] = angkatan.id;
  }

  // Buat kelas jika belum ada
  for (const kelas of kelasList) {
    let kelasDb = await prisma.classroom.findFirst({
      where: { kodeKelas: kelas.kodeKelas },
    });
    if (!kelasDb) {
      kelasDb = await prisma.classroom.create({
        data: { namaKelas: kelas.namaKelas, kodeKelas: kelas.kodeKelas },
      });
      console.log(`Kelas dibuat: ${kelas.namaKelas} (${kelas.kodeKelas})`);
    }
  }

  // Ambil ulang kelas dari DB
  const kelasDbList = await prisma.classroom.findMany();

  // Seed siswa
  for (let idx = 0; idx < kelasDbList.length; idx++) {
    const kelas = kelasDbList[idx];
    // Ambil tingkat dari nama kelas (X, XI, XII)
    const tingkat = kelas.namaKelas.split(" ")[0];
    const angkatanId = angkatanIdMap[tingkat];
    const siswaList = generateSiswa(kelas, idx);
    for (const siswa of siswaList) {
      // Cek jika sudah ada
      const exist = await prisma.user.findUnique({
        where: { email: siswa.email },
      });
      if (exist) {
        console.log(`Skip: ${siswa.nama} (${siswa.email}) sudah ada.`);
        continue;
      }
      // Buat user
      const user = await prisma.user.create({
        data: {
          name: siswa.nama,
          email: siswa.email,
          password: hashedPassword,
          role: "siswa",
        },
      });
      // Buat student
      await prisma.student.create({
        data: {
          userId: user.id,
          nisn: siswa.nisn,
          gender: "L",
          tempatLahir: "Garut",
          tglLahir: new Date("2007-01-01"),
          alamat: "Jl. Contoh",
          classroomId: kelas.id,
          angkatanId,
        },
      });
      console.log(`Berhasil tambah: ${siswa.nama} (${siswa.email})`);
    }
  }
  await prisma.$disconnect();
}

main();
