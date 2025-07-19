const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  // Password default
  const passwordadmin = await bcrypt.hash("superadmin", 10);
  const hashedPassword = await bcrypt.hash("password123", 10);

  // Seed Superadmin (jika belum ada)
  await prisma.user.upsert({
    where: { email: "superadmin@smk14.com" },
    update: {},
    create: {
      name: "Super Admin",
      email: "superadmin@smk14.com",
      password: passwordadmin,
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

  const siswaData = [
    {
      nis: "10001",
      name: "Siswa A",
      class: "XII RPL 1",
    },
    {
      nis: "10002",
      name: "Siswa B",
      class: "XII RPL 2",
    },
  ];

  for (const siswa of siswaData) {
    const emailDummy = `${siswa.nis}@nis.local`;

    const user = await prisma.user.upsert({
      where: { email: emailDummy },
      update: {},
      create: {
        name: siswa.name,
        email: emailDummy, // agar tetap unik & tidak null
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
      },
    });
  }

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

  console.log(
    "✅ Data akun superadmin, guru, siswa, dan BK berhasil ditambahkan"
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
