const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testRelation() {
  try {
    console.log("🧪 Testing TahunAjaran - StudentReport relation...");

    // Get active academic year
    const activeYear = await prisma.tahunAjaran.findFirst({
      where: { isActive: true },
    });

    if (!activeYear) {
      console.log("❌ No active academic year found");
      return;
    }

    console.log(`📅 Using academic year: ${activeYear.tahunAjaran}`);

    // Get a student to create report for
    const student = await prisma.student.findFirst();
    if (!student) {
      console.log("❌ No student found");
      return;
    }

    console.log(`👤 Using student ID: ${student.id}`);

    // Get a user for reporter
    const reporter = await prisma.user.findFirst({
      where: { role: "guru" },
    });

    if (!reporter) {
      console.log("❌ No guru found");
      return;
    }

    console.log(`👨‍🏫 Using reporter: ${reporter.name}`);

    // Create a test violation type
    let violation = await prisma.violation.findFirst();
    if (!violation) {
      violation = await prisma.violation.create({
        data: {
          nama: "Test Violation",
          point: 10,
          kategori: "ringan",
          jenis: "kedisiplinan",
        },
      });
      console.log(`⚠️ Created test violation: ${violation.nama}`);
    }

    // Create a sample StudentReport with TahunAjaran relation
    const report = await prisma.studentReport.create({
      data: {
        studentId: student.id,
        reporterId: reporter.id,
        tipe: "violation",
        violationId: violation.id,
        tahunAjaranId: activeYear.id, // ✅ This is the new relation!
        deskripsi: "Test violation report with academic year relation",
        pointSaat: 90 - violation.point,
        tanggal: new Date(),
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        reporter: true,
        violation: true,
        tahunAjaran: true, // ✅ Include the academic year
      },
    });

    console.log("✅ Test report created successfully!");
    console.log(`📋 Report Details:`);
    console.log(`   ID: ${report.id}`);
    console.log(`   Student: ${report.student.user.name}`);
    console.log(`   Reporter: ${report.reporter.name}`);
    console.log(`   Type: ${report.tipe}`);
    console.log(`   Violation: ${report.violation.nama}`);
    console.log(`   Academic Year: ${report.tahunAjaran.tahunAjaran}`); // ✅ The relation works!
    console.log(`   Date: ${report.tanggal.toISOString().split("T")[0]}`);
    console.log(`   Point: ${report.pointSaat}`);

    // Test querying reports by academic year
    console.log("\n🔍 Testing queries by academic year...");

    const reportsByYear = await prisma.studentReport.findMany({
      where: {
        tahunAjaranId: activeYear.id,
      },
      include: {
        student: {
          include: { user: true },
        },
        tahunAjaran: true,
        violation: true,
      },
    });

    console.log(
      `📊 Found ${reportsByYear.length} reports for academic year ${activeYear.tahunAjaran}`
    );

    // Test academic year with reports count
    const yearWithStats = await prisma.tahunAjaran.findUnique({
      where: { id: activeYear.id },
      include: {
        _count: {
          select: { reports: true },
        },
        reports: {
          include: {
            student: {
              include: { user: true },
            },
          },
        },
      },
    });

    console.log(
      `📈 Academic year ${yearWithStats.tahunAjaran} has ${yearWithStats._count.reports} reports`
    );

    // Test deleting the test report
    await prisma.studentReport.delete({
      where: { id: report.id },
    });
    console.log("🗑️ Test report deleted successfully");

    console.log(
      "\n🎉 All tests passed! TahunAjaran - StudentReport relation is working correctly!"
    );
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testRelation();
