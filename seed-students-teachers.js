const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function createStudentsAndTeachers() {
  try {
    console.log("🌱 Creating students and teachers seed data...");

    // Check if academic years exist
    const academicYears = await prisma.tahunAjaran.findMany();
    if (academicYears.length === 0) {
      console.log(
        "❌ No academic years found. Please run academic year seed first."
      );
      return;
    }

    // Get active academic year
    const activeAcademicYear = await prisma.tahunAjaran.findFirst({
      where: { isActive: true },
    });

    if (!activeAcademicYear) {
      console.log(
        "❌ No active academic year found. Please set an academic year as active."
      );
      return;
    }

    console.log(`📅 Active academic year: ${activeAcademicYear.tahunAjaran}`);

    // Create angkatan (batch/year) data
    const angkatanData = [
      { tahun: "2022", status: "lulus" },
      { tahun: "2023", status: "lulus" },
      { tahun: "2024", status: "aktif" },
      { tahun: "2025", status: "aktif" },
    ];

    console.log("📚 Creating angkatan data...");
    for (const angkatan of angkatanData) {
      await prisma.angkatan.upsert({
        where: { tahun: angkatan.tahun },
        update: {},
        create: angkatan,
      });
    }

    // Create classroom data
    const classroomData = [
      {
        kodeKelas: "X-TKJ-1",
        namaKelas: "X Teknik Komputer dan Jaringan 1",
        jmlSiswa: 0,
      },
      {
        kodeKelas: "X-TKJ-2",
        namaKelas: "X Teknik Komputer dan Jaringan 2",
        jmlSiswa: 0,
      },
      { kodeKelas: "X-MM-1", namaKelas: "X Multimedia 1", jmlSiswa: 0 },
      { kodeKelas: "X-MM-2", namaKelas: "X Multimedia 2", jmlSiswa: 0 },
      {
        kodeKelas: "XI-TKJ-1",
        namaKelas: "XI Teknik Komputer dan Jaringan 1",
        jmlSiswa: 0,
      },
      {
        kodeKelas: "XI-TKJ-2",
        namaKelas: "XI Teknik Komputer dan Jaringan 2",
        jmlSiswa: 0,
      },
      { kodeKelas: "XI-MM-1", namaKelas: "XI Multimedia 1", jmlSiswa: 0 },
      { kodeKelas: "XI-MM-2", namaKelas: "XI Multimedia 2", jmlSiswa: 0 },
      {
        kodeKelas: "XII-TKJ-1",
        namaKelas: "XII Teknik Komputer dan Jaringan 1",
        jmlSiswa: 0,
      },
      {
        kodeKelas: "XII-TKJ-2",
        namaKelas: "XII Teknik Komputer dan Jaringan 2",
        jmlSiswa: 0,
      },
      { kodeKelas: "XII-MM-1", namaKelas: "XII Multimedia 1", jmlSiswa: 0 },
      { kodeKelas: "XII-MM-2", namaKelas: "XII Multimedia 2", jmlSiswa: 0 },
    ];

    console.log("🏫 Creating classroom data...");
    const createdClassrooms = [];
    for (const classroom of classroomData) {
      const created = await prisma.classroom.upsert({
        where: { kodeKelas: classroom.kodeKelas },
        update: {},
        create: classroom,
      });
      createdClassrooms.push(created);
    }

    // Get angkatan for students
    const angkatanList = await prisma.angkatan.findMany();

    // Create teachers first
    const teacherData = [
      {
        name: "Dr. Ahmad Santoso, M.Pd",
        email: "ahmad.santoso@smk14.com",
        nip: "196801051990031001",
        noHp: "081234567890",
        alamat: "Jl. Pendidikan No. 1, Garut",
      },
      {
        name: "Siti Nurhaliza, S.Kom",
        email: "siti.nurhaliza@smk14.com",
        nip: "197505102000032001",
        noHp: "081234567891",
        alamat: "Jl. Komputer No. 5, Garut",
      },
      {
        name: "Budi Raharjo, M.T",
        email: "budi.raharjo@smk14.com",
        nip: "198203151998031002",
        noHp: "081234567892",
        alamat: "Jl. Teknologi No. 10, Garut",
      },
      {
        name: "Rina Wijayanti, S.Pd",
        email: "rina.wijayanti@smk14.com",
        nip: "199001251999032001",
        noHp: "081234567893",
        alamat: "Jl. Multimedia No. 15, Garut",
      },
      {
        name: "Dedi Kurniawan, S.Kom",
        email: "dedi.kurniawan@smk14.com",
        nip: "198707201995031001",
        noHp: "081234567894",
        alamat: "Jl. Jaringan No. 20, Garut",
      },
      {
        name: "Maya Sari, M.Pd",
        email: "maya.sari@smk14.com",
        nip: "199205102010032002",
        noHp: "081234567895",
        alamat: "Jl. Bimbingan No. 25, Garut",
      },
    ];

    console.log("👨‍🏫 Creating teachers...");
    const hashedPasswordTeacher = await bcrypt.hash("teacher123", 10);
    const createdTeachers = [];

    for (const teacherInfo of teacherData) {
      // Create user for teacher
      const user = await prisma.user.upsert({
        where: { email: teacherInfo.email },
        update: {},
        create: {
          name: teacherInfo.name,
          email: teacherInfo.email,
          password: hashedPasswordTeacher,
          role: "guru",
        },
      });

      // Create teacher profile
      const teacher = await prisma.teacher.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          nip: teacherInfo.nip,
          noHp: teacherInfo.noHp,
          alamat: teacherInfo.alamat,
        },
      });

      createdTeachers.push(teacher);
    }

    // Create BK counselor
    const bkUser = await prisma.user.upsert({
      where: { email: "bk@smk14.com" },
      update: {},
      create: {
        name: "Ibu Counselor BK",
        email: "bk@smk14.com",
        password: await bcrypt.hash("bk123", 10),
        role: "bk",
      },
    });

    console.log("👥 Creating BK counselor...");

    // Assign wali kelas to some classrooms
    const classroomUpdates = [
      {
        classroomId: createdClassrooms[0].id,
        teacherId: createdTeachers[0].id,
      },
      {
        classroomId: createdClassrooms[1].id,
        teacherId: createdTeachers[1].id,
      },
      {
        classroomId: createdClassrooms[2].id,
        teacherId: createdTeachers[2].id,
      },
      {
        classroomId: createdClassrooms[3].id,
        teacherId: createdTeachers[3].id,
      },
      {
        classroomId: createdClassrooms[4].id,
        teacherId: createdTeachers[4].id,
      },
      {
        classroomId: createdClassrooms[5].id,
        teacherId: createdTeachers[5].id,
      },
    ];

    console.log("📋 Assigning homeroom teachers...");
    for (const update of classroomUpdates) {
      // Check if teacher is already assigned as homeroom teacher
      const existingAssignment = await prisma.classroom.findFirst({
        where: { waliKelasId: update.teacherId },
      });

      if (!existingAssignment) {
        await prisma.classroom.update({
          where: { id: update.classroomId },
          data: { waliKelasId: update.teacherId },
        });
      } else {
        console.log(
          `Teacher ${update.teacherId} is already assigned to classroom ${existingAssignment.namaKelas}`
        );
      }
    }

    // Create parent users
    const parentData = [
      {
        name: "Bapak Sutrisno",
        email: "sutrisno.parent@gmail.com",
        noHp: "082134567890",
        alamat: "Jl. Keluarga No. 1, Garut",
        pekerjaan: "Petani",
      },
      {
        name: "Ibu Sartika",
        email: "sartika.parent@gmail.com",
        noHp: "082134567891",
        alamat: "Jl. Keluarga No. 5, Garut",
        pekerjaan: "Ibu Rumah Tangga",
      },
      {
        name: "Bapak Hermawan",
        email: "hermawan.parent@gmail.com",
        noHp: "082134567892",
        alamat: "Jl. Keluarga No. 10, Garut",
        pekerjaan: "Pedagang",
      },
      {
        name: "Ibu Ratna",
        email: "ratna.parent@gmail.com",
        noHp: "082134567893",
        alamat: "Jl. Keluarga No. 15, Garut",
        pekerjaan: "Guru",
      },
      {
        name: "Bapak Joko",
        email: "joko.parent@gmail.com",
        noHp: "082134567894",
        alamat: "Jl. Keluarga No. 20, Garut",
        pekerjaan: "Buruh",
      },
    ];

    console.log("👨‍👩‍👧‍👦 Creating parents...");
    const hashedPasswordParent = await bcrypt.hash("parent123", 10);
    const createdParents = [];

    for (const parentInfo of parentData) {
      // Create user for parent
      const user = await prisma.user.upsert({
        where: { email: parentInfo.email },
        update: {},
        create: {
          name: parentInfo.name,
          email: parentInfo.email,
          password: hashedPasswordParent,
          role: "orangtua",
        },
      });

      // Create parent profile
      const parent = await prisma.orangTua.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          noHp: parentInfo.noHp,
          alamat: parentInfo.alamat,
          pekerjaan: parentInfo.pekerjaan,
        },
      });

      createdParents.push(parent);
    }

    // Create students
    const studentData = [
      {
        name: "Ahmad Fauzi",
        email: "ahmad.fauzi@student.smk14.com",
        nisn: "2024001001",
        gender: "L",
        tempatLahir: "Garut",
        tglLahir: new Date("2006-05-15"),
        alamat: "Jl. Siswa No. 1, Garut",
        noHp: "083134567890",
        classroomIndex: 0, // X-TKJ-1
        angkatanIndex: 3, // 2025
        parentIndex: 0,
      },
      {
        name: "Siti Aisyah",
        email: "siti.aisyah@student.smk14.com",
        nisn: "2024001002",
        gender: "P",
        tempatLahir: "Garut",
        tglLahir: new Date("2006-08-20"),
        alamat: "Jl. Siswa No. 5, Garut",
        noHp: "083134567891",
        classroomIndex: 0, // X-TKJ-1
        angkatanIndex: 3, // 2025
        parentIndex: 1,
      },
      {
        name: "Budi Santoso",
        email: "budi.santoso@student.smk14.com",
        nisn: "2024001003",
        gender: "L",
        tempatLahir: "Bandung",
        tglLahir: new Date("2006-03-10"),
        alamat: "Jl. Siswa No. 10, Garut",
        noHp: "083134567892",
        classroomIndex: 1, // X-TKJ-2
        angkatanIndex: 3, // 2025
        parentIndex: 2,
      },
      {
        name: "Rina Pratiwi",
        email: "rina.pratiwi@student.smk14.com",
        nisn: "2024001004",
        gender: "P",
        tempatLahir: "Tasikmalaya",
        tglLahir: new Date("2006-11-25"),
        alamat: "Jl. Siswa No. 15, Garut",
        noHp: "083134567893",
        classroomIndex: 2, // X-MM-1
        angkatanIndex: 3, // 2025
        parentIndex: 3,
      },
      {
        name: "Dedi Kurnia",
        email: "dedi.kurnia@student.smk14.com",
        nisn: "2024001005",
        gender: "L",
        tempatLahir: "Garut",
        tglLahir: new Date("2006-07-05"),
        alamat: "Jl. Siswa No. 20, Garut",
        noHp: "083134567894",
        classroomIndex: 2, // X-MM-1
        angkatanIndex: 3, // 2025
        parentIndex: 4,
      },
      {
        name: "Maya Indah",
        email: "maya.indah@student.smk14.com",
        nisn: "2023001001",
        gender: "P",
        tempatLahir: "Garut",
        tglLahir: new Date("2005-04-12"),
        alamat: "Jl. Siswa No. 25, Garut",
        noHp: "083134567895",
        classroomIndex: 4, // XI-TKJ-1
        angkatanIndex: 2, // 2024
        parentIndex: 0,
      },
      {
        name: "Rizki Maulana",
        email: "rizki.maulana@student.smk14.com",
        nisn: "2023001002",
        gender: "L",
        tempatLahir: "Bandung",
        tglLahir: new Date("2005-09-18"),
        alamat: "Jl. Siswa No. 30, Garut",
        noHp: "083134567896",
        classroomIndex: 4, // XI-TKJ-1
        angkatanIndex: 2, // 2024
        parentIndex: 1,
      },
      {
        name: "Nurul Hidayah",
        email: "nurul.hidayah@student.smk14.com",
        nisn: "2023001003",
        gender: "P",
        tempatLahir: "Tasikmalaya",
        tglLahir: new Date("2005-12-03"),
        alamat: "Jl. Siswa No. 35, Garut",
        noHp: "083134567897",
        classroomIndex: 6, // XI-MM-1
        angkatanIndex: 2, // 2024
        parentIndex: 2,
      },
      {
        name: "Arif Rahman",
        email: "arif.rahman@student.smk14.com",
        nisn: "2022001001",
        gender: "L",
        tempatLahir: "Garut",
        tglLahir: new Date("2004-06-30"),
        alamat: "Jl. Siswa No. 40, Garut",
        noHp: "083134567898",
        classroomIndex: 8, // XII-TKJ-1
        angkatanIndex: 1, // 2023
        parentIndex: 3,
      },
      {
        name: "Dewi Sartika",
        email: "dewi.sartika@student.smk14.com",
        nisn: "2022001002",
        gender: "P",
        tempatLahir: "Bandung",
        tglLahir: new Date("2004-01-22"),
        alamat: "Jl. Siswa No. 45, Garut",
        noHp: "083134567899",
        classroomIndex: 10, // XII-MM-1
        angkatanIndex: 1, // 2023
        parentIndex: 4,
      },
    ];

    console.log("👨‍🎓 Creating students...");
    const hashedPasswordStudent = await bcrypt.hash("student123", 10);
    const createdStudents = [];

    for (const studentInfo of studentData) {
      // Create user for student
      const user = await prisma.user.upsert({
        where: { email: studentInfo.email },
        update: {},
        create: {
          name: studentInfo.name,
          email: studentInfo.email,
          password: hashedPasswordStudent,
          role: "siswa",
        },
      });

      // Create student profile
      const student = await prisma.student.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          nisn: studentInfo.nisn,
          gender: studentInfo.gender,
          tempatLahir: studentInfo.tempatLahir,
          tglLahir: studentInfo.tglLahir,
          alamat: studentInfo.alamat,
          noHp: studentInfo.noHp,
          classroomId: createdClassrooms[studentInfo.classroomIndex].id,
          angkatanId: angkatanList[studentInfo.angkatanIndex].id,
          orangTuaId: createdParents[studentInfo.parentIndex].id,
          totalScore: 0,
        },
      });

      createdStudents.push(student);
    }

    // Update classroom student counts
    console.log("📊 Updating classroom student counts...");
    for (const classroom of createdClassrooms) {
      const studentCount = await prisma.student.count({
        where: { classroomId: classroom.id },
      });

      await prisma.classroom.update({
        where: { id: classroom.id },
        data: { jmlSiswa: studentCount },
      });
    }

    // Summary
    const totalUsers = await prisma.user.count();
    const totalStudents = await prisma.student.count();
    const totalTeachers = await prisma.teacher.count();
    const totalParents = await prisma.orangTua.count();
    const totalClassrooms = await prisma.classroom.count();

    console.log("\n📊 Summary:");
    console.log(`- Total users: ${totalUsers}`);
    console.log(`- Students: ${totalStudents}`);
    console.log(`- Teachers: ${totalTeachers}`);
    console.log(`- Parents: ${totalParents}`);
    console.log(`- Classrooms: ${totalClassrooms}`);
    console.log(`- Angkatan: ${angkatanList.length}`);

    console.log("\n👥 Login Credentials:");
    console.log("Teachers: email = [teacher-email], password = teacher123");
    console.log("Students: email = [student-email], password = student123");
    console.log("Parents: email = [parent-email], password = parent123");
    console.log("BK: email = bk@smk14.com, password = bk123");

    console.log("\n✅ Students and teachers seed completed successfully!");
  } catch (error) {
    console.error("❌ Error creating students and teachers:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
createStudentsAndTeachers();
