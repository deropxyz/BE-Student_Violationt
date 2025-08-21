const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function migrateExistingReports() {
  try {
    console.log(
      "🔄 Starting migration of existing StudentReport to TahunAjaran..."
    );

    // Get all academic years ordered by start date
    const academicYears = await prisma.tahunAjaran.findMany({
      orderBy: { tahunMulai: "asc" },
    });

    console.log(`📊 Found ${academicYears.length} academic years`);

    if (academicYears.length === 0) {
      console.log(
        "❌ No academic years found. Please create academic years first."
      );
      return;
    }

    // Get active academic year or the latest one
    let defaultYear =
      academicYears.find((year) => year.isActive) ||
      academicYears[academicYears.length - 1];
    console.log(
      `🎯 Using default academic year: ${defaultYear.tahunAjaran} (${
        defaultYear.isActive ? "Active" : "Latest"
      })`
    );

    // Get all reports that don't have tahunAjaranId yet
    const reportsWithoutYear = await prisma.studentReport.findMany({
      where: {
        tahunAjaranId: null,
      },
      select: {
        id: true,
        tanggal: true,
      },
    });

    console.log(
      `📋 Found ${reportsWithoutYear.length} reports without academic year assignment`
    );

    if (reportsWithoutYear.length === 0) {
      console.log("✅ All reports already have academic year assigned!");
      return;
    }

    let updatedCount = 0;

    for (const report of reportsWithoutYear) {
      let assignedYear = defaultYear; // Default assignment

      // Try to find the correct academic year based on report date
      for (const year of academicYears) {
        if (
          report.tanggal >= year.tanggalMulai &&
          report.tanggal <= year.tanggalSelesai
        ) {
          assignedYear = year;
          break;
        }
      }

      // Update the report
      await prisma.studentReport.update({
        where: { id: report.id },
        data: { tahunAjaranId: assignedYear.id },
      });

      updatedCount++;

      if (updatedCount % 10 === 0) {
        console.log(
          `📝 Processed ${updatedCount}/${reportsWithoutYear.length} reports...`
        );
      }
    }

    console.log(`✅ Migration completed! Updated ${updatedCount} reports.`);

    // Show summary
    const reportsByYear = await prisma.tahunAjaran.findMany({
      include: {
        _count: {
          select: { reports: true },
        },
      },
      orderBy: { tahunMulai: "asc" },
    });

    console.log("\n📊 Summary of reports by academic year:");
    reportsByYear.forEach((year) => {
      console.log(
        `   ${year.tahunAjaran}: ${year._count.reports} reports ${
          year.isActive ? "(Active)" : ""
        }`
      );
    });
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  migrateExistingReports()
    .then(() => {
      console.log("🎉 Migration script completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Migration script failed:", error);
      process.exit(1);
    });
}

module.exports = { migrateExistingReports };
