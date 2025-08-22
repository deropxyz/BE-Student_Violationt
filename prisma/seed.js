const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const passwordAdmin = await bcrypt.hash("superadmin", 10);
  const hashedPassword = await bcrypt.hash("smkn14garut", 10);

  console.log("🌱 Starting seed process...");

  // 1. Seed Superadmin
  const superadmin = await prisma.user.upsert({
    where: { email: "superadmin@smk14.com" },
    update: {},
    create: {
      name: "Super Admin",
      email: "superadmin@smk14.com",
      password: passwordAdmin,
      role: "superadmin",
    },
  });
  console.log("✅ Superadmin created");

  // 2. Create Angkatan first
  const angkatan2024 = await prisma.angkatan.upsert({
    where: { tahun: "2024" },
    update: {},
    create: {
      tahun: "2024",
    },
  });

  const angkatan2025 = await prisma.angkatan.upsert({
    where: { tahun: "2025" },
    update: {},
    create: {
      tahun: "2025",
    },
  });
  console.log("✅ Angkatan created");

  // 3. Create Teachers and their User accounts
  const guruUsers = [
    {
      name: "Ahmad Suryadi, S.Pd",
      email: "ahmad.suryadi@smk14.com",
      nip: "198501012010011001",
      noHp: "081234567890",
      alamat: "Jl. Merdeka No. 123, Garut",
    },
    {
      name: "Siti Nurhaliza, S.Kom",
      email: "siti.nurhaliza@smk14.com",
      nip: "198703152011012002",
      noHp: "081234567891",
      alamat: "Jl. Sudirman No. 456, Garut",
    },
    {
      name: "Budi Santoso, S.T",
      email: "budi.santoso@smk14.com",
      nip: "198902202012011003",
      noHp: "081234567892",
      alamat: "Jl. Gatot Subroto No. 789, Garut",
    },
  ];

  const teachers = [];
  for (const guruData of guruUsers) {
    const user = await prisma.user.upsert({
      where: { email: guruData.email },
      update: {},
      create: {
        name: guruData.name,
        email: guruData.email,
        password: hashedPassword,
        role: "guru",
      },
    });

    const teacher = await prisma.teacher.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        nip: guruData.nip,
        noHp: guruData.noHp,
        alamat: guruData.alamat,
      },
    });

    teachers.push(teacher);
  }
  console.log("✅ Teachers created");

  // 6. Create Classrooms
  const classrooms = [
    {
      kodeKelas: "XII-RPL-1",
      namaKelas: "XII RPL 1",
      waliKelasId: teachers[0].id,
    },
    {
      kodeKelas: "XII-RPL-2",
      namaKelas: "XII RPL 2",
      waliKelasId: teachers[1].id,
    },
    {
      kodeKelas: "XI-RPL-1",
      namaKelas: "XI RPL 1",
      waliKelasId: teachers[2].id,
    },
  ];

  const createdClassrooms = [];
  for (const classroomData of classrooms) {
    const classroom = await prisma.classroom.upsert({
      where: { kodeKelas: classroomData.kodeKelas },
      update: {},
      create: classroomData,
    });
    createdClassrooms.push(classroom);
  }
  console.log("✅ Classrooms created");

  // 7. Create Students
  const studentsData = [
    {
      nisn: "2024001001",
      name: "Andi Prasetyo",
      gender: "L",
      tempatLahir: "Garut",
      tglLahir: new Date("2006-01-15"),
      alamat: "Jl. Veteran No. 234, Garut",
      noHp: "081234567896",
      classroomId: createdClassrooms[0].id,
      angkatanId: angkatan2024.id,
      orangTuaId: null,
    },
    {
      nisn: "2024001002",
      name: "Sari Dewi Lestari",
      gender: "P",
      tempatLahir: "Garut",
      tglLahir: new Date("2006-03-22"),
      alamat: "Jl. Ahmad Yani No. 567, Garut",
      noHp: "081234567897",
      classroomId: createdClassrooms[0].id,
      angkatanId: angkatan2024.id,
      orangTuaId: null,
    },
    {
      nisn: "2024001003",
      name: "Budi Santoso Jr",
      gender: "L",
      tempatLahir: "Bandung",
      tglLahir: new Date("2006-05-10"),
      alamat: "Jl. Diponegoro No. 890, Garut",
      noHp: "081234567898",
      classroomId: createdClassrooms[1].id,
      angkatanId: angkatan2024.id,
      orangTuaId: null,
    },
    {
      nisn: "2023001001",
      name: "Dian Permata Sari",
      gender: "P",
      tempatLahir: "Jakarta",
      tglLahir: new Date("2005-08-17"),
      alamat: "Jl. Merdeka No. 111, Garut",
      noHp: "081234567899",
      classroomId: createdClassrooms[2].id,
      angkatanId: angkatan2023.id,
      orangTuaId: null,
    },
    {
      nisn: "2023001002",
      name: "Rizki Fauzan",
      gender: "L",
      tempatLahir: "Tasikmalaya",
      tglLahir: new Date("2005-12-03"),
      alamat: "Jl. Sudirman No. 222, Garut",
      noHp: "081234567900",
      classroomId: createdClassrooms[2].id,
      angkatanId: angkatan2023.id,
      orangTuaId: null,
    },
  ];

  const students = [];
  for (const studentData of studentsData) {
    const email = `${studentData.nisn}@smk14.sch.id`;

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: studentData.name,
        email: email,
        password: hashedPassword,
        role: "siswa",
      },
    });

    const student = await prisma.student.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        nisn: studentData.nisn,
        gender: studentData.gender,
        tempatLahir: studentData.tempatLahir,
        tglLahir: studentData.tglLahir,
        alamat: studentData.alamat,
        noHp: studentData.noHp,
        classroomId: studentData.classroomId,
        angkatanId: studentData.angkatanId,
        orangTuaId: studentData.orangTuaId,
      },
    });

    students.push(student);
  }
  console.log("✅ Students created");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
