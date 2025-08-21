const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function createAcademicYears() {
  try {
    console.log("🎓 Creating academic years...");

    // Define academic years
    const academicYears = [
      {
        tahunAjaran: "2022/2023",
        tahunMulai: 2022,
        tahunSelesai: 2023,
        tanggalMulai: new Date("2022-07-15"),
        tanggalSelesai: new Date("2023-06-30"),
        isActive: false,
      },
      {
        tahunAjaran: "2023/2024",
        tahunMulai: 2023,
        tahunSelesai: 2024,
        tanggalMulai: new Date("2023-07-15"),
        tanggalSelesai: new Date("2024-06-30"),
        isActive: false,
      },
      {
        tahunAjaran: "2024/2025",
        tahunMulai: 2024,
        tahunSelesai: 2025,
        tanggalMulai: new Date("2024-07-15"),
        tanggalSelesai: new Date("2025-06-30"),
        isActive: true, // Current active year
      },
    ];

    for (const yearData of academicYears) {
      // Check if already exists
      const existing = await prisma.tahunAjaran.findUnique({
        where: { tahunAjaran: yearData.tahunAjaran },
      });

      if (existing) {
        console.log(
          `📅 Academic year ${yearData.tahunAjaran} already exists, skipping...`
        );
        continue;
      }

      // Deactivate all years if this one is active
      if (yearData.isActive) {
        await prisma.tahunAjaran.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });
      }

      // Create academic year
      await prisma.tahunAjaran.create({
        data: yearData,
      });

      console.log(
        `✅ Created academic year: ${yearData.tahunAjaran} ${
          yearData.isActive ? "(Active)" : ""
        }`
      );
    }

    console.log("🎉 Academic years creation completed!");
  } catch (error) {
    console.error("❌ Error creating academic years:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  createAcademicYears()
    .then(() => {
      console.log("✨ Academic years seed completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Academic years seed failed:", error);
      process.exit(1);
    });
}

module.exports = { createAcademicYears };
