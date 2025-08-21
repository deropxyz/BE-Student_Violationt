const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function recalculateAllTotalScores() {
  try {
    console.log("🔄 Starting total score recalculation...");

    // Get all students
    const students = await prisma.student.findMany({
      select: {
        id: true,
        totalScore: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log(`📊 Found ${students.length} students to process`);

    let updatedCount = 0;
    const results = [];

    for (const student of students) {
      // Calculate actual total score from reports
      const violationReports = await prisma.studentReport.findMany({
        where: {
          studentId: student.id,
          tipe: "violation",
        },
        select: {
          pointSaat: true,
        },
      });

      const achievementReports = await prisma.studentReport.findMany({
        where: {
          studentId: student.id,
          tipe: "achievement",
        },
        select: {
          pointSaat: true,
        },
      });

      // Calculate correct total score
      const totalViolationPoints = violationReports.reduce(
        (sum, report) => sum + (report.pointSaat || 0),
        0
      );
      const totalAchievementPoints = achievementReports.reduce(
        (sum, report) => sum + (report.pointSaat || 0),
        0
      );

      // Violations should subtract from score, achievements should add
      const correctTotalScore = totalAchievementPoints - totalViolationPoints;
      const currentTotalScore = student.totalScore;

      if (correctTotalScore !== currentTotalScore) {
        console.log(
          `🔧 ${student.user.name}: ${currentTotalScore} → ${correctTotalScore} (Violations: ${totalViolationPoints}, Achievements: ${totalAchievementPoints})`
        );

        // Update student total score
        await prisma.student.update({
          where: { id: student.id },
          data: { totalScore: correctTotalScore },
        });

        // Create score history entry for this correction
        await prisma.scoreHistory.create({
          data: {
            studentId: student.id,
            pointLama: currentTotalScore,
            pointBaru: correctTotalScore,
            alasan: "System recalculation - correcting total score",
            tanggal: new Date(),
          },
        });

        updatedCount++;
        results.push({
          studentId: student.id,
          studentName: student.user.name,
          oldScore: currentTotalScore,
          newScore: correctTotalScore,
          difference: correctTotalScore - currentTotalScore,
          violationPoints: totalViolationPoints,
          achievementPoints: totalAchievementPoints,
        });
      } else {
        console.log(
          `✅ ${student.user.name}: Score already correct (${currentTotalScore})`
        );
      }
    }

    console.log("\n📈 RECALCULATION SUMMARY:");
    console.log(`Total students processed: ${students.length}`);
    console.log(`Students updated: ${updatedCount}`);
    console.log(`Students already correct: ${students.length - updatedCount}`);

    if (results.length > 0) {
      console.log("\n🔄 UPDATED STUDENTS:");
      results.forEach((result) => {
        console.log(
          `• ${result.studentName}: ${result.oldScore} → ${result.newScore} (${
            result.difference >= 0 ? "+" : ""
          }${result.difference})`
        );
      });
    }

    console.log("✅ Recalculation completed successfully!");
  } catch (error) {
    console.error("❌ Error during recalculation:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the recalculation
recalculateAllTotalScores();
