const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function createActiveYearReports() {
  try {
    console.log("🌱 Creating reports for active academic year...");

    // Get active academic year
    const activeAcademicYear = await prisma.tahunAjaran.findFirst({
      where: { isActive: true },
    });

    if (!activeAcademicYear) {
      console.log(
        "❌ No active academic year found. Please set an academic year as active first."
      );
      return;
    }

    console.log(
      `📅 Active academic year: ${activeAcademicYear.tahunAjaran} (ID: ${activeAcademicYear.id})`
    );

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

    // Create some violations and achievements if they don't exist
    if (violations.length === 0) {
      console.log("🔧 Creating sample violations...");
      const sampleViolations = [
        {
          nama: "Terlambat masuk kelas",
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
          nama: "Tidak memakai seragam lengkap",
          kategori: "ringan",
          jenis: "kedisiplinan",
          point: 8,
        },
        {
          nama: "Bolos tanpa keterangan",
          kategori: "sedang",
          jenis: "kedisiplinan",
          point: 15,
        },
        {
          nama: "Tidur di kelas",
          kategori: "sedang",
          jenis: "akademik",
          point: 12,
        },
        {
          nama: "Berbicara kasar kepada guru",
          kategori: "berat",
          jenis: "kedisiplinan",
          point: 25,
        },
        {
          nama: "Berkelahi dengan siswa lain",
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

      // Refresh violations list
      const newViolations = await prisma.violation.findMany({
        where: { isActive: true },
      });
      violations.push(...newViolations);
    }

    if (achievements.length === 0) {
      console.log("🔧 Creating sample achievements...");
      const sampleAchievements = [
        {
          nama: "Juara 1 Olimpiade Matematika Tingkat Kota",
          kategori: "akademik",
          point: 100,
        },
        {
          nama: "Juara 2 Lomba Karya Tulis Ilmiah",
          kategori: "akademik",
          point: 75,
        },
        { nama: "Juara 3 Olimpiade Fisika", kategori: "akademik", point: 60 },
        {
          nama: "Juara 1 Sepak Bola Antar Sekolah",
          kategori: "olahraga",
          point: 80,
        },
        { nama: "Juara 2 Bulu Tangkis", kategori: "olahraga", point: 70 },
        {
          nama: "Peserta Festival Seni Daerah",
          kategori: "kesenian",
          point: 50,
        },
        { nama: "Juara 1 Lomba Vocal", kategori: "kesenian", point: 85 },
        { nama: "Siswa Teladan Bulanan", kategori: "non_akademik", point: 120 },
        {
          nama: "Aktif dalam Organisasi OSIS",
          kategori: "non_akademik",
          point: 40,
        },
      ];

      for (const achievement of sampleAchievements) {
        await prisma.achievement.upsert({
          where: { nama: achievement.nama },
          update: {},
          create: achievement,
        });
      }

      // Refresh achievements list
      const newAchievements = await prisma.achievement.findMany({
        where: { isActive: true },
      });
      achievements.push(...newAchievements);
    }

    console.log(
      `Found ${students.length} students, ${violations.length} violations, ${achievements.length} achievements, ${reporters.length} reporters`
    );

    // Generate reports for active academic year
    const reportCount = Math.floor(Math.random() * 30) + 15; // 15-45 reports
    const reports = [];

    console.log(
      `📊 Creating ${reportCount} reports for active academic year...`
    );

    for (let i = 0; i < reportCount; i++) {
      const isViolation = Math.random() > 0.35; // 65% violations, 35% achievements
      const student = students[Math.floor(Math.random() * students.length)];
      const reporter = reporters[Math.floor(Math.random() * reporters.length)];

      // Generate random date within active academic year (last 3 months for more recent data)
      const now = new Date();
      const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const startDate = new Date(
        Math.max(
          activeAcademicYear.tanggalMulai.getTime(),
          threeMonthsAgo.getTime()
        )
      );
      const endDate = new Date(
        Math.min(activeAcademicYear.tanggalSelesai.getTime(), now.getTime())
      );

      const randomTime =
        startDate.getTime() +
        Math.random() * (endDate.getTime() - startDate.getTime());
      const randomDate = new Date(randomTime);

      let reportData = {
        studentId: student.id,
        reporterId: reporter.id,
        tipe: isViolation ? "violation" : "achievement",
        tahunAjaranId: activeAcademicYear.id,
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
        reportData.deskripsi = `${violation.nama} - Dilaporkan oleh ${reporter.role}`;
      } else if (!isViolation && achievements.length > 0) {
        const achievement =
          achievements[Math.floor(Math.random() * achievements.length)];
        reportData.achievementId = achievement.id;
        reportData.pointSaat = achievement.point;
        reportData.deskripsi = `${achievement.nama} - Pencapaian luar biasa!`;
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
      `✅ Created ${reports.length} reports for active academic year`
    );

    // Summary
    const totalActiveReports = await prisma.studentReport.count({
      where: { tahunAjaranId: activeAcademicYear.id },
    });

    const violationCount = await prisma.studentReport.count({
      where: {
        tahunAjaranId: activeAcademicYear.id,
        tipe: "violation",
      },
    });

    const achievementCount = await prisma.studentReport.count({
      where: {
        tahunAjaranId: activeAcademicYear.id,
        tipe: "achievement",
      },
    });

    // Update student total scores based on reports
    console.log("📊 Updating student total scores...");

    for (const student of students) {
      const studentReports = await prisma.studentReport.findMany({
        where: {
          studentId: student.id,
          tahunAjaranId: activeAcademicYear.id,
        },
        include: {
          violation: true,
          achievement: true,
        },
      });

      let totalScore = 0;
      studentReports.forEach((report) => {
        if (report.tipe === "violation") {
          totalScore += report.violation?.point || 0;
        } else if (report.tipe === "achievement") {
          totalScore += report.achievement?.point || 0;
        }
      });

      await prisma.student.update({
        where: { id: student.id },
        data: { totalScore },
      });
    }

    console.log("\n📊 Summary for Active Academic Year:");
    console.log(`- Academic Year: ${activeAcademicYear.tahunAjaran}`);
    console.log(`- Total reports: ${totalActiveReports}`);
    console.log(`- Violations: ${violationCount}`);
    console.log(`- Achievements: ${achievementCount}`);
    console.log(`- Students involved: ${students.length}`);

    console.log(
      "\n✅ Active academic year reports seed completed successfully!"
    );
  } catch (error) {
    console.error("❌ Error creating active year reports:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
createActiveYearReports();
