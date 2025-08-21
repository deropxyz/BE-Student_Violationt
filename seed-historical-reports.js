const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function createHistoricalReports() {
  try {
    console.log("🌱 Creating historical reports seed data...");

    // Get academic years
    const academicYears = await prisma.tahunAjaran.findMany({
      orderBy: { tanggalMulai: "asc" },
    });

    if (academicYears.length === 0) {
      console.log(
        "❌ No academic years found. Please run academic year seed first."
      );
      return;
    }

    // Get students
    const students = await prisma.student.findMany({
      include: {
        user: true,
        classroom: true,
      },
    });

    if (students.length === 0) {
      console.log("❌ No students found. Please run student seed first.");
      return;
    }

    // Get violations and achievements
    const violations = await prisma.violation.findMany({
      where: { isActive: true },
    });

    const achievements = await prisma.achievement.findMany({
      where: { isActive: true },
    });

    // Get reporters (teachers, BK, superadmin)
    const reporters = await prisma.user.findMany({
      where: {
        role: {
          in: ["guru", "bk", "superadmin"],
        },
      },
    });

    if (reporters.length === 0) {
      console.log(
        "❌ No reporters found. Please ensure teachers/BK users exist."
      );
      return;
    }

    console.log(
      `Found ${academicYears.length} academic years, ${students.length} students, ${violations.length} violations, ${achievements.length} achievements`
    );

    // Create historical reports for each inactive academic year
    for (const academicYear of academicYears) {
      if (academicYear.isActive) {
        console.log(
          `⏭️  Skipping active academic year: ${academicYear.tahunAjaran}`
        );
        continue;
      }

      console.log(`📊 Creating reports for ${academicYear.tahunAjaran}...`);

      const reportCount = Math.floor(Math.random() * 50) + 20; // 20-70 reports per year
      const reports = [];

      for (let i = 0; i < reportCount; i++) {
        const isViolation = Math.random() > 0.3; // 70% violations, 30% achievements
        const student = students[Math.floor(Math.random() * students.length)];
        const reporter =
          reporters[Math.floor(Math.random() * reporters.length)];

        // Generate random date within academic year
        const startDate = new Date(academicYear.tanggalMulai);
        const endDate = new Date(academicYear.tanggalSelesai);
        const randomTime =
          startDate.getTime() +
          Math.random() * (endDate.getTime() - startDate.getTime());
        const randomDate = new Date(randomTime);

        let reportData = {
          studentId: student.id,
          reporterId: reporter.id,
          tipe: isViolation ? "violation" : "achievement",
          tahunAjaranId: academicYear.id,
          tanggal: randomDate,
          pointSaat: Math.floor(Math.random() * 50) + 10, // 10-60 points
          deskripsi: null,
          bukti: null,
          createdAt: randomDate,
        };

        if (isViolation && violations.length > 0) {
          const violation =
            violations[Math.floor(Math.random() * violations.length)];
          reportData.violationId = violation.id;
          reportData.pointSaat = violation.point;
          reportData.deskripsi = `Pelanggaran ${violation.nama} - ${academicYear.tahunAjaran}`;
        } else if (!isViolation && achievements.length > 0) {
          const achievement =
            achievements[Math.floor(Math.random() * achievements.length)];
          reportData.achievementId = achievement.id;
          reportData.pointSaat = achievement.point;
          reportData.deskripsi = `Prestasi ${achievement.nama} - ${academicYear.tahunAjaran}`;
        }

        reports.push(reportData);
      }

      // Insert reports in batches
      const batchSize = 10;
      for (let i = 0; i < reports.length; i += batchSize) {
        const batch = reports.slice(i, i + batchSize);
        await prisma.studentReport.createMany({
          data: batch,
          skipDuplicates: true,
        });
      }

      console.log(
        `✅ Created ${reports.length} reports for ${academicYear.tahunAjaran}`
      );
    }

    // Create some sample violations and achievements if they don't exist
    if (violations.length === 0) {
      console.log("🔧 Creating sample violations...");
      const sampleViolations = [
        {
          nama: "Terlambat",
          kategori: "ringan",
          jenis: "kedisiplinan",
          point: 5,
        },
        {
          nama: "Tidak mengerjakan tugas",
          kategori: "ringan",
          jenis: "akademik",
          point: 10,
        },
        {
          nama: "Bolos tanpa keterangan",
          kategori: "sedang",
          jenis: "kedisiplinan",
          point: 15,
        },
        {
          nama: "Berkelahi",
          kategori: "berat",
          jenis: "kedisiplinan",
          point: 50,
        },
        {
          nama: "Menyontek saat ujian",
          kategori: "berat",
          jenis: "akademik",
          point: 40,
        },
      ];

      for (const violation of sampleViolations) {
        await prisma.violation.upsert({
          where: { nama: violation.nama },
          update: {},
          create: violation,
        });
      }
    }

    if (achievements.length === 0) {
      console.log("🔧 Creating sample achievements...");
      const sampleAchievements = [
        {
          nama: "Juara 1 Olimpiade Matematika",
          kategori: "akademik",
          point: 100,
        },
        { nama: "Juara 2 Lomba Karya Tulis", kategori: "akademik", point: 75 },
        { nama: "Juara 1 Sepak Bola", kategori: "olahraga", point: 80 },
        { nama: "Peserta Festival Seni", kategori: "kesenian", point: 50 },
        { nama: "Siswa Teladan", kategori: "non_akademik", point: 120 },
      ];

      for (const achievement of sampleAchievements) {
        await prisma.achievement.upsert({
          where: { nama: achievement.nama },
          update: {},
          create: achievement,
        });
      }
    }

    // Summary
    const totalReports = await prisma.studentReport.count();

    console.log("\n📊 Summary:");
    console.log(`Total reports created: ${totalReports}`);

    for (const academicYear of academicYears) {
      const yearReports = await prisma.studentReport.count({
        where: { tahunAjaranId: academicYear.id },
      });
      const violationCount = await prisma.studentReport.count({
        where: {
          tahunAjaranId: academicYear.id,
          tipe: "violation",
        },
      });
      const achievementCount = await prisma.studentReport.count({
        where: {
          tahunAjaranId: academicYear.id,
          tipe: "achievement",
        },
      });

      console.log(
        `- ${academicYear.tahunAjaran}: ${yearReports} reports (${violationCount} violations, ${achievementCount} achievements)`
      );
    }

    console.log("\n✅ Historical reports seed completed successfully!");
  } catch (error) {
    console.error("❌ Error creating historical reports:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
createHistoricalReports();
