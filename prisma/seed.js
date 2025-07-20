const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const passwordAdmin = await bcrypt.hash("superadmin", 10);
  const hashedPassword = await bcrypt.hash("password123", 10);

  // Seed Superadmin
  await prisma.user.upsert({
    where: { email: "superadmin@smk14.com" },
    update: {},
    create: {
      name: "Super Admin",
      email: "superadmin@smk14.com",
      password: passwordAdmin,
      role: "superadmin",
    },
  });

  // Seed Guru
  await prisma.user.createMany({
    data: [
      {
        name: "Guru 1",
        email: "guru1@smk14.com",
        password: hashedPassword,
        role: "guru",
      },
      {
        name: "Guru 2",
        email: "guru2@smk14.com",
        password: hashedPassword,
        role: "guru",
      },
    ],
    skipDuplicates: true,
  });

  // Seed BK
  await prisma.user.createMany({
    data: [
      {
        name: "BK 1",
        email: "bk1@smk14.com",
        password: hashedPassword,
        role: "bk",
      },
    ],
    skipDuplicates: true,
  });

  // Seed Classroom
  const classroomA = await prisma.classroom.upsert({
    where: { name: "XII RPL 1" },
    update: {},
    create: {
      name: "XII RPL 1",
      batchYear: 2025,
    },
  });

  const classroomB = await prisma.classroom.upsert({
    where: { name: "XII RPL 2" },
    update: {},
    create: {
      name: "XII RPL 2",
      batchYear: 2025,
    },
  });

  // Seed Siswa
  const siswaData = [
    {
      nis: "10001",
      name: "Siswa A",
      class: "XII RPL 1",
      classroomId: classroomA.id,
    },
    {
      nis: "10002",
      name: "Siswa B",
      class: "XII RPL 2",
      classroomId: classroomB.id,
    },
  ];

  for (const siswa of siswaData) {
    const email = `${siswa.nis}@smk14.sch.id`;

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: siswa.name,
        email: email,
        password: hashedPassword,
        role: "siswa",
      },
    });

    await prisma.student.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        nis: siswa.nis,
        class: siswa.class,
        classroomId: siswa.classroomId,
      },
    });
  }

  console.log("✅ Seed selesai: superadmin, guru, bk, classroom, siswa");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
