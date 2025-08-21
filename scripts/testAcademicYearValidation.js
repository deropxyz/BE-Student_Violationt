const { PrismaClient } = require("@prisma/client");
const {
  validateActiveAcademicYear,
  getFallbackAcademicYear,
  getTargetAcademicYear,
  canCreateReports,
  transitionAcademicYear,
} = require("../src/utils/academicYearUtils");

const prisma = new PrismaClient();

async function testAcademicYearValidation() {
  try {
    console.log("🧪 Testing Academic Year Validation & Edge Cases...\n");

    // Test 1: Current state
    console.log("1️⃣ Testing current state:");
    try {
      const activeYear = await validateActiveAcademicYear();
      console.log(`✅ Active year found: ${activeYear.tahunAjaran}`);
      console.log(`   Can create reports: ${canCreateReports(activeYear)}`);
    } catch (error) {
      console.log(`❌ ${error.message} (Code: ${error.code})`);
    }

    // Test 2: Fallback behavior
    console.log("\n2️⃣ Testing fallback behavior:");
    const fallbackYear = await getFallbackAcademicYear();
    if (fallbackYear) {
      console.log(
        `✅ Fallback year: ${fallbackYear.tahunAjaran} (Active: ${fallbackYear.isActive})`
      );
    } else {
      console.log("❌ No fallback year available");
    }

    // Test 3: Get specific year
    console.log("\n3️⃣ Testing specific year retrieval:");
    try {
      const specificYear = await getTargetAcademicYear(1);
      console.log(`✅ Specific year (ID 1): ${specificYear.tahunAjaran}`);
    } catch (error) {
      console.log(`❌ ${error.message} (Code: ${error.code})`);
    }

    // Test 4: Simulate no active year scenario
    console.log("\n4️⃣ Testing no active year scenario:");

    // Temporarily deactivate all years
    await prisma.tahunAjaran.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    console.log("   Deactivated all academic years");

    try {
      await validateActiveAcademicYear();
      console.log("❌ Should have failed but didn't");
    } catch (error) {
      console.log(
        `✅ Correctly failed: ${error.message} (Code: ${error.code})`
      );
    }

    // Test fallback when no active year
    const fallbackWhenInactive = await getFallbackAcademicYear();
    if (fallbackWhenInactive) {
      console.log(
        `✅ Fallback when no active year: ${fallbackWhenInactive.tahunAjaran}`
      );
      console.log(
        `   Can create reports: ${canCreateReports(fallbackWhenInactive)}`
      );
    } else {
      console.log("❌ No fallback year when no active year");
    }

    // Test 5: Academic year transition
    console.log("\n5️⃣ Testing academic year transition:");

    // Find a year to activate
    const yearToActivate = await prisma.tahunAjaran.findFirst({
      orderBy: { tahunSelesai: "desc" },
    });

    if (yearToActivate) {
      const transitionedYear = await transitionAcademicYear(yearToActivate.id);
      console.log(`✅ Transitioned to: ${transitionedYear.tahunAjaran}`);

      // Verify only one year is active
      const activeYears = await prisma.tahunAjaran.findMany({
        where: { isActive: true },
      });
      console.log(`   Active years count: ${activeYears.length} (should be 1)`);
    }

    // Test 6: Try creating a report with validation
    console.log("\n6️⃣ Testing report creation validation:");
    try {
      const activeYear = await validateActiveAcademicYear();
      console.log(
        `✅ Can create reports with active year: ${activeYear.tahunAjaran}`
      );

      // Simulate report creation (without actually creating)
      console.log(
        `   Report would be created with tahunAjaranId: ${activeYear.id}`
      );
    } catch (error) {
      console.log(`❌ Cannot create reports: ${error.message}`);
    }

    console.log("\n🎉 All validation tests completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
testAcademicYearValidation();
