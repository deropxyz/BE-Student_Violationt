const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log("🔍 Checking database data...");

    // Check academic years
    const academicYears = await prisma.tahunAjaran.findMany();
    console.log(`📅 Academic Years: ${academicYears.length}`);
    academicYears.forEach((year) => {
      console.log(
        `   - ${year.tahunAjaran} (${year.isActive ? "Active" : "Inactive"})`
      );
    });

    // Check student reports
    const reports = await prisma.studentReport.findMany({
      include: {
        tahunAjaran: true,
      },
    });
    console.log(`📋 Student Reports: ${reports.length}`);
    reports.forEach((report) => {
      console.log(
        `   - Report ID: ${report.id}, Date: ${
          report.tanggal.toISOString().split("T")[0]
        }, Academic Year: ${report.tahunAjaran?.tahunAjaran || "None"}`
      );
    });

    // Check other related data
    const students = await prisma.student.count();
    const violations = await prisma.violation.count();
    const achievements = await prisma.achievement.count();

    console.log(`\n📊 Summary:`);
    console.log(`   Students: ${students}`);
    console.log(`   Violations: ${violations}`);
    console.log(`   Achievements: ${achievements}`);
    console.log(`   Academic Years: ${academicYears.length}`);
    console.log(`   Student Reports: ${reports.length}`);
  } catch (error) {
    console.error("❌ Error checking data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
