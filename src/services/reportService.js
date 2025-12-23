const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Common database operations untuk Report
 */
class ReportService {
  /**
   * Create new student report with score update
   */
  async createReport({
    studentId,
    reporterId,
    itemId,
    tahunAjaranId,
    classAtTime,
    deskripsi,
    waktu,
    bukti,
  }) {
    return await prisma.$transaction(async (tx) => {
      // Get item details
      const item = await tx.reportItem.findUnique({
        where: { id: itemId },
      });

      if (!item) {
        throw new Error("Item tidak ditemukan");
      }

      // Get current student score
      const student = await tx.student.findUnique({
        where: { id: studentId },
      });

      const newScore = student.totalScore + item.point;

      // Create report
      const report = await tx.studentReport.create({
        data: {
          studentId,
          reporterId,
          itemId,
          tahunAjaranId,
          classAtTime,
          deskripsi,
          waktu,
          bukti,
          pointSaat: item.point,
        },
      });

      // Update student score
      await tx.student.update({
        where: { id: studentId },
        data: { totalScore: newScore },
      });

      // Create score history
      await tx.scoreHistory.create({
        data: {
          studentId,
          pointLama: student.totalScore,
          pointBaru: newScore,
          alasan: `Laporan ${item.tipe}: ${item.nama}`,
        },
      });

      return report;
    });
  }

  /**
   * Get reports with pagination and filters
   */
  async findManyWithPagination({
    skip,
    take,
    where = {},
    include = {},
    orderBy = { createdAt: "desc" },
  }) {
    const [reports, total] = await prisma.$transaction([
      prisma.studentReport.findMany({
        skip,
        take,
        where,
        include,
        orderBy,
      }),
      prisma.studentReport.count({ where }),
    ]);

    return { reports, total };
  }

  /**
   * Recalculate student score based on all reports
   */
  async recalculateStudentScore(studentId) {
    return await prisma.$transaction(async (tx) => {
      const reports = await tx.studentReport.findMany({
        where: { studentId },
        include: { item: true },
      });

      const totalScore = reports.reduce(
        (sum, report) => sum + report.item.point,
        0
      );

      const student = await tx.student.findUnique({
        where: { id: studentId },
      });

      if (student.totalScore !== totalScore) {
        await tx.student.update({
          where: { id: studentId },
          data: { totalScore },
        });

        await tx.scoreHistory.create({
          data: {
            studentId,
            pointLama: student.totalScore,
            pointBaru: totalScore,
            alasan: "Recalculation",
          },
        });

        return {
          updated: true,
          oldScore: student.totalScore,
          newScore: totalScore,
        };
      }

      return { updated: false, score: totalScore };
    });
  }
}

module.exports = new ReportService();
