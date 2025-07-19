const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("superadmin", 12); // ubah sesuai kebutuhan

  const superadmin = await prisma.user.upsert({
    where: { email: "superadmin@smk14.sch.id" },
    update: {},
    create: {
      name: "Super Admin",
      email: "superadmin@smk14.sch.id",
      password: hashedPassword,
      role: "superadmin", // sesuaikan dengan enum di model
    },
  });

  console.log("✅ Superadmin seeded:", superadmin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
