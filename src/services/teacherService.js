const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Common database operations untuk Teacher
 */
class TeacherService {
  /**
   * Find teacher by user ID
   */
  async findByUserId(userId) {
    return await prisma.teacher.findUnique({
      where: { userId },
      include: {
        user: true,
        jurusan: true,
        classrooms: {
          include: {
            jurusan: true,
            students: true,
          },
        },
      },
    });
  }

  /**
   * Find teacher by ID
   */
  async findById(id) {
    return await prisma.teacher.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: true,
        jurusan: true,
        classrooms: {
          include: {
            jurusan: true,
          },
        },
      },
    });
  }

  /**
   * Get teachers with pagination and filters
   */
  async findManyWithPagination({
    skip,
    take,
    where = {},
    include = {},
    orderBy = {},
  }) {
    const [teachers, total] = await prisma.$transaction([
      prisma.teacher.findMany({
        skip,
        take,
        where,
        include,
        orderBy,
      }),
      prisma.teacher.count({ where }),
    ]);

    return { teachers, total };
  }

  /**
   * Check if teacher is Wali Kelas
   */
  async isWaliKelas(teacherId) {
    const classroom = await prisma.classroom.findFirst({
      where: { waliKelasId: teacherId },
    });
    return !!classroom;
  }
}

module.exports = new TeacherService();
