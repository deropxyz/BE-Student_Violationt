const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Common database operations untuk Student
 */
class StudentService {
  /**
   * Find student by user ID
   */
  async findByUserId(userId) {
    return await prisma.student.findUnique({
      where: { userId },
      include: {
        user: true,
        classroom: {
          include: {
            jurusan: true,
            waliKelas: {
              include: {
                user: true,
              },
            },
          },
        },
        angkatan: true,
      },
    });
  }

  /**
   * Find student by ID
   */
  async findById(id) {
    return await prisma.student.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: true,
        classroom: {
          include: {
            jurusan: true,
          },
        },
        angkatan: true,
      },
    });
  }

  /**
   * Update student score
   */
  async updateScore(studentId, newScore, oldScore, reason) {
    return await prisma.$transaction(async (tx) => {
      // Update student score
      const updatedStudent = await tx.student.update({
        where: { id: studentId },
        data: { totalScore: newScore },
      });

      // Create score history
      await tx.scoreHistory.create({
        data: {
          studentId,
          pointLama: oldScore,
          pointBaru: newScore,
          alasan: reason,
        },
      });

      return updatedStudent;
    });
  }

  /**
   * Get students with pagination and filters
   */
  async findManyWithPagination({
    skip,
    take,
    where = {},
    include = {},
    orderBy = {},
  }) {
    const [students, total] = await prisma.$transaction([
      prisma.student.findMany({
        skip,
        take,
        where,
        include,
        orderBy,
      }),
      prisma.student.count({ where }),
    ]);

    return { students, total };
  }
}

module.exports = new StudentService();
