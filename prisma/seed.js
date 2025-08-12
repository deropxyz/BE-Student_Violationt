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
      status: "aktif",
    },
  });

  const angkatan2025 = await prisma.angkatan.upsert({
    where: { tahun: "2025" },
    update: {},
    create: {
      tahun: "2025",
      status: "aktif",
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

  // 4. Create BK Users
  const bkUser = await prisma.user.upsert({
    where: { email: "bk@smk14.com" },
    update: {},
    create: {
      name: "Dra. Rina Kusuma",
      email: "bk@smk14.com",
      password: hashedPassword,
      role: "bk",
    },
  });
  console.log("✅ BK user created");

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
      orangTuaId: orangTuas[0].id,
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
      orangTuaId: orangTuas[0].id,
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
      orangTuaId: orangTuas[0].id,
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

  // 8. Create Violations (Hanya Pelanggaran)
  const violationsData = [
    // Pelanggaran Kedisiplinan
    {
      nama: "Terlambat ke sekolah",
      kategori: "ringan",
      jenis: "kedisiplinan",
      point: 10,
    },
    {
      nama: "Tidak memakai seragam lengkap",
      kategori: "ringan",
      jenis: "kedisiplinan",
      point: 15,
    },
    {
      nama: "Bolos sekolah",
      kategori: "sedang",
      jenis: "kedisiplinan",
      point: 50,
    },
    {
      nama: "Berkelahi di sekolah",
      kategori: "berat",
      jenis: "kedisiplinan",
      point: 100,
    },
    // Pelanggaran Akademik
    {
      nama: "Tidak mengerjakan tugas",
      kategori: "ringan",
      jenis: "akademik",
      point: 5,
    },
    {
      nama: "Menyontek saat ujian",
      kategori: "sedang",
      jenis: "akademik",
      point: 75,
    },
  ];

  const violations = [];
  for (const violationData of violationsData) {
    const violation = await prisma.violation.create({
      data: violationData,
    });
    violations.push(violation);
  }
  console.log("✅ Violations created");

  // 9. Create Sample Student Violations
  const sampleViolations = [
    {
      studentId: students[0].id,
      violationId: violations[0].id, // Terlambat
      reporterId: teachers[0].userId,
      tanggal: new Date("2024-07-15T07:30:00"),
      waktu: new Date("2024-07-15T07:15:00"),
      deskripsi: "Terlambat 15 menit karena macet",
      pointSaat: violations[0].point,
    },
    {
      studentId: students[1].id,
      violationId: violations[1].id, // Seragam tidak lengkap
      reporterId: teachers[1].userId,
      tanggal: new Date("2024-07-16T08:00:00"),
      deskripsi: "Tidak memakai dasi dan sepatu hitam",
      pointSaat: violations[1].point,
    },
    {
      studentId: students[2].id,
      violationId: violations[2].id, // Bolos sekolah
      reporterId: teachers[2].userId,
      tanggal: new Date("2024-07-17T08:00:00"),
      deskripsi: "Tidak masuk sekolah tanpa keterangan",
      pointSaat: violations[2].point,
    },
  ];

  for (const violationRecord of sampleViolations) {
    await prisma.studentViolation.create({
      data: violationRecord,
    });

    // Update student total score (pelanggaran menambah poin)
    const currentStudent = await prisma.student.findUnique({
      where: { id: violationRecord.studentId },
    });

    const newScore = currentStudent.totalScore + violationRecord.pointSaat;

    await prisma.student.update({
      where: { id: violationRecord.studentId },
      data: { totalScore: newScore },
    });

    // Get violation data for history
    const violation = violations.find(
      (v) => v.id === violationRecord.violationId
    );

    // Create score history
    await prisma.scoreHistory.create({
      data: {
        studentId: violationRecord.studentId,
        pointLama: currentStudent.totalScore,
        pointBaru: newScore,
        alasan: `Pelanggaran: ${violation.nama}`,
        tanggal: new Date(),
      },
    });

    // Create notification for student
    await prisma.notification.create({
      data: {
        studentId: violationRecord.studentId,
        judul: "Pelanggaran Baru",
        pesan: `Anda melakukan pelanggaran: ${violation.nama}. Poin Anda bertambah ${violation.point}.`,
      },
    });
  }
  console.log("✅ Student violations created");

  // 10. Create Automatic Actions (Tindakan Otomatis)
  const tindakanOtomatisData = [
    {
      minPoint: 100,
      maxPoint: 199,
      namaTindakan: "SP1",
      deskripsi: "Surat Peringatan 1 - Peringatan tertulis pertama",
    },
    {
      minPoint: 200,
      maxPoint: 299,
      namaTindakan: "Panggil Orang Tua",
      deskripsi: "Memanggil orang tua/wali murid ke sekolah untuk konsultasi",
    },
    {
      minPoint: 300,
      maxPoint: null,
      namaTindakan: "Drop Out",
      deskripsi: "Dikeluarkan dari sekolah karena pelanggaran berat berulang",
    },
  ];

  for (const tindakanData of tindakanOtomatisData) {
    await prisma.tindakanOtomatis.create({
      data: tindakanData,
    });
  }
  console.log("✅ Automatic actions created");

  // 11. Update classroom student count
  for (const classroom of createdClassrooms) {
    const studentCount = await prisma.student.count({
      where: { classroomId: classroom.id },
    });

    await prisma.classroom.update({
      where: { id: classroom.id },
      data: { jmlSiswa: studentCount },
    });
  }
  console.log("✅ Classroom student counts updated");

  // 10. Create Achievement Data
  const achievements = [
    {
      nama: "Juara 1 Olimpiade Matematika",
      kategori: "akademik",
      point: 50,
    },
    {
      nama: "Juara 2 Olimpiade Fisika",
      kategori: "akademik",
      point: 40,
    },
    {
      nama: "Juara 3 Olimpiade Kimia",
      kategori: "akademik",
      point: 30,
    },
    {
      nama: "Juara 1 Lomba Coding",
      kategori: "non_akademik",
      point: 45,
    },
    {
      nama: "Juara 2 Desain Grafis",
      kategori: "non_akademik",
      point: 35,
    },
    {
      nama: "Juara 1 Futsal",
      kategori: "olahraga",
      point: 40,
    },
    {
      nama: "Juara 2 Basket",
      kategori: "olahraga",
      point: 35,
    },
    {
      nama: "Juara 3 Voli",
      kategori: "olahraga",
      point: 30,
    },
    {
      nama: "Juara 1 Paduan Suara",
      kategori: "kesenian",
      point: 40,
    },
    {
      nama: "Juara 2 Drama",
      kategori: "kesenian",
      point: 35,
    },
    {
      nama: "Siswa Teladan",
      kategori: "lainnya",
      point: 50,
    },
    {
      nama: "Siswa Berprestasi",
      kategori: "lainnya",
      point: 30,
    },
  ];

  for (const achievementData of achievements) {
    await prisma.achievement.create({
      data: achievementData,
    });
  }
  console.log("✅ Achievement data created");

  console.log("\n🎉 Seed completed successfully!");
  console.log("\n📋 Summary:");
  console.log("- 1 Superadmin");
  console.log("- 3 Teachers");
  console.log("- 1 BK Staff");
  console.log("- 3 Parents");
  console.log("- 3 Classrooms");
  console.log("- 2 Angkatan (2023, 2024)");
  console.log("- 5 Students");
  console.log("- 8 Violation types");
  console.log("- 12 Achievement types");
  console.log("- 3 Sample violations");
  console.log("- 3 Automatic actions");
  console.log("\n🔑 Default Credentials:");
  console.log("- Superadmin: superadmin@smk14.com / superadmin");
  console.log("- Teachers: email / smkn14garut");
  console.log("- BK: bk@smk14.com / smkn14garut");
  console.log("- Students: {nisn}@smk14.sch.id / smkn14garut");
  console.log("- Parents: email / smkn14garut");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
